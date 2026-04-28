# Rule-gap audit

Sample: 10 wild agents from `targets/` (3 high-static/high-bench, 3 wolves, 1 low-static, 1 mid-static, 2 random middle). Goal: find patterns that an expert reviewer would flag, that the current 32 rules miss.

## Patterns observed

### P1. Domain-narrow description with no scope-of-applicability caveat (the "wolf" pattern)

The wolves all share one structural feature: their description names a single language/framework and nothing else. There is no hedge ("Use when working in X; route Y elsewhere"), and there is no positive routing trigger.

- `c-expert.md:3` — `description: C language expert specializing in efficient, reliable systems-level programming.`
- `bash-expert.md:3` — `description: Master of defensive Bash scripting for production automation, ...`
- `ava-expert.md:3` — `description: Expert in Ava for running tests and managing test suites efficiently.`
- `bun-expert.md:3` — `description: Expertise in Bun, focusing on high-performance JavaScript runtime, ...`
- `angularjs-expert.md:3` — `description: Expert in AngularJS development, ...`

Compare with high-static/high-bench `angular-expert.md:3` which adds an explicit trigger: *"Use PROACTIVELY for Angular development, optimization, or advanced features"*, or `architect-reviewer.md:3` which states the *when* clause: *"Use after any structural changes, new service introductions, or API modifications"*.

The "wolf" descriptions are pure self-description (what the agent IS) with no *when-to-route* clause. This is plausibly the mechanism by which the orchestrator hands `c-expert` a JS Date task — the description gives no negative signal.

**Severity guess:** high — directly correlates with the high-static / low-bench gap reported in `launch/key-findings.md`.
**Detection:** regex on description: noun-phrase with `expert|specialist|master|pro` and no when-clause keyword (`use when`, `use after`, `invoke`, `route`, `before`, `during`).

### P2. Versioned framework name baked into agent identity

Several agents pin a framework version in the *name* or *description* but the body never warns about this scope. They will go stale silently as ecosystems move.

- `dotnet-framework-4.8-expert.md` (whole agent named for 4.8)
- `powershell-5.1-expert.md` (named for 5.1)
- `angular-architect.md:8` — `expertise in Angular 15+` (Angular is at 19+ as of 2026-04)
- `electron-pro.md:8` — `Electron 27+` (Electron is at 33+)
- `bash-expert.md:18` — `Modern Bash 5.x features`

For the named-version cases, a body that says "you can use the latest features" without restating the version constraint silently lies to the orchestrator. For the soft-version cases, "Angular 15+" or "Electron 27+" is the kind of thing that ages out and turns the agent into stale advice.

**Severity guess:** medium — agents still function, but advice quality decays.
**Detection:** regex match on `(framework|version|library) \d+\.?\d*\+?` or `\b<NameVer>\b` patterns; flag if the version is older than N years vs `currentDate`. Cross-reference frontmatter `name` with body.

### P3. Section-name vs section-content mismatch ("Output" lists capabilities, not deliverables)

The 0xfurai template (used by ~40 agents in our corpus) has a `## Output` section. In well-written agents this is a deliverable contract. In many it's just a second focus-areas list with no "the agent returns X" framing.

- `c-expert.md:43–53` `## Output` lists *"Efficient C code with zero memory leaks", "Performance benchmark reports if applicable"* — these are quality attributes, not deliverable shapes. The agent never states "return a markdown report containing ..." or "return a single source file plus a Makefile".
- `ava-expert.md:43–52` same pattern: "Codebase with >85% test coverage", "Setup for continuous integration".
- `bun-expert.md:46–56` same. `cassandra-expert.md:46–56` same.

Today `undefined-output-shape` checks for absence of "JSON / markdown / list / report" keywords. These agents skirt that by saying "documentation" or "report" inside the Output section without specifying the format. The rule passes; the contract is still fictional.

**Severity guess:** medium — produces variability across runs.
**Detection:** if an `## Output` (or `## Deliverable`) section exists, check whether at least one bullet starts with a noun phrase that names a concrete artifact format (`a markdown report …`, `a JSON object containing …`, `a single .c file …`). If all bullets are abstract noun phrases ("Optimized X", "Robust Y") flag.

### P4. Cross-agent references to undefined collaborators

The lst97/VoltAgent corpora have a recurring "Integration with other agents" section at the end. It names agents that don't exist (or that the running agent has no way to invoke).

