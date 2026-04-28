/**
 * stale-pinned-version
 *
 * Flags agents that pin a framework / runtime major version inside their
 * description or body that is more than ~2 majors behind the current
 * release. Agents written for "Angular 15+" or "Electron 27+" silently
 * lie to users running them in 2026: the body teaches outdated APIs,
 * while the orchestrator can't tell the prompt is stale.
 *
 * MAINTENANCE NOTE — `VERSION_KB` is curated by hand and MUST be reviewed
 * roughly every 6 months as ecosystems release new majors. Conservative
 * `flagBelow` values are chosen so we only flag versions clearly behind
 * the supported window (typically ~18-24mo old). Bump entries in this
 * file when a new major lands.
 *
 * Detection covers:
 *   1. Frontmatter `description` field.
 *   2. Body PROSE (text outside fenced code blocks). Code blocks may
 *      legitimately contain historical version examples (migration
 *      guides, CHANGELOG-style snippets).
 *
 * Mirrors the structure of `stale-model-versions` so the maintenance
 * cadence is consistent across "this thing is curated and ages out"
 * rules.
 *
 * Severity: `suggestion`. Stale pins are usually accidental and easy to
 * fix. They don't break anything immediately, but advice quality decays.
 */

import type { Rule, Issue, ParsedSubagent } from "../types.js";

interface VersionEntry {
  /** Latest known major version. Informational; used in the message. */
  latestMajor: number;
  /** Flag any pin strictly below this major. */
  flagBelow: number;
}

// Curated as of 2026-04. Update on the same cadence as stale-model-versions.
// Naming convention: lowercase keys, must match the regex group below.
const VERSION_KB: Record<string, VersionEntry> = {
  angular: { latestMajor: 19, flagBelow: 16 },
  react: { latestMajor: 19, flagBelow: 18 },
  next: { latestMajor: 15, flagBelow: 14 },
  nextjs: { latestMajor: 15, flagBelow: 14 },
  vue: { latestMajor: 3, flagBelow: 3 }, // Vue 2 EOL'd in 2023.
  nuxt: { latestMajor: 3, flagBelow: 3 },
  svelte: { latestMajor: 5, flagBelow: 4 },
  electron: { latestMajor: 33, flagBelow: 30 },
  node: { latestMajor: 22, flagBelow: 20 },
  nodejs: { latestMajor: 22, flagBelow: 20 },
  python: { latestMajor: 3, flagBelow: 3 }, // Python 2 EOL'd 2020.
  django: { latestMajor: 5, flagBelow: 4 },
  rails: { latestMajor: 8, flagBelow: 7 },
  laravel: { latestMajor: 11, flagBelow: 10 },
  spring: { latestMajor: 6, flagBelow: 5 },
  dotnet: { latestMajor: 9, flagBelow: 8 },
  java: { latestMajor: 24, flagBelow: 17 }, // 17 is the LTS floor most teams accept.
  go: { latestMajor: 1, flagBelow: 1 }, // Go uses 1.x; we don't flag minors.
};

// Match `<framework> <version>` with optional dot and optional `+` suffix.
// Captures: 1=framework, 2=major, 3=optional `+`/minor.
// Word boundary on both sides keeps us from matching "reactive-3" etc.
const VERSION_RE =
  /\b(angular|react|next(?:js|\.js)?|vue|nuxt|svelte|electron|node(?:js|\.js)?|python|django|rails|laravel|spring|dotnet|java|go)\s*(\d+)(\+|\.\d+)?\b/gi;

function stripCodeBlocks(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");
}

function normalizeKey(framework: string): string {
  // Collapse "next.js" / "nextjs" / "node.js" / "nodejs" to canonical form.
  const lower = framework.toLowerCase().replace(/\./g, "");
  return lower;
}

function buildIssue(
  framework: string,
  pinnedMajor: number,
  entry: VersionEntry,
): Issue {
  return {
    ruleId: rule.id,
    severity: rule.defaultSeverity,
    message: `pins ${framework} ${pinnedMajor}+ but the current major is ${entry.latestMajor}. Advice based on this version is likely stale.`,
    fix: `Update the version reference to a current major (${framework} ${entry.latestMajor}) or remove the explicit pin if the agent is version-agnostic.`,
  };
}

const rule: Rule = {
  id: "stale-pinned-version",
  defaultSeverity: "suggestion",
  description:
    "Description or body pins a framework/runtime major (e.g. 'Angular 15+', 'Electron 27+') that is two or more majors behind current. Advice ages out.",
  check(subagent: ParsedSubagent): Issue[] {
    const issues: Issue[] = [];
    const seen = new Set<string>();

    function scan(text: string): void {
      if (!text) return;
      VERSION_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = VERSION_RE.exec(text)) !== null) {
        const framework = m[1] ?? "";
        const majorStr = m[2] ?? "";
        if (!framework || !majorStr) continue;
        const key = normalizeKey(framework);
        const entry = VERSION_KB[key];
        if (!entry) continue;
        const pinnedMajor = Number.parseInt(majorStr, 10);
        if (!Number.isFinite(pinnedMajor)) continue;
        if (pinnedMajor >= entry.flagBelow) continue;
        const dedupKey = `${key}:${pinnedMajor}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        issues.push(buildIssue(framework, pinnedMajor, entry));
      }
    }

    scan(subagent.frontmatter?.description ?? "");
    if (subagent.body) scan(stripCodeBlocks(subagent.body));

    return issues;
  },
};

export default rule;
