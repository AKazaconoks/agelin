import type { Rule, Issue } from "../types.js";

/**
 * Stronger sibling of `tool-overreach`. Fires only when ALL three signals
 * align:
 *   1. Restrictive role language in description OR first body paragraph.
 *   2. Declared tools include at least one write/exec capability.
 *   3. Body prose contains action verbs that imply mutation/execution.
 *
 * Tool-overreach already flags signals (1) + (2). This rule escalates to an
 * error when the body itself also instructs the agent to mutate state — the
 * three-way contradiction is almost certainly a real bug, not a stylistic
 * quibble.
 *
 * TODO(integration): replace the inlined WRITE_TOOLS set with the shared
 * helper from `../parser/tools.js` once Unit 1 lands.
 */

// TODO(integration): import from `../parser/tools.js` once Unit 1 lands.
const WRITE_TOOLS: ReadonlySet<string> = new Set([
  "Write",
  "Edit",
  "MultiEdit",
  "Bash",
  "NotebookEdit",
]);

const ROLE_RESTRICTION_PHRASES = [
  "review only",
  "do not modify",
  "do not change",
  "advisory",
  "audit only",
  "read-only",
  "read only",
  "analysis only",
  "inspection only",
  "report only",
];

const ACTION_VERB_PHRASES = [
  "apply the fix",
  "write the fix",
  "make the change",
  "run npm",
  "run bash",
  "bash -c",
  "git push",
  "git commit",
  "commit",
  "push",
  "execute",
];

function getDeclaredTools(frontmatterTools: unknown): string[] {
  if (Array.isArray(frontmatterTools)) {
    return frontmatterTools.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof frontmatterTools === "string") {
    return frontmatterTools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Extract the first paragraph from the markdown body. Skips blank lines
 * before the first non-empty line, then captures consecutive non-blank
 * lines until the next blank line (or end of body).
 */
function firstParagraph(body: string): string {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let started = false;
  for (const line of lines) {
    if (line.trim() === "") {
      if (started) break;
      continue;
    }
    started = true;
    out.push(line);
  }
  return out.join("\n");
}

function findFirstMatch(haystack: string, needles: string[]): string | null {
  const lower = haystack.toLowerCase();
  for (const n of needles) {
    if (lower.includes(n)) return n;
  }
  return null;
}

const rule: Rule = {
  id: "contradictory-role-capability",
  defaultSeverity: "error",
  description:
    "Description claims a read-only / advisory role, tools include write capabilities, AND the body instructs the agent to mutate state — a three-way contradiction.",
  check(subagent) {
    const issues: Issue[] = [];

    // Signal 1: role-restriction language in description OR first paragraph.
    const description = subagent.frontmatter.description ?? "";
    const opener = firstParagraph(subagent.body);
    const restrictionInDesc = findFirstMatch(description, ROLE_RESTRICTION_PHRASES);
    const restrictionInBody = findFirstMatch(opener, ROLE_RESTRICTION_PHRASES);
    const restrictionMatch = restrictionInDesc ?? restrictionInBody;
    if (!restrictionMatch) return issues;

    // Signal 2: declared tools include a write capability.
    const toolList = getDeclaredTools(subagent.frontmatter.tools);
    const conflictingTools = toolList.filter((t) => WRITE_TOOLS.has(t));
    if (conflictingTools.length === 0) return issues;

    // Signal 3: body prose contains action verbs.
    const verbMatch = findFirstMatch(subagent.body, ACTION_VERB_PHRASES);
    if (!verbMatch) return issues;

    issues.push({
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message: `Role claims read-only ('${restrictionMatch}') but tools include ${conflictingTools.join(", ")} AND body contains action verbs ('${verbMatch}'). Pick one: tighten the role, remove the write tools, or remove the action verbs.`,
      fix: "If the role is genuinely advisory: drop the write tools and replace 'apply the fix' with 'recommend the fix'. If the role mutates: remove the read-only language from the description.",
    });
    return issues;
  },
};

export default rule;
