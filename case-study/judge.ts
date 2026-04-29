/**
 * Drive the answer-judge subagent over every response in the
 * before/after bench JSONs.
 *
 * Pipeline:
 *   1. Read case-study/results/{before,after}.json
 *   2. For each (agent, task, run, side) extract the response + duration.
 *   3. Save the response to case-study/responses/{side}/{agent}/<task>-run<n>.md
 *      so the report can link to it and so anyone can audit grades.
 *   4. Spawn `claude` 3 times per response with the answer-judge agent
 *      attached, feeding it (question, response). Parse the JSON grade
 *      out of the agent's reply.
 *   5. Save aggregated grades to case-study/results/judge.json with
 *      median across the 3 repeats and the raw grades.
 *
 * Concurrency: limit to 4 parallel claude invocations to avoid
 * rate-limiting and to keep wall time predictable.
 *
 * Run:
 *   npx tsx case-study/judge.ts
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { mkdtempSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RESULTS_DIR = resolve(ROOT, "case-study/results");
const RESPONSES_DIR = resolve(ROOT, "case-study/responses");
const JUDGE_AGENT_FILE = resolve(ROOT, "templates/answer-judge.md");

const JUDGE_REPEATS = Number(process.env.JUDGE_REPEATS ?? 3);
const PARALLELISM = Number(process.env.JUDGE_PARALLELISM ?? 4);
const PER_CALL_TIMEOUT_MS = 120_000;
// If true, append to existing judge.json and skip already-graded
// (side, agent, taskId, run) cells. Used to recover from quota interruptions.
const RESUME = process.env.JUDGE_RESUME === "1";

interface BenchRun {
  taskId: string;
  agentName: string;
  success: boolean;
  durationMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  output: string;
  failureReason?: string;
}

interface BenchAgent {
  agentName: string;
  agentPath: string;
  benchResults?: BenchRun[];
}

interface BenchData {
  results: BenchAgent[];
}

interface Grade {
  correctness: number;
  clarity: number;
  completeness: number;
  conciseness: number;
  technical_accuracy: number;
  total: number;
  one_line_critique: string;
}

interface CellGrade {
  side: "before" | "after";
  agent: string;
  taskId: string;
  run: number;
  grades: Grade[]; // 3 repeats
  median: Grade;
  durationMs: number;
  timedOut: boolean;
  responsePath: string;
}

// Materialise the judge agent into a tmp `~/.claude/agents/`-style dir
// so the spawned `claude` CLI can `@`-mention it. We don't pollute the
// user's real ~/.claude/agents — we use a per-process temp dir.
const tempAgentsDir = mkdtempSync(join(tmpdir(), "agelin-judge-"));
const JUDGE_AGENT_NAME = "answer-judge";

async function setup(): Promise<void> {
  await fs.mkdir(tempAgentsDir, { recursive: true });
  const agentBody = await fs.readFile(JUDGE_AGENT_FILE, "utf8");
  await fs.writeFile(
    join(tempAgentsDir, `${JUDGE_AGENT_NAME}.md`),
    agentBody,
    "utf8",
  );
}

async function loadTaskQuestion(taskId: string): Promise<string> {
  const taskPath = resolve(ROOT, `tasks/case-study/${taskId}.json`);
  const raw = await fs.readFile(taskPath, "utf8");
  const json = JSON.parse(raw) as { prompt: string };
  return json.prompt;
}

/** Parse a JSON object out of the judge's reply. */
function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1]!);
    } catch {
      /* fall through */
    }
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      /* fall through */
    }
  }
  throw new Error(`No JSON found in judge output: ${text.slice(0, 300)}…`);
}

function isGrade(value: unknown): value is Grade {
  if (value === null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.correctness === "number" &&
    typeof o.clarity === "number" &&
    typeof o.completeness === "number" &&
    typeof o.conciseness === "number" &&
    typeof o.technical_accuracy === "number" &&
    typeof o.total === "number" &&
    typeof o.one_line_critique === "string"
  );
}

/**
 * Spawn `claude -p <prompt>` with the judge agent on PATH, capture
 * the agent's reply, parse it as JSON. One call per repeat.
 */
