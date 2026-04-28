/**
 * --rules CLI flag — list every registered rule with id, severity, and
 * description. Grep-friendly format: `<id>  [<severity>]  <description>`.
 * Useful for users who want to discover rule ids for severityOverrides
 * config or for `--rules-only` filtering in CI.
 */

import { ALL_RULES } from "../rules/index.js";

export function printRules(): void {
  const sorted = [...ALL_RULES].sort((a, b) => a.id.localeCompare(b.id));
  for (const rule of sorted) {
    const severity = rule.defaultSeverity.toLowerCase();
    console.log(`${rule.id}  [${severity}]  ${rule.description}`);
  }
}
