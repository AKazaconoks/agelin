// Smoke test for Agent A's parser + 15 rules.
// Run with: npx tsx tests/smoke-agent-a.ts
import { parseSubagentDir } from "../src/parser/parse.js";
import { ALL_RULES } from "../src/rules/index.js";

const agents = parseSubagentDir("./fixtures/subagents");

let totalIssues = 0;
const triggered = new Set<string>();

for (const a of agents) {
  console.log("\n===", a.path);
  console.log(
    `name=${a.frontmatter.name} desc.len=${a.frontmatter.description.length} bodyTokens=${a.bodyTokens} parseErrors=${a.parseErrors.length}`,
  );
  for (const r of ALL_RULES) {
    const issues = r.check(a);
    for (const i of issues) {
      totalIssues++;
      triggered.add(r.id);
      console.log(`  [${i.severity}] ${r.id}: ${i.message}`);
    }
  }
}

console.log(`\n--- summary ---`);
console.log(`agents: ${agents.length}`);
console.log(`total issues: ${totalIssues}`);
console.log(`distinct rules triggered: ${triggered.size}`);
console.log(`triggered: ${[...triggered].sort().join(", ")}`);
