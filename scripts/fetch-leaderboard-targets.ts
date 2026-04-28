/**
 * Leaderboard target scraper.
 *
 * Fetches public Claude Code subagent files from a curated list of GitHub
 * repositories so we can run the static + benchmark suite against them.
 *
 * Sources (each entry below):
 *   - wshobson/agents @ root
 *   - VoltAgent/awesome-claude-code-subagents @ categories/
 *   - 0xfurai/claude-code-subagents @ agents/
 *   - iannuttall/claude-agents @ root
 *   - lst97/claude-code-sub-agents @ agents/
 *
 * Strategy (in order of preference):
 *   1. `gh api` if the GitHub CLI is on PATH (auth + smart rate-limit handling).
 *   2. Direct GitHub REST: `git/trees/<branch>?recursive=1` (one call per repo)
 *      and raw.githubusercontent.com for downloads (which has no API quota).
 *   3. Fallback: `git clone --depth=1 --filter=blob:none` into a tmp dir and
 *      read the tree from disk. Bypasses the API entirely. Used automatically
 *      when (1) and (2) fail with 403 / rate-limit errors.
 *
 *   For each candidate file we then check that it has YAML frontmatter with a
 *   non-empty `name`. Files that fail this filter aren't real subagents and
 *   are skipped. Stops at MAX_TOTAL valid agents.
 *
 * Output:
 *   targets/<owner>__<repo>/<filename>.md   — raw subagent markdown
 *   targets/manifest.json                   — metadata for every saved file
 *
 * Run with:  bun run fetch-targets
 *            (also works under node 23+ via experimental type stripping)
 *
 * Auth:      set GITHUB_TOKEN to lift the 60 req/hr unauthenticated limit.
 */

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";
import { tmpdir } from "node:os";

// ----------------------------------------------------------------------------
// Sources
// ----------------------------------------------------------------------------

interface Source {
  owner: string;
  repo: string;
  /**
   * Path prefix inside the repo. Only files whose path starts with this
   * prefix are considered. Empty string = repo root.
   */
  dir: string;
  /**
   * If true, only files directly in `dir` (depth = 1) are eligible. Used for
   * repos like wshobson/agents that have a flat root layout but a separate
   * `plugins/` tree we must not crawl into.
   */
  flatOnly?: boolean;
}

const SOURCES: Source[] = [
  { owner: "wshobson", repo: "agents", dir: "", flatOnly: true },
  {
    owner: "VoltAgent",
    repo: "awesome-claude-code-subagents",
    dir: "categories",
  },
  { owner: "0xfurai", repo: "claude-code-subagents", dir: "agents" },
  { owner: "iannuttall", repo: "claude-agents", dir: "agents", flatOnly: true },
  { owner: "lst97", repo: "claude-code-sub-agents", dir: "agents" },
];

const MAX_TOTAL = 100;
/**
 * Per-source cap so a single mega-repo doesn't fill the whole budget.
 * Tune up later if we add more sources.
 */
const PER_SOURCE_CAP = 30;
const OUT_ROOT = resolve(process.cwd(), "targets");

const SKIP_BASENAMES = new Set([
  "readme.md",
  "license.md",
  "contributing.md",
  "changelog.md",
  "code_of_conduct.md",
  "security.md",
]);

// ----------------------------------------------------------------------------
// HTTP layer — gh CLI when present, else direct fetch
// ----------------------------------------------------------------------------

let GH_AVAILABLE: boolean | null = null;

function ghAvailable(): boolean {
  if (GH_AVAILABLE !== null) return GH_AVAILABLE;
  try {
    execFileSync("gh", ["--version"], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    GH_AVAILABLE = true;
  } catch {
    GH_AVAILABLE = false;
  }
  return GH_AVAILABLE;
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

async function ghApiJson<T>(path: string): Promise<T> {
  if (ghAvailable()) {
    try {
      const out = execFileSync("gh", ["api", path], {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      return JSON.parse(out) as T;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/rate.?limit|403/i.test(msg)) throw new RateLimitError(msg);
      throw err;
    }
  }
  const url = `https://api.github.com/${path.replace(/^\/+/, "")}`;
  const headers: Record<string, string> = {
    "User-Agent": "agelin/0.0.1",
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, { headers });
  if (resp.status === 403 || resp.status === 429) {
    const remaining = resp.headers.get("x-ratelimit-remaining");
    throw new RateLimitError(
      `GitHub API ${resp.status} for ${path} (remaining=${remaining ?? "?"})`,
    );
  }
  if (!resp.ok) {
    throw new Error(`GitHub API ${resp.status} ${resp.statusText} for ${path}`);
  }
  return (await resp.json()) as T;
}

async function fetchRaw(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "agelin/0.0.1" },
  });
  if (!resp.ok) {
    throw new Error(`raw fetch ${resp.status} ${resp.statusText} for ${url}`);
  }
  return await resp.text();
}