- `electron-pro.md:231–238` lists `frontend-developer`, `backend-developer`, `security-auditor`, `devops-engineer`, `performance-engineer`, `qa-expert`, `ui-designer`, `fullstack-developer` — but `tools: Read, Write, Edit, Bash, Glob, Grep` (no Task tool).
- `angular-architect.md:277–285` lists 8 partner agents, again no Task tool.
- `dotnet-framework-4.8-expert.md:296–304` same.

Today `unresolved-cross-references` fires only if it sees `@agent-name` or "delegate to". The "Collaborate with X on Y" phrasing slips through — the body promises collaboration that the agent literally cannot perform.

**Severity guess:** medium — agents promise behavior they can't deliver, eroding trust in the orchestrator's routing decisions.
**Detection:** detect "Integration with other agents" / "Collaborate with" / "Work with X on Y" / "Coordinate with X" patterns where X is a hyphenated agent-style name; require Task tool if any are found.

### P5. "Checklist" and "Quality Checklist" bullets phrased as agent self-grading rather than work product

The 0xfurai template uses `## Quality Checklist` to assert post-conditions. Many entries are unverifiable affirmations.

- `cassandra-expert.md:34–44` — "Tables are designed for efficient querying", "Backup procedures are tested and documented", "Security audits ... are regularly performed". The agent has no way to verify "regularly performed" in a single invocation.
- `c-expert.md:31–41` — "Unit tests for all critical sections of code", "Following DRY principle".
- `ava-expert.md:31–41` — "Constant test suite runtime across environments".

These read like Specification Documents, not agent instructions. Existing rules (`vague-pronouns`, `vague-completion-criteria`) only fire on specific tokens. The structural problem — a checklist of things that *should be true* with no instruction for how to make them true — is invisible.

**Severity guess:** low-to-medium. Real cost is body-token waste and a confused agent that thinks it has a list of obligations rather than steps.
**Detection:** harder. Heuristic: in a `## *Checklist` section, count bullets that begin with a passive/static verb form (`is`, `are`, `follows`, `ensures`) vs imperative (`run`, `verify`, `add`, `check`). High passive ratio → flag.

### P6. JSON examples embedded in body that look like API calls but aren't

VoltAgent agents include "Communication Protocol" blocks with fake JSON request/response shapes the agent will supposedly emit.

- `electron-pro.md:104–114` — `{"requesting_agent": "electron-pro", "request_type": "get_desktop_context", ...}` — this is theatrical. The agent has no protocol layer to emit JSON status updates to. Same template in `angular-architect.md:133–142`, `dotnet-framework-4.8-expert.md:152–161`.

The body teaches the model to emit ceremonial JSON that no harness consumes. Token waste plus user confusion (looks like an actual API contract).

**Severity guess:** low — annoyance, not failure.
**Detection:** fenced JSON block where keys include `requesting_agent` / `agent` and `status` / `request_type` / `payload`, plus no other indication that JSON is the deliverable. Flag as ceremonial.

### P7. Mega-list explosion ("more is more")

Several VoltAgent body prompts dump 20+ topical sub-headings, each with 8-bullet lists.

- `electron-pro.md` — 11 sub-area lists totaling ~80 bullets. The body is structured for human reading, not agent execution.
- `angular-architect.md` — same shape, ~95 bullets.
- `dotnet-framework-4.8-expert.md` — ~120 bullets.

`prompt-too-long` only fires above 2000 tokens. These agents skirt under but the *bullet density* is the actual problem: the model receives a checklist of 80+ items competing for attention with no clear workflow.

**Severity guess:** medium — likely correlated with the bench failures of "looks fine, performs poorly" agents.
**Detection:** count bullet-list items in body. If `bullets > 60` AND `top-level sections > 8`, flag as bullet-explosion regardless of token count.

---

## Top 3 candidates for new rules

Ranked by (a) deterministic detection, (b) likely correlation with bench failure, (c) non-overlap with existing 32.

### Rank 1: `description-no-routing-trigger` (P1)

The "wolf" pattern. Strongest correlation with the static/bench gap.

```ts
import type { Rule, Issue } from "../types.js";

const TRIGGER_KEYWORDS = [
  /\buse\s+(when|after|before|for|in|whenever|if)\b/i,
  /\binvoke\s+(when|for)\b/i,
  /\b(route|routing)\b/i,
  /\bproactively\b/i,
  /\btrigger(?:ed)?\s+(when|by)\b/i,
];

const NARROW_NOUN = /\b(expert|specialist|master|pro|guru|wizard|architect|developer)\b/i;

const rule: Rule = {
  id: "description-no-routing-trigger",
  defaultSeverity: "warning",
  description:
    "Description names a domain ('X expert', 'Y specialist') but contains no when-to-route clause. The orchestrator will fall back to keyword matching and may hand the agent off-domain tasks.",
  check(subagent) {
    const desc = subagent.frontmatter.description ?? "";
    if (desc.length < 20) return []; // covered by frontmatter-description-missing
    if (!NARROW_NOUN.test(desc)) return [];
    if (TRIGGER_KEYWORDS.some((re) => re.test(desc))) return [];
    return [{
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message:
        "description names a domain role but never says when to route to this agent. The orchestrator may invoke it for off-domain tasks.",
      fix: 'Add a when-clause: "Use when the user asks for X" or "Invoke after Y happens".',
    }];
  },
};
export default rule;
```

