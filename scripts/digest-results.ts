#!/usr/bin/env node
/**
 * Convert a bench results.json into a reviewer-friendly markdown digest.
 *
 * The raw results JSON for a 120-run benchmark is ~500KB and includes the
 * full model output for every run — far too much for an LLM reviewer to
 * load efficiently. This script produces a per-(agent, task) summary plus
 * the model output of representative runs (1 success + 1 failure per pair
 * when both exist), keeping the total digest under ~50KB.
 *
 * Usage:
 *   bun run scripts/digest-results.ts <results.json> [--out=digest.md]
 *
 * Output sections:
 *   1. Headline — total runs, pass rate per task, mean per-agent score
 *   2. Pass/fail matrix (agents × tasks)
 *   3. Per-(agent, task) variance (3 repeats: how often did each pass?)
 *   4. Representative outputs — 1 PASS + 1 FAIL excerpt per pair
 *   5. Outliers — runs that aborted on budget/turn-cap
 */

import { readFileSync, writeFileSync } from "node:fs";
import { argv, exit } from "node:process";

interface RunResult {
  taskId: string;
  agentName: string;
  success: boolean;
  durationMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: { tool: string; count: number }[];
  output: string;
  failureReason?: string;
}

interface AgentScoreLite {
  agentName: string;
  agentPath?: string;
  score: number;
  components: {
    staticHealth: number;
    successRate: number;
    costEfficiency: number;
    consistency: number;
  };
  staticIssues: { ruleId: string; severity: string; message: string }[];
  benchResults?: RunResult[];
}

interface ReportShape {
  results: AgentScoreLite[];
  generatedAt?: string;
  toolVersion?: string;
}

function main() {
  const args = argv.slice(2);
  const inputPath = args.find((a) => !a.startsWith("--"));
  if (!inputPath) {
    console.error("usage: digest-results <results.json> [--out=digest.md]");
    exit(1);
  }
  const outArg = args.find((a) => a.startsWith("--out="));
  const outPath = outArg ? outArg.slice("--out=".length) : "digest.md";

  const raw = readFileSync(inputPath, "utf8");
  const report = JSON.parse(raw) as ReportShape;

  const md = render(report);
  writeFileSync(outPath, md, "utf8");
  console.error(`digest written to ${outPath} (${md.length} bytes)`);
}

