import type { Rule, Issue } from "../types.js";
import { getToolList, isMcpTool, CANONICAL_TOOLS } from "../parser/tools.js";

/**
 * Flags tools declared in frontmatter that are never referenced — neither
 * by name nor by an implicit usage verb — anywhere in the body prose.
 *
 * Calibration findings (cycle 2): the original "every tool name must
 * appear verbatim" heuristic fired 449 times across 97 wild agents
 * (~4.6 per agent), because real subagents commonly say "Read the
 * file" or "edit the function" without naming the tool literally.
 * The rule now considers implicit usage: any synonymous verb in
 * `IMPLICIT_USAGE` for that tool counts as a reference. Severity
 * is `suggestion` (formerly `warning`) — copy-paste tool lists are
 * a smell, not a bug.
 *
 * MCP tools (`mcp__server__tool`) are skipped: their double-underscore
 * canonical name effectively never appears in prose.
 */

/** Verbs whose presence implies the tool is used, even if the tool's
 * literal name is absent. Lowercase, whole-word matched against prose. */
const IMPLICIT_USAGE: Record<string, RegExp[]> = {
  Read: [/\bread\b/, /\bload\b/, /\bopen\b/, /\bview\b/, /\binspect\b/, /\bexamine\b/, /\bcontents? of\b/],
  Write: [/\bwrite\b/, /\bcreate\b/, /\bgenerate\b/, /\bproduce\b/, /\bsave\b/, /\bemit\b/, /\boutput a file\b/],
  Edit: [/\bedit\b/, /\bmodify\b/, /\bupdate\b/, /\bchange\b/, /\bapply\b/, /\bfix\b/, /\brefactor\b/, /\brewrite\b/, /\breplace\b/],
  MultiEdit: [/\bedit\b/, /\bmodify\b/, /\bbatch\b/, /\bmulti[- ]edit\b/, /\brefactor\b/, /\brewrite\b/],
  Bash: [/\brun\b/, /\bexecute\b/, /\bshell\b/, /\bcommand\b/, /\binvoke\b/, /\binvocation\b/, /\bcli\b/, /\bnpm\b/, /\bbuild\b/, /\btest\b/, /\bspawn\b/],
  Glob: [/\bglob\b/, /\bfind files?\b/, /\blist files?\b/, /\bmatching files?\b/, /\bmatching pattern\b/],
  Grep: [/\bgrep\b/, /\bsearch\b/, /\bfind\b/, /\block?\s+for\b/, /\boccurrences?\b/, /\bregex\b/, /\bpattern\b/],
  LS: [/\blist\b/, /\bdirectory\b/, /\bfolder\b/, /\bls\b/],
  WebFetch: [/\bfetch\b/, /\bdownload\b/, /\bcurl\b/, /\bhttp\b/, /\burl\b/, /\bweb page\b/, /\bsite\b/],
  WebSearch: [/\bsearch the web\b/, /\bweb search\b/, /\bgoogle\b/, /\bquery the web\b/],
  Task: [/\bdelegate\b/, /\bsub[- ]?agent\b/, /\bspawn\b/, /\bhand off\b/, /\binvoke .* agent\b/, /\bcall .* agent\b/],
  TodoWrite: [/\btodo\b/, /\btask list\b/, /\bplan\b/, /\bcheck[- ]?list\b/, /\btrack progress\b/],
  NotebookEdit: [/\bnotebook\b/, /\bjupyter\b/, /\bipynb\b/, /\bcell\b/],
  BashOutput: [/\boutput\b/, /\blog\b/, /\bstderr\b/, /\bstdout\b/, /\bbash output\b/],
  KillShell: [/\bkill\b/, /\bterminate\b/, /\bstop the\b/, /\babort\b/],
  SlashCommand: [/\bslash command\b/, /\b\/[a-z][a-z0-9-]+\b/],
  ExitPlanMode: [/\bexit plan\b/, /\bplan mode\b/, /\bleave plan\b/],
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const rule: Rule = {
  id: "tool-body-mismatch",
  defaultSeverity: "suggestion",
  description:
    "Tool declared in frontmatter has no literal mention and no implicit-usage verb in body prose. Likely copy-pasted from another agent.",
  check(subagent) {
    const info = getToolList(subagent);
    if (info.source === "missing") return [];

    // Only check well-known tools; MCP tools never appear verbatim in prose.
    const candidates = info.tools.filter(
      (t) => CANONICAL_TOOLS.has(t) && !isMcpTool(t),
    );
    if (candidates.length === 0) return [];

    const prose = (subagent.ast?.prose ?? subagent.body).toLowerCase();
    const issues: Issue[] = [];

    for (const tool of candidates) {
      // Literal mention by name (case-insensitive whole-word).
      const literal = new RegExp(`\\b${escapeRegex(tool)}\\b`, "i");
      if (literal.test(prose)) continue;

      // Implicit-usage verb match.
      const synonyms = IMPLICIT_USAGE[tool] ?? [];
      const usedImplicitly = synonyms.some((re) => re.test(prose));
      if (usedImplicitly) continue;

      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `tool '${tool}' is declared in frontmatter but the body never names it nor uses any verb that implies it (no read/edit/write/run/etc. for ${tool}).`,
        fix: `Either remove '${tool}' from the tools list, or add a body sentence describing when ${tool} is used.`,
      });
    }
    return issues;
  },
};

export default rule;