Catches: c-expert, bash-expert, ava-expert, bun-expert, angularjs-expert. Skips: angular-expert ("Use PROACTIVELY"), architect-reviewer ("Use after structural changes"), electron-pro ("Use this agent when ..."). Estimated hit rate: ~25–35 of 97 agents.

### Rank 2: `cross-agent-references-without-task-tool` (P4 — generalization of `unresolved-cross-references`)

Strict superset of the existing rule. Existing pattern catches `@name` and `delegate to`. Add the prose patterns: `Collaborate with X`, `Work with X on Y`, `Coordinate with X`, `Partner with X`, where X is a hyphenated identifier.

```ts
const COLLAB_VERBS = [
  /\b(collaborate|coordinate|partner|sync|engage|consult|align)\s+with\s+([a-z][a-z0-9-]*-[a-z][a-z0-9-]*)/gi,
  /\bwork\s+with\s+([a-z][a-z0-9-]*-[a-z][a-z0-9-]*)\s+(on|for)\b/gi,
  /\bhand(?:s)?\s+off\s+to\s+([a-z][a-z0-9-]*-[a-z][a-z0-9-]*)/gi,
];

// in check:
const hasTask = (subagent.frontmatter.tools ?? []).map((t) => t.toLowerCase()).includes("task");
if (hasTask) return [];
const refs = new Set<string>();
for (const re of COLLAB_VERBS) {
  for (const m of subagent.body.matchAll(re)) refs.add(m[2] ?? m[1]);
}
if (refs.size === 0) return [];
return [{
  ruleId: rule.id,
  severity: "warning",
  message: `body references peer agents (${[...refs].slice(0,3).join(", ")}${refs.size>3?", …":""}) but Task tool is not declared.`,
  fix: "Add `Task` to tools, or remove the integration/collaboration section.",
}];
```

Catches the entire VoltAgent "Integration with other agents" pattern (electron-pro, angular-architect, dotnet-framework-4.8-expert, plus ~15 more agents from the same template). Could either replace or augment `unresolved-cross-references`.

### Rank 3: `stale-pinned-version` (P2)

Scope: framework / library version baked into description or body, where the version is more than 18 months behind. Needs a small lookup table; we already maintain one for Claude models.

```ts
const VERSION_KB: Record<string, { latestMajor: number; flagBelow: number }> = {
  angular: { latestMajor: 19, flagBelow: 16 },     // 18mo at 2026-04
  electron: { latestMajor: 33, flagBelow: 30 },
  react: { latestMajor: 19, flagBelow: 18 },
  next: { latestMajor: 15, flagBelow: 14 },
  node: { latestMajor: 22, flagBelow: 20 },
};

const VERSION_RE = /\b(angular|react|next(?:\.?js)?|electron|node(?:\.?js)?)\s*(\d+)(\+|\.\d+)?/gi;

// in check: scan description + body, look up KB, flag if matched major < flagBelow.
```

Catches: `angular-architect` (Angular 15+), `electron-pro` (Electron 27+), `bash-expert` (Bash 5.x is fine, would not flag), `dotnet-framework-4.8-expert` (would need a separate dotnet entry). Mirrors `stale-model-versions` shape, so implementation should be a 30-minute clone.

---

## Recommendation

Implement in this order:

1. **`description-no-routing-trigger` first** — directly addresses the most damning launch finding (the wolves). Pure regex, zero LLM cost, applies to ~30% of corpus, and produces a clear actionable fix.
2. **`cross-agent-references-without-task-tool` second** — broaden the existing rule to catch the prose-form collaboration claims. Same mechanism, bigger net.
3. **`stale-pinned-version` third** — useful but lower urgency; the KB will need maintenance.

Skip P5 (passive checklist) and P7 (bullet explosion) for now: detection is fuzzy and false-positive risk is real. P3 (vague output) is tempting but would overlap noisily with `undefined-output-shape`; better to tighten that rule's regex than add a new one. P6 (ceremonial JSON) is cosmetic.
