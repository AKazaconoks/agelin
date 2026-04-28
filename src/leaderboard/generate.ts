/**
 * Leaderboard generation.
 *
 * Pure transformation: given AgentScores plus the targets manifest, produce
 * the canonical LeaderboardData artifact that downstream code (CLI baseline,
 * site builder, badge service) all consume.
 *
 * Contract:
 *   - Stable sort: score desc, ties broken by agentName asc.
 *   - Tags = top-3 most-frequent rule IDs across the agent's static issues
 *     plus the dominant task category derived from its bench results. Order
 *     within tags is rule-frequency desc, then category, capped at 4 entries
 *     so the table column stays readable.
 *   - Manifest enrichment is best-effort: if an agent isn't in the manifest
 *     we still emit it (with sourceRepo="unknown" / sourceUrl="" / license=null).
 */
import type { AgentScore, Issue, RunResult } from "../types.js";

export interface ManifestEntry {
  source_repo: string;
  source_path: string;
  original_url: string;
  saved_as: string;
  license: string | null;
  last_modified: string | null;
  agent_name: string;
}

export interface Manifest {
  generated_at: string;
  count: number;
  entries: ManifestEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  agentName: string;
  sourceRepo: string;
  sourceUrl: string;
  license: string | null;
  score: number;
  components: {
    staticHealth: number;
    successRate: number;
    costEfficiency: number;
    consistency: number;
  };
  tags: string[];
}

export interface LeaderboardData {
  generatedAt: string;
  toolVersion: string;
  modelUsed: string;
  totalAgents: number;
  totalTasks: number;
  meanScore: number;
  entries: LeaderboardEntry[];
}

export interface GenerateOpts {
  generatedAt: string;
  toolVersion: string;
  modelUsed: string;
  /** Total distinct golden tasks the matrix was built from. */
  totalTasks: number;
}

/**
 * Build the leaderboard data structure. Pure — no I/O.
 */
export function generateLeaderboard(
  scores: AgentScore[],
  manifest: Manifest,
  opts: GenerateOpts,
): LeaderboardData {
  const manifestByName = indexManifestByAgentName(manifest);
  const manifestByPath = indexManifestByPath(manifest);

  const sorted = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.agentName.localeCompare(b.agentName);
  });

  const entries: LeaderboardEntry[] = sorted.map((s, i) => {
    const meta =
      manifestByName.get(s.agentName) ?? findByPath(manifestByPath, s.agentPath);
    return {
      rank: i + 1,
      agentName: s.agentName,
      sourceRepo: meta?.source_repo ?? "unknown",
      sourceUrl: meta?.original_url ?? "",
      license: meta?.license ?? null,
      score: s.score,
      components: {
        staticHealth: s.components.staticHealth,
        successRate: s.components.successRate,
        costEfficiency: s.components.costEfficiency,
        consistency: s.components.consistency,
      },
      tags: deriveTags(s.staticIssues, s.benchResults ?? []),
    };
  });

  const meanScore =
    scores.length > 0
      ? round2(scores.reduce((acc, s) => acc + s.score, 0) / scores.length)
      : 0;

  return {
    generatedAt: opts.generatedAt,
    toolVersion: opts.toolVersion,
    modelUsed: opts.modelUsed,
    totalAgents: scores.length,
    totalTasks: opts.totalTasks,
    meanScore,
    entries,
  };
}

// ---------------------------------------------------------------------------
// Tag derivation

const MAX_RULE_TAGS = 3;
const MAX_TOTAL_TAGS = 4;

function deriveTags(issues: Issue[], results: RunResult[]): string[] {
  const ruleCounts = new Map<string, number>();
  for (const issue of issues) {
    ruleCounts.set(issue.ruleId, (ruleCounts.get(issue.ruleId) ?? 0) + 1);
  }

  const ruleTags = [...ruleCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, MAX_RULE_TAGS)
    .map(([ruleId]) => ruleId);

  const dominantCategory = dominantTaskCategory(results);
  const tags: string[] = [...ruleTags];
  if (dominantCategory && !tags.includes(dominantCategory)) {
    tags.push(dominantCategory);
  }
  return tags.slice(0, MAX_TOTAL_TAGS);
}

/**
 * Rough heuristic: derive the dominant category from the task ID by stripping
 * known suffixes. We don't have category on RunResult, so we fall back to
 * "bench" if every taskId looks identical or none are present.
 *
 * In practice the runner stamps results in groups that reflect the categories
 * the bench was run with; the leaderboard tag is an at-a-glance hint, not a
 * strict invariant.
 */
function dominantTaskCategory(results: RunResult[]): string | undefined {
  if (results.length === 0) return undefined;
  const winsByTask = new Map<string, number>();
  for (const r of results) {
    winsByTask.set(r.taskId, (winsByTask.get(r.taskId) ?? 0) + (r.success ? 1 : 0));
  }
  let bestTask: string | undefined;
  let bestWins = -1;
  for (const [taskId, wins] of winsByTask) {
    if (wins > bestWins) {
      bestWins = wins;
      bestTask = taskId;
    }
  }
  if (!bestTask) return undefined;
  return `task:${bestTask}`;
}

// ---------------------------------------------------------------------------
// Manifest indexing

function indexManifestByAgentName(m: Manifest): Map<string, ManifestEntry> {
  const out = new Map<string, ManifestEntry>();
  for (const e of m.entries) {
    if (e.agent_name && !out.has(e.agent_name)) {
      out.set(e.agent_name, e);
    }
  }
  return out;
}

function indexManifestByPath(m: Manifest): Map<string, ManifestEntry> {
  const out = new Map<string, ManifestEntry>();
  for (const e of m.entries) {
    if (e.saved_as) {
      out.set(normalizePath(e.saved_as), e);
    }
  }
  return out;
}

function findByPath(
  index: Map<string, ManifestEntry>,
  agentPath: string,
): ManifestEntry | undefined {
  const norm = normalizePath(agentPath);
  // Try direct match first, then suffix match (manifest paths are repo-relative).
  const direct = index.get(norm);
  if (direct) return direct;
  for (const [savedAs, entry] of index) {
    if (norm.endsWith(savedAs) || savedAs.endsWith(norm)) return entry;
  }
  return undefined;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
