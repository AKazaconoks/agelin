import type { Rule, Issue } from "../types.js";
import { getToolList } from "../parser/tools.js";

const rule: Rule = {
  id: "tools-as-string-not-array",
  defaultSeverity: "suggestion",
  description:
    "Frontmatter `tools` is a comma-separated string. The Anthropic spec accepts this form, but a YAML array is preferred and less error-prone (typos in the array form fail loud).",
  check(subagent) {
    const info = getToolList(subagent);
    if (info.source !== "comma-string") return [];
    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: "`tools` is a string; convert to a YAML array.",
        fix: `Change to:\ntools:\n  - ${info.tools.join("\n  - ")}`,
      },
    ];
  },
};

export default rule;