// ----------------------------------------------------------------------------
// Frontmatter sniffing
// ----------------------------------------------------------------------------

interface FrontmatterPeek {
  hasFrontmatter: boolean;
  name?: string;
}

function peekFrontmatter(md: string): FrontmatterPeek {
  const stripped = md.replace(/^\uFEFF/, "");
  if (!stripped.startsWith("---")) return { hasFrontmatter: false };

  const rest = stripped.slice(3);
  const closeIdx = rest.search(/\r?\n---\s*(\r?\n|$)/);
  if (closeIdx === -1) return { hasFrontmatter: false };

  const yamlBlock = rest.slice(0, closeIdx);
  for (const line of yamlBlock.split(/\r?\n/)) {
    const m = /^name\s*:\s*(.+?)\s*$/.exec(line);
    if (m) {
      const value = m[1].replace(/^["']|["']$/g, "").trim();
      if (value) return { hasFrontmatter: true, name: value };
    }
  }
  return { hasFrontmatter: true };
}

// ----------------------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------------------

function isCandidate(path: string, source: Source): boolean {
  if (!path.toLowerCase().endsWith(".md")) return false;

  const base = path.split("/").pop() ?? path;
  if (SKIP_BASENAMES.has(base.toLowerCase())) return false;
  if (base.startsWith(".")) return false;

  const prefix = source.dir;
  if (prefix === "") {
    if (source.flatOnly && path.includes("/")) return false;
    return true;
  }
  const normalized = prefix.endsWith("/") ? prefix : prefix + "/";
  if (!path.startsWith(normalized)) return false;
  if (source.flatOnly) {
    const remainder = path.slice(normalized.length);
    if (remainder.includes("/")) return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// Source listing strategies
// ----------------------------------------------------------------------------

interface RepoMeta {
  default_branch: string;
  license?: { spdx_id?: string | null; name?: string | null } | null;
}

interface TreeNode {
  path: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

interface TreeResp {
  tree: TreeNode[];
  truncated: boolean;
}

interface ListedFile {
  /** path relative to repo root */
  path: string;
  /** raw markdown contents */
  content: string;
}

interface RepoListing {
  branch: string;
  license: string;
  files: ListedFile[];
}

/**
 * Strategy A/B: GitHub REST API. Single tree call + raw downloads.
 */
async function listViaApi(source: Source): Promise<RepoListing> {
  const meta = await ghApiJson<RepoMeta>(
    `repos/${source.owner}/${source.repo}`,
  );
  const branch = meta.default_branch || "main";
  const license = meta.license?.spdx_id ?? meta.license?.name ?? "unknown";

  const tree = await ghApiJson<TreeResp>(
    `repos/${source.owner}/${source.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  if (tree.truncated) {
    console.warn(
      `  (warning: ${source.owner}/${source.repo} tree truncated by GitHub — some files may be missed)`,
    );
  }

  const candidates = tree.tree
    .filter((n) => n.type === "blob" && isCandidate(n.path, source))
    .map((n) => n.path)
    .sort();

  const files: ListedFile[] = [];
  for (const path of candidates) {
    const url = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${branch}/${path}`;
    try {
      files.push({ path, content: await fetchRaw(url) });
    } catch (err) {
      console.error(
        `  ! download ${path} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return { branch, license, files };
}

/**
 * Strategy C: shallow git clone. No GitHub API usage. License read from a
 * LICENSE file if present (best effort).
 */
function listViaClone(source: Source): RepoListing {
  const tmpRoot = join(
    tmpdir(),
    `agelin-${source.owner}-${source.repo}-${Date.now()}`,
  );
  mkdirSync(tmpRoot, { recursive: true });

  const repoUrl = `https://github.com/${source.owner}/${source.repo}.git`;
  console.log(`  cloning ${repoUrl} (shallow)`);

  try {
    execFileSync(
      "git",
      [
        "clone",
        "--depth=1",
        "--filter=blob:none",
        "--no-tags",
        "--single-branch",
        repoUrl,
        tmpRoot,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    // Determine branch from HEAD.
    let branch = "main";
    try {
      branch = execFileSync(
        "git",
        ["-C", tmpRoot, "rev-parse", "--abbrev-ref", "HEAD"],
        { encoding: "utf8" },
      ).trim();
    } catch {
      // ignore
    }

    // Best-effort license detection: presence of LICENSE / LICENSE.md.
    let license = "unknown";
    for (const candidate of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
      try {
        const content = readFileSync(join(tmpRoot, candidate), "utf8");
        const firstLine = content.split(/\r?\n/, 1)[0].trim();
        if (firstLine) license = firstLine.slice(0, 80);
        break;
      } catch {
        // not present
      }
    }

    // Walk the tree on disk.
    const allPaths: string[] = [];
    walkLocal(tmpRoot, tmpRoot, allPaths);
    const candidates = allPaths
      .filter((p) => isCandidate(p, source))
      .sort();

    const files: ListedFile[] = candidates.map((rel) => ({
      path: rel,
      content: readFileSync(join(tmpRoot, rel), "utf8"),
    }));
    return { branch, license, files };
  } finally {
    try {
      rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      // best effort
    }
  }
}

function walkLocal(root: string, dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === ".git") continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkLocal(root, full, out);
    } else if (st.isFile()) {
      out.push(relative(root, full).replace(/\\/g, "/"));
    }
  }
}

// ----------------------------------------------------------------------------
// Per-source orchestration
// ----------------------------------------------------------------------------

interface ManifestEntry {
  source_repo: string;
  source_path: string;
  original_url: string;
  saved_as: string;
  license: string;
  last_modified: string | null;
  agent_name: string;
}

async function listSource(source: Source): Promise<RepoListing | null> {
  try {
    return await listViaApi(source);
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.warn(
        `  API rate-limited (${err.message}) — falling back to git clone`,
      );
      try {
        return listViaClone(source);
      } catch (cloneErr) {
        console.error(
          `  ! clone fallback failed:`,
          cloneErr instanceof Error ? cloneErr.message : cloneErr,
        );
        return null;
      }
    }
    console.error(
      `  ! API listing failed:`,
      err instanceof Error ? err.message : err,
    );
    // Try clone as a last resort even for non-rate-limit errors.
    try {
      return listViaClone(source);
    } catch (cloneErr) {
      console.error(
        `  ! clone fallback failed:`,
        cloneErr instanceof Error ? cloneErr.message : cloneErr,
      );
      return null;
    }
  }
}

async function processSource(
  source: Source,
  remaining: () => number,
  onAgent: (entry: ManifestEntry) => void,
): Promise<void> {
  const listing = await listSource(source);
  if (!listing) return;

  console.log(`  ${listing.files.length} candidate .md files`);

  let perSourceTaken = 0;
  for (const file of listing.files) {
    if (remaining() <= 0) break;
    if (perSourceTaken >= PER_SOURCE_CAP) {
      console.log(
        `  (per-source cap of ${PER_SOURCE_CAP} reached, moving to next repo)`,
      );
      break;
    }

    const peek = peekFrontmatter(file.content);
    if (!peek.hasFrontmatter || !peek.name) continue;

    const slug = `${source.owner}__${source.repo}`;
    const outDir = join(OUT_ROOT, slug);
    mkdirSync(outDir, { recursive: true });
    const baseName = file.path.split("/").pop()!;
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const savedAs = join(outDir, safeName);
    writeFileSync(savedAs, file.content, "utf8");

    const manifestEntry: ManifestEntry = {
      source_repo: `${source.owner}/${source.repo}`,
      source_path: file.path,
      original_url: `https://github.com/${source.owner}/${source.repo}/blob/${listing.branch}/${file.path}`,
      saved_as: savedAs.replace(OUT_ROOT, "targets").replace(/\\/g, "/"),
      license: listing.license,
      last_modified: null,
      agent_name: peek.name,
    };
    onAgent(manifestEntry);
    perSourceTaken++;
    console.log(`  + ${file.path} -> ${peek.name}`);
  }
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`agelin: fetching up to ${MAX_TOTAL} leaderboard targets`);
  console.log(`  using gh CLI: ${ghAvailable() ? "yes" : "no (direct fetch)"}`);
  if (!ghAvailable() && !process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    console.log(
      "  (no GITHUB_TOKEN — unauthenticated requests are limited to 60/hr;",
    );
    console.log("   the script falls back to `git clone` if the API runs out.)");
  }

  mkdirSync(OUT_ROOT, { recursive: true });
  const manifest: ManifestEntry[] = [];
  const remaining = (): number => MAX_TOTAL - manifest.length;

  for (const source of SOURCES) {
    if (remaining() <= 0) break;
    console.log(
      `\n[${source.owner}/${source.repo}] starting (${remaining()} slots left)`,
    );
    await processSource(source, remaining, (e) => manifest.push(e));
  }

  const manifestPath = join(OUT_ROOT, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: manifest.length,
        entries: manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\nDone. ${manifest.length} subagents saved to ${OUT_ROOT}`);
  console.log(`Manifest: ${manifestPath}`);

  if (manifest.length < 30) {
    console.warn(
      `\nWARNING: only ${manifest.length} agents fetched. Expected at least 30.`,
    );
    console.warn(
      "  Possible causes: rate limit (set GITHUB_TOKEN), repo layout drift, network, or git not on PATH.",
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(
    "Fatal:",
    err instanceof Error ? (err.stack ?? err.message) : err,
  );
  process.exit(1);
});
