import type { Rule, Issue } from "../types.js";
import { fileBaseNameWithoutExt } from "../parser/parse.js";

/**
 * Frontmatter `name` should agree with the filename (slug-equivalent).
 *
 * What "agree" means in practice:
 *   - Strip extensions from the filename — both `.md` and any leading
 *     ecosystem suffix like `.agent.md` (Cline / Cursor / others use
 *     this convention; Claude Code accepts plain `.md`).
 *   - Slugify both sides: lowercase, collapse runs of non-alphanumeric
 *     characters into single hyphens, trim leading/trailing hyphens.
 *   - Compare slugs. If they match, the name is consistent regardless
 *     of capitalisation or word separators.
 *
 * Examples that PASS (slug-equivalent):
 *   filename: code-reviewer.md          name: code-reviewer
 *   filename: expert-react.agent.md     name: Expert React
 *   filename: api_helper.md             name: api-helper
 *
 * Examples that FAIL:
 *   filename: code-reviewer.md          name: secret-auditor
 *   filename: foo.md                    name: bar
 *
 * Severity history: this used to be `error` on the (overstated) claim
 * that "Claude Code resolves agents by filename". In reality Claude
 * Code dispatches by the frontmatter `name` field; the filename is
 * filesystem organisation. A mismatch is a CONSISTENCY smell — confusing
 * for humans grepping the agents directory — not a runtime bug. Hence
 * `suggestion` from 0.2.2 onward.
 */

const KNOWN_AGENT_SUFFIXES = [".agent"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripAgentSuffix(base: string): string {
  for (const suffix of KNOWN_AGENT_SUFFIXES) {
    if (base.toLowerCase().endsWith(suffix)) {
      return base.slice(0, -suffix.length);
    }
  }
  return base;
}

const rule: Rule = {
  id: "frontmatter-name-mismatch",
  defaultSeverity: "suggestion",
  description:
    "Frontmatter `name` slug doesn't match the filename slug. Confusing for humans grepping the agents directory; Claude Code itself routes by the `name` field.",
  check(subagent) {
    const fmName = subagent.frontmatter.name?.trim() ?? "";
    if (!fmName) return [];

    const rawBase = fileBaseNameWithoutExt(subagent.path);
    const fileBase = stripAgentSuffix(rawBase);

    const fmSlug = slugify(fmName);
    const fileSlug = slugify(fileBase);
    if (fmSlug === fileSlug) return [];

    const issues: Issue[] = [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          `frontmatter \`name\` "${fmName}" (slug: ${fmSlug || "<empty>"}) ` +
          `does not match filename "${rawBase}" (slug: ${fileSlug || "<empty>"}).`,
        fix:
          `Pick one and align: either rename the file to "${fmSlug || "<chosen-slug>"}.md", ` +
          `or set frontmatter \`name: ${fileSlug || "<chosen-slug>"}\`. ` +
          "Spaces and capitalisation are tolerated as long as the slugs match.",
      },
    ];
    return issues;
  },
};

export default rule;