async function judgeOnce(
  question: string,
  answer: string,
): Promise<Grade> {
  const userMessage = [
    `Use the @${JUDGE_AGENT_NAME} agent to grade the following answer to a real StackOverflow question.`,
    "",
    "## Question",
    "",
    question,
    "",
    "## Agent's answer",
    "",
    answer,
    "",
    "## Your task",
    "",
    `Score the agent's answer above using the rubric in your @${JUDGE_AGENT_NAME} system prompt. Output JSON only.`,
  ].join("\n");

  return new Promise((resolveP, rejectP) => {
    const child = spawn(
      "claude",
      [
        "-p",
        userMessage,
        "--output-format",
        "json",
        "--add-dir",
        tempAgentsDir,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        // shell: false — must NOT be true. With shell: true, Node joins
        // argv with spaces and lets the OS shell re-tokenize, which
        // truncates the long userMessage at its first space (claude
        // sees only the word "Use"). On Windows, child_process.spawn
        // resolves `claude` -> `claude.exe` via PATHEXT automatically.
        shell: false,
      },
    );

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      rejectP(new Error("judge call timed out"));
    }, PER_CALL_TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectP(new Error(`claude exited ${code}: ${stderr.slice(0, 200)}`));
        return;
      }
      try {
        const cli = JSON.parse(stdout) as { result?: string };
        if (typeof cli.result !== "string") {
          rejectP(new Error(`claude output had no .result: ${stdout.slice(0, 200)}`));
          return;
        }
        const grade = extractJson(cli.result);
        if (!isGrade(grade)) {
          rejectP(new Error(`judge output missing fields: ${JSON.stringify(grade).slice(0, 200)}`));
          return;
        }
        // Recompute total — judges sometimes drift; trust the breakdown.
        grade.total =
          grade.correctness +
          grade.clarity +
          grade.completeness +
          grade.conciseness +
          grade.technical_accuracy;
        resolveP(grade);
      } catch (err) {
        rejectP(err as Error);
      }
    });
  });
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[m - 1]! + sorted[m]!) / 2
    : sorted[m]!;
}

function medianGrade(grades: Grade[]): Grade {
  return {
    correctness: median(grades.map((g) => g.correctness)),
    clarity: median(grades.map((g) => g.clarity)),
    completeness: median(grades.map((g) => g.completeness)),
    conciseness: median(grades.map((g) => g.conciseness)),
    technical_accuracy: median(grades.map((g) => g.technical_accuracy)),
    total: median(grades.map((g) => g.total)),
    one_line_critique: grades[Math.floor(grades.length / 2)]!.one_line_critique,
  };
}

async function judgeWithRetry(
  question: string,
  answer: string,
  attempts = 2,
): Promise<Grade | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await judgeOnce(question, answer);
    } catch (err) {
      if (i === attempts - 1) {
        console.error(`  judge failed after ${attempts} attempts:`, (err as Error).message);
        return null;
      }
    }
  }
  return null;
}

async function processCell(
  side: "before" | "after",
  agent: string,
  run: BenchRun,
  question: string,
  runIdx: number,
): Promise<CellGrade | null> {
  // Save the response to disk for transparency.
  const respDir = resolve(RESPONSES_DIR, side, agent);
  await fs.mkdir(respDir, { recursive: true });
  const responsePath = resolve(respDir, `${run.taskId}-run${runIdx}.md`);
  const timedOut = (run.failureReason ?? "").includes("duration budget");
  const responseHeader = [
    `<!-- ${side} / ${agent} / ${run.taskId} / run ${runIdx} -->`,
    "",
    `**Duration**: ${(run.durationMs / 1000).toFixed(1)}s`,
    `**Strict pass**: ${run.success}`,
    `**Timed out**: ${timedOut}`,
    `**Failure reason**: ${run.failureReason ?? "n/a"}`,
    "",
    "---",
    "",
  ].join("\n");
  await fs.writeFile(responsePath, responseHeader + (run.output ?? ""), "utf8");

  // Run the judge JUDGE_REPEATS times.
  const grades: Grade[] = [];
  for (let r = 0; r < JUDGE_REPEATS; r++) {
    const grade = await judgeWithRetry(question, run.output ?? "(no output)");
    if (grade) grades.push(grade);
  }
  if (grades.length === 0) {
    console.error(`  ${side}/${agent}/${run.taskId}/run${runIdx}: NO GRADES`);
    return null;
  }
  return {
    side,
    agent,
    taskId: run.taskId,
    run: runIdx,
    grades,
    median: medianGrade(grades),
    durationMs: run.durationMs,
    timedOut,
    responsePath: responsePath.replace(ROOT + "/", "").replace(/\\/g, "/"),
  };
}

