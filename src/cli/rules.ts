/**
 * `agelin --rules` — list all registered rules in a grep-friendly format.
 *
 * Output: `<id>  [<severity>]  <description>` with the id left-padded to 38
 * chars so the columns line up.
 */

import { ALL_RULES } from "../rules/index.js";

const ID_COLUMN_WIDTH = 38;
// "[suggestion]" is the widest severity bracket (12 chars); pad to that.
const SEVERITY_COLUMN_WIDTH = 12;

export function printRules(): void {
  const sorted = [...ALL_RULES].sort((a, b) => a.id.localeCompare(b.id));
  for (const rule of sorted) {
    const id = rule.id.padEnd(ID_COLUMN_WIDTH);
    const sev = `[${rule.defaultSeverity}]`.padEnd(SEVERITY_COLUMN_WIDTH);
    console.log(`${id} ${sev} ${rule.description}`);
  }
}
