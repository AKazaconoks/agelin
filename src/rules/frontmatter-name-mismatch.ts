import type { Rule, Issue } from "../types.js";
import { fileBaseNameWithoutExt } from "../parser/parse.js";

const rule: Rule = {
  id: "frontmatter-name-mismatch",
  defaultSeverity: "error",
  description:
    "Frontmatter `name` does not match the filename (sans .md). Claude Code resolves agents by filename — they must agree.",
  check(subagent) {
    const fmName = subagent.frontmatter.name?.trim() ?? "";
    if (!fmName) return []; // frontmatter-description-missing / parse error covers this elsewhere
    const fileName = fileBaseNameWithoutExt(subagent.path);
    if (fmName === fileName) return [];
    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `frontmatter name "${fmName}" does not match filename "${fileName}".`,
        fix: `Rename the file to "${fmName}.md" or set frontmatter name to "${fileName}".`,
      },
    ];
  },
};

export default rule;