interface QueueItem {
  side: "before" | "after";
  agent: string;
  run: BenchRun;
  question: string;
  runIdx: number;
}

async function runQueue(items: QueueItem[]): Promise<CellGrade[]> {
  const out: CellGrade[] = [];
  let completed = 0;
  const total = items.length;

  // Simple worker-pool with PARALLELISM workers.
  const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      const t0 = Date.now();
      const cell = await processCell(
        next.side,
        next.agent,
        next.run,
        next.question,
        next.runIdx,
      );
      completed += 1;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const avg = cell ? cell.median.total : NaN;
      console.log(
        `[${completed}/${total}] ${next.side}/${next.agent}/${next.run.taskId}#${next.runIdx} ${elapsed}s -> median=${avg}`,
      );
      if (cell) out.push(cell);
    }
  }
  await Promise.all(Array.from({ length: PARALLELISM }, () => worker()));
  return out;
}

async function main(): Promise<void> {
  await setup();
  console.log(`Judge agent staged in ${tempAgentsDir}`);

  const before: BenchData = JSON.parse(
    await fs.readFile(resolve(RESULTS_DIR, "before.json"), "utf8"),
  );
  const after: BenchData = JSON.parse(
    await fs.readFile(resolve(RESULTS_DIR, "after.json"), "utf8"),
  );

  // Cache question text per task.
  const questionCache = new Map<string, string>();
  async function getQuestion(taskId: string): Promise<string> {
    if (!questionCache.has(taskId)) {
      questionCache.set(taskId, await loadTaskQuestion(taskId));
    }
    return questionCache.get(taskId)!;
  }

  // Resume mode: load any existing judge.json and skip cells already graded.
  const outPath = resolve(RESULTS_DIR, "judge.json");
  let existingCells: CellGrade[] = [];
  const alreadyGraded = new Set<string>();
  if (RESUME) {
    try {
      const prior = JSON.parse(await fs.readFile(outPath, "utf8")) as {
        cells: CellGrade[];
      };
      existingCells = prior.cells.filter(
        (c) => Number.isFinite(c.median?.total),
      );
      for (const c of existingCells) {
        alreadyGraded.add(`${c.side}/${c.agent}/${c.taskId}/${c.run}`);
      }
      console.log(
        `RESUME: ${existingCells.length} cells already graded, skipping`,
      );
    } catch (err) {
      console.log(`RESUME requested but could not read ${outPath}: ${(err as Error).message}`);
    }
  }

  const items: QueueItem[] = [];
  for (const [side, data] of [
    ["before", before] as const,
    ["after", after] as const,
  ]) {
    for (const agent of data.results) {
      const runs = agent.benchResults ?? [];
      // Group by taskId to assign run indices 1..3
      const byTask = new Map<string, BenchRun[]>();
      for (const r of runs) {
        if (!byTask.has(r.taskId)) byTask.set(r.taskId, []);
        byTask.get(r.taskId)!.push(r);
      }
      for (const [taskId, taskRuns] of byTask) {
        const question = await getQuestion(taskId);
        for (let i = 0; i < taskRuns.length; i++) {
          const key = `${side}/${agent.agentName}/${taskId}/${i + 1}`;
          if (alreadyGraded.has(key)) continue;
          items.push({
            side,
            agent: agent.agentName,
            run: taskRuns[i]!,
            question,
            runIdx: i + 1,
          });
        }
      }
    }
  }

  console.log(`Queued ${items.length} response cells × ${JUDGE_REPEATS} judge repeats = ${items.length * JUDGE_REPEATS} judge calls`);
  const t0 = Date.now();
  const cells = await runQueue(items);
  const elapsedMin = ((Date.now() - t0) / 60_000).toFixed(1);
  console.log(`\nDone in ${elapsedMin} min — ${cells.length} cells graded.`);

  // Persist (merge with prior cells if resuming).
  const allCells = [...existingCells, ...cells];
  await fs.writeFile(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), cells: allCells }, null, 2),
    "utf8",
  );
  console.log(`Wrote ${outPath}`);
}

await main();
