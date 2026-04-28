/**
 * `agelin diff` — compare two ReportContext JSON files.
 *
 * Designed for CI: drop the baseline JSON in your repo, run `agelin
 * check --format=json` on the PR branch, then `diff baseline.json current.json`
 * shows what got worse / better since the baseline. Exits 0 by default; pass
 * `--fail-on-regress` to exit 1 when any agent's score went down or any new
 * issue appeared.
 *
 * Output formats: console (default, colorized), markdown (PR-comment ready),
 * json (machine-readable).
 */

import { readFileSync } from "node:fs";
import kleur from "kleur";
import type { AgentScore, Issue, ReportContext } from "../types.js";

export interface DiffOptions {
  baselinePath: string;
  currentPath: string;
  format: string;
  failOnRegress?: boolean;
}

export async function runDiff(opts: DiffOptions): Promise<void> {
  const baseline = loadContext(opts.baselinePath);
  const current = loadContext(opts.currentPath);

  const result = computeDiff(baseline, current);

  let output: string;
  switch (opts.format) {
    case "json":
      output = JSON.stringify(result, null, 2);
      break;
    case "markdown":
      output = renderMarkdown(result);
      break;
    case "console":
    default:
      output = renderConsole(result);
  }
  console.log(output);

  if (opts.failOnRegress && result.summary.regressedAgents > 0) {
    process.exit(1);
  }
}

// --- types ---------------------------------------------------------------

export interface DiffResult {
  summary: {
    baselineGeneratedAt: string;
    currentGeneratedAt: string;
    baselineMean: number;
    currentMean: number;
    deltaMean: number;
    regressedAgents: number;
    improvedAgents: number;
    addedAgents: number;
    removedAgents: number;
  };
  perAgent: AgentDelta[];
  perRule: RuleDelta[];
}

export interface AgentDelta {
  agentName: string;
  baselineScore: number | null;
  currentScore: number | null;
  delta: number | null;
  newIssues: Issue[];
  resolvedIssues: Issue[];
}

export interface RuleDelta {
  ruleId: string;
  baselineFirings: number;
  currentFirings: number;
  delta: number;
}

// --- compute -------------------------------------------------------------

function computeDiff(baseline: ReportContext, current: ReportContext): DiffResult {
  const baseByName = new Map<string, AgentScore>();
  for (const a of baseline.results) baseByName.set(a.agentName, a);
  const curByName = new Map<string, AgentScore>();
  for (const a of current.results) curByName.set(a.agentName, a);

  const allNames = new Set<string>([...baseByName.keys(), ...curByName.keys()]);

  const perAgent: AgentDelta[] = [];
  let regressed = 0;
  let improved = 0;
  let added = 0;
  let removed = 0;

  for (const name of allNames) {
    const b = baseByName.get(name);
    const c = curByName.get(name);
    if (!b && c) {
      added++;
      perAgent.push({
        agentName: name,
        baselineScore: null,
        currentScore: c.score,
        delta: null,
        newIssues: c.staticIssues,
        resolvedIssues: [],
      });
      continue;
    }
    if (b && !c) {
      removed++;
      perAgent.push({
        agentName: name,
        baselineScore: b.score,
        currentScore: null,
        delta: null,
        newIssues: [],
        resolvedIssues: b.staticIssues,
      });
      continue;
    }
    if (b && c) {
      const delta = c.score - b.score;
      if (delta < 0) regressed++;
      if (delta > 0) improved++;
      const baseIssueKeys = new Set(b.staticIssues.map(issueKey));
      const curIssueKeys = new Set(c.staticIssues.map(issueKey));
      const newIssues = c.staticIssues.filter((i) => !baseIssueKeys.has(issueKey(i)));
      const resolvedIssues = b.staticIssues.filter((i) => !curIssueKeys.has(issueKey(i)));
      perAgent.push({
        agentName: name,
        baselineScore: b.score,
        currentScore: c.score,
        delta,
        newIssues,
        resolvedIssues,
      });
    }
  }

  // Per-rule firing deltas
  const baseRuleCount = countRuleFirings(baseline);
  const curRuleCount = countRuleFirings(current);
  const allRuleIds = new Set<string>([...baseRuleCount.keys(), ...curRuleCount.keys()]);
  const perRule: RuleDelta[] = [];
  for (const id of allRuleIds) {
    const baseN = baseRuleCount.get(id) ?? 0;
    const curN = curRuleCount.get(id) ?? 0;
    perRule.push({ ruleId: id, baselineFirings: baseN, currentFirings: curN, delta: curN - baseN });
  }
  perRule.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    summary: {
      baselineGeneratedAt: baseline.generatedAt,
      currentGeneratedAt: current.generatedAt,
      baselineMean: meanScore(baseline.results),
      currentMean: meanScore(current.results),
      deltaMean: meanScore(current.results) - meanScore(baseline.results),
      regressedAgents: regressed,
      improvedAgents: improved,
      addedAgents: added,
      removedAgents: removed,
    },
    perAgent: perAgent.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)),
    perRule,
  };
}

function issueKey(i: Issue): string {
  return `${i.ruleId}|${i.message}`;
}

