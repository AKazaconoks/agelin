import type { Rule, Issue } from "../types.js";

const MUTATING_TOOLS = ["Write", "Edit", "Bash"];

const READ_ONLY_HINTS = [
  "review only",
  "audit only",
  "research only",
  "read-only",
  "read only",
  "no modifications",
  "no changes",
];

const VERIFY_PATTERNS = [
  /\brun (the )?tests?\b/i,
  /\bnpm (run )?(test|build|check|lint)\b/i,
  /\byarn (test|build|lint)\b/i,
  /\bpnpm (test|build|lint)\b/i,
  /\bcargo (test|check|build|clippy)\b/i,
  /\bgo (test|build|vet)\b/i,
  /\bpytest\b/i,
  /\bpython -m (pytest|unittest)\b/i,
  /\btsc(\s+--noEmit)?\b/i,
  /\beslint\b/i,
  /\bruff\b/i,
  /\bmypy\b/i,
  /\bclippy\b/i,
  /\bverify it (compiles|builds|passes|works)\b/i,
  /\bcheck it (compiles|builds|passes)\b/i,
  /\bvalidate\s+(the|your)\s+(changes?|output|result|fix)\b/i,
  /\bensure (the )?(tests?|build|lint)\b/i,
  /\bafter (the |your )?(edit|change|fix)s?,? run\b/i,
  /\btype[- ]?check\b/i,
  /\bsmoke[- ]?test\b/i,
];

const rule: Rule = {
  id: "no-verification-step",
  defaultSeverity: "warning",
  description:
    "Agent can modify code (Write/Edit/Bash) but never tells itself to run tests, lint, or build to verify changes.",
  check(subagent) {
    const issues: Issue[] = [];

    const desc = subagent.frontmatter.description?.toLowerCase() ?? "";
    if (READ_ONLY_HINTS.some((h) => desc.includes(h))) return issues;

    const tools = subagent.frontmatter.tools;
    const toolList: string[] = Array.isArray(tools)
      ? tools
      : typeof tools === "string"
        ? tools.split(",").map((t) => t.trim())
        : [];

    const canMutate = toolList.some((t) => MUTATING_TOOLS.includes(t));
    if (!canMutate) return issues;

    const body = subagent.body;
    const hasVerification = VERIFY_PATTERNS.some((p) => p.test(body));
    if (hasVerification) return issues;

    issues.push({
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message:
        "agent can modify code (has Write/Edit/Bash) but body never instructs running tests, lint, or build to verify changes.",
      fix: 'Add a verification step, e.g. "After each edit, run the project\'s test command and ensure it passes before reporting done."',
    });
    return issues;
  },
};

export default rule;
