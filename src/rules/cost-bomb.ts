import type { Rule, Issue } from "../types.js";

const RECURSE_HINTS = ["spawn", "subagent", "delegate"];
const BUDGET_HINTS = [
  "budget",
  "max ",
  "at most",
  "no more than",
  "limit",
  "up to",
];

const rule: Rule = {
  id: "cost-bomb",
  defaultSeverity: "warning",
  description:
    "Agent can spawn other agents (Task tool or unrestricted tools) and discusses recursion without a budget hint.",
  check(subagent) {
    const issues: Issue[] = [];

    const tools = subagent.frontmatter.tools;
    const toolList: string[] = Array.isArray(tools)
      ? tools
      : typeof tools === "string"
        ? tools.split(",").map((t) => t.trim())
        : [];
    const hasNoRestriction = tools === undefined;
    const hasTaskTool = toolList.includes("Task");

    if (!hasNoRestriction && !hasTaskTool) return issues;

    const lower = subagent.body.toLowerCase();
    const mentionsRecursion = RECURSE_HINTS.some((h) => lower.includes(h));
    if (!mentionsRecursion) return issues;

    const hasBudget = BUDGET_HINTS.some((h) => lower.includes(h));
    if (!hasBudget) {
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          "agent can spawn/delegate to subagents without a stated budget — risk of unbounded fan-out and runaway cost.",
        fix: 'Add an explicit limit, e.g. "Spawn at most 3 subagents" or "Stop after 5 tool calls".',
      });
    }
    return issues;
  },
};

export default rule;