function countRuleFirings(ctx: ReportContext): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of ctx.results) {
    for (const i of a.staticIssues) {
      counts.set(i.ruleId, (counts.get(i.ruleId) ?? 0) + 1);
    }
  }
  return counts;
}

function meanScore(rs: AgentScore[]): number {
  if (rs.length === 0) return 0;
  return rs.reduce((s, r) => s + r.score, 0) / rs.length;
}

// --- renderers -----------------------------------------------------------

function renderConsole(d: DiffResult): string {
  const lines: string[] = [];
  const s = d.summary;
  const arrow = s.deltaMean >= 0 ? kleur.green("\u2191") : kleur.red("\u2193");
  lines.push(
    `Mean: ${s.baselineMean.toFixed(1)} \u2192 ${s.currentMean.toFixed(1)} (${arrow} ${Math.abs(s.deltaMean).toFixed(1)})`,
  );
  lines.push(
    `Agents: ${kleur.red(String(s.regressedAgents))} regressed, ${kleur.green(String(s.improvedAgents))} improved, ${s.addedAgents} added, ${s.removedAgents} removed`,
  );
  lines.push("");

  // Most regressed agents (top 5)
  const regressed = d.perAgent.filter((a) => (a.delta ?? 0) < 0).slice(0, 5);
  if (regressed.length > 0) {
    lines.push(kleur.red("Top regressions:"));
    for (const a of regressed) {
      lines.push(
        `  ${kleur.red("\u2193")} ${a.agentName.padEnd(28)} ${a.baselineScore} \u2192 ${a.currentScore} (${a.delta})`,
      );
      for (const i of a.newIssues.slice(0, 2)) {
        lines.push(`      + ${i.ruleId}: ${i.message.slice(0, 80)}`);
      }
    }
    lines.push("");
  }

  // Improvements
  const improved = d.perAgent.filter((a) => (a.delta ?? 0) > 0).slice(0, 5);
  if (improved.length > 0) {
    lines.push(kleur.green("Top improvements:"));
    for (const a of improved.slice().reverse()) {
      lines.push(
        `  ${kleur.green("\u2191")} ${a.agentName.padEnd(28)} ${a.baselineScore} \u2192 ${a.currentScore} (+${a.delta})`,
      );
    }
    lines.push("");
  }

  // Per-rule firing changes
  const changedRules = d.perRule.filter((r) => r.delta !== 0).slice(0, 8);
  if (changedRules.length > 0) {
    lines.push("Per-rule firing changes:");
    for (const r of changedRules) {
      const sign = r.delta > 0 ? kleur.red(`+${r.delta}`) : kleur.green(`${r.delta}`);
      lines.push(`  ${r.ruleId.padEnd(40)} ${r.baselineFirings} \u2192 ${r.currentFirings} (${sign})`);
    }
  }

  return lines.join("\n");
}

function renderMarkdown(d: DiffResult): string {
  const s = d.summary;
  const lines: string[] = [];
  lines.push(`# agelin diff`);
  lines.push("");
  lines.push(`Generated: ${s.currentGeneratedAt} (vs baseline ${s.baselineGeneratedAt})`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| | Baseline | Current | Delta |`);
  lines.push(`|---|---:|---:|---:|`);
  lines.push(
    `| Mean score | ${s.baselineMean.toFixed(1)} | ${s.currentMean.toFixed(1)} | ${s.deltaMean >= 0 ? "+" : ""}${s.deltaMean.toFixed(1)} |`,
  );
  lines.push(`| Regressed agents | | | ${s.regressedAgents} |`);
  lines.push(`| Improved agents | | | ${s.improvedAgents} |`);
  lines.push(`| Added agents | | | ${s.addedAgents} |`);
  lines.push(`| Removed agents | | | ${s.removedAgents} |`);
  lines.push("");

  const regressed = d.perAgent.filter((a) => (a.delta ?? 0) < 0);
  if (regressed.length > 0) {
    lines.push(`## Regressions`);
    lines.push("");
    lines.push(`| Agent | Baseline | Current | Delta | New issues |`);
    lines.push(`|---|---:|---:|---:|---|`);
    for (const a of regressed) {
      const newRules = Array.from(new Set(a.newIssues.map((i) => i.ruleId))).slice(0, 3).join(", ");
      lines.push(
        `| \`${a.agentName}\` | ${a.baselineScore} | ${a.currentScore} | ${a.delta} | ${newRules} |`,
      );
    }
    lines.push("");
  }

  const improved = d.perAgent.filter((a) => (a.delta ?? 0) > 0);
  if (improved.length > 0) {
    lines.push(`## Improvements`);
    lines.push("");
    lines.push(`| Agent | Baseline | Current | Delta |`);
    lines.push(`|---|---:|---:|---:|`);
    for (const a of improved.slice().reverse().slice(0, 10)) {
      lines.push(`| \`${a.agentName}\` | ${a.baselineScore} | ${a.currentScore} | +${a.delta} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// --- io helpers ----------------------------------------------------------

function loadContext(path: string): ReportContext {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
  // Tolerate a top-level { results: [], generatedAt, toolVersion } OR a bare
  // array of AgentScore. Convert bare-array to a synthetic context.
  if (Array.isArray(parsed)) {
    return { results: parsed, generatedAt: "(unknown)", toolVersion: "(unknown)" };
  }
  return parsed as ReportContext;
}