function render(report: ReportShape): string {
  const lines: string[] = [];
  const agents = report.results;
  const allRuns = agents.flatMap((a) => a.benchResults ?? []);
  const taskIds = unique(allRuns.map((r) => r.taskId)).sort();

  lines.push(`# Benchmark digest`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt ?? "unknown"}`);
  lines.push(`Tool: ${report.toolVersion ?? "?"}`);
  lines.push(`Agents: ${agents.length} | Tasks: ${taskIds.length} | Total runs: ${allRuns.length}`);
  lines.push("");

  // 1. Headline
  lines.push(`## 1. Headline`);
  lines.push("");
  const totalSuccesses = allRuns.filter((r) => r.success).length;
  const passRate = allRuns.length === 0 ? 0 : (100 * totalSuccesses) / allRuns.length;
  const meanScore =
    agents.length === 0
      ? 0
      : agents.reduce((acc, a) => acc + a.score, 0) / agents.length;
  lines.push(`- Overall pass rate: **${passRate.toFixed(1)}%** (${totalSuccesses}/${allRuns.length})`);
  lines.push(`- Mean per-agent score: **${meanScore.toFixed(1)}**`);
  lines.push("");

  // Per-task pass rate
  lines.push(`### Per-task pass rate`);
  lines.push("");
  lines.push(`| Task | Runs | Passed | Rate | Mean cost | Mean ms |`);
  lines.push(`| ---- | ---: | -----: | ---: | --------: | ------: |`);
  for (const task of taskIds) {
    const taskRuns = allRuns.filter((r) => r.taskId === task);
    const passed = taskRuns.filter((r) => r.success).length;
    const rate = (100 * passed) / taskRuns.length;
    const meanCost = avg(taskRuns.map((r) => r.costUsd));
    const meanMs = avg(taskRuns.map((r) => r.durationMs));
    lines.push(
      `| \`${task}\` | ${taskRuns.length} | ${passed} | ${rate.toFixed(1)}% | $${meanCost.toFixed(4)} | ${Math.round(meanMs)} |`,
    );
  }
  lines.push("");

  // 2. Pass/fail matrix
  lines.push(`## 2. Pass/fail matrix (rows=agents, cols=tasks)`);
  lines.push("");
  lines.push(`Cells show passed/total per (agent, task) over all repeats.`);
  lines.push("");
  const headers = ["Agent", ...taskIds];
  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const a of agents) {
    const row = [a.agentName.padEnd(22)];
    for (const t of taskIds) {
      const runs = (a.benchResults ?? []).filter((r) => r.taskId === t);
      const passed = runs.filter((r) => r.success).length;
      row.push(`${passed}/${runs.length}`);
    }
    lines.push(`| ${row.join(" | ")} |`);
  }
  lines.push("");

  // 3. Per-pair variance (only entries with >1 repeat)
  const variancePairs: Array<{
    agent: string;
    task: string;
    passed: number;
    total: number;
    runs: RunResult[];
  }> = [];
  for (const a of agents) {
    for (const t of taskIds) {
      const runs = (a.benchResults ?? []).filter((r) => r.taskId === t);
      if (runs.length < 2) continue;
      const passed = runs.filter((r) => r.success).length;
      if (passed > 0 && passed < runs.length) {
        variancePairs.push({
          agent: a.agentName,
          task: t,
          passed,
          total: runs.length,
          runs,
        });
      }
    }
  }
  if (variancePairs.length > 0) {
    lines.push(`## 3. High-variance pairs (sometimes-pass)`);
    lines.push("");
    lines.push(`These pairs are inconsistent across repeats — strong calibration signal.`);
    lines.push("");
    for (const v of variancePairs) {
      lines.push(`### ${v.agent} / ${v.task} — ${v.passed}/${v.total}`);
      for (const r of v.runs) {
        const verdict = r.success ? "PASS" : "FAIL";
        const reason = r.failureReason ? ` (${r.failureReason})` : "";
        lines.push(`- ${verdict}${reason}: ${truncate(r.output, 240)}`);
      }
      lines.push("");
    }
  }

  // 4. Representative outputs
  lines.push(`## 4. Representative outputs (1 PASS + 1 FAIL per pair)`);
  lines.push("");
  for (const a of agents) {
    for (const t of taskIds) {
      const runs = (a.benchResults ?? []).filter((r) => r.taskId === t);
      if (runs.length === 0) continue;
      const onePass = runs.find((r) => r.success);
      const oneFail = runs.find((r) => !r.success);
      lines.push(`### ${a.agentName} / ${t}`);
      if (onePass) {
        lines.push(`**PASS sample:**`);
        lines.push("");
        lines.push(`> ${truncate(onePass.output, 700).replace(/\n/g, "\n> ")}`);
        lines.push("");
      }
      if (oneFail) {
        lines.push(`**FAIL sample** (reason: \`${oneFail.failureReason ?? "?"}\`):`);
        lines.push("");
        lines.push(`> ${truncate(oneFail.output, 700).replace(/\n/g, "\n> ")}`);
        lines.push("");
      }
    }
  }

  // 5. Outliers — budget / turn-cap aborts
  const outliers = allRuns.filter((r) => {
    const reason = r.failureReason ?? "";
    return /budget|turn cap|hit hard turn|api error|timed out/i.test(reason);
  });
  if (outliers.length > 0) {
    lines.push(`## 5. Outliers (budget/turn/transport aborts)`);
    lines.push("");
    lines.push(`| Agent | Task | Reason |`);
    lines.push(`| ----- | ---- | ------ |`);
    for (const o of outliers) {
      lines.push(
        `| ${o.agentName} | ${o.taskId} | \`${o.failureReason ?? "?"}\` |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max) + ` … [+${s.length - max} chars]`;
}

main();
