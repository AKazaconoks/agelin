/**
 * description-no-routing-trigger
 *
 * Flags an agent whose `description` names a domain role ("X expert",
 * "Y specialist", "Z architect") but contains no when-to-route clause.
 *
 * Background — the "wolf" pattern. Cycle 5's launch analysis surfaced a
 * cluster of agents (`c-expert`, `bash-expert`, `ava-expert`, `bun-expert`,
 * `angularjs-expert`) that score high on static rules but low on bench:
 * the orchestrator hands them tasks they shouldn't accept. Inspection
 * revealed a shared structural feature: their description is pure
 * self-description ("I AM the C expert") with no positive routing trigger
 * ("Use when the user asks for X"). The orchestrator falls back to
 * keyword matching and pulls them in for off-domain work.
 *
 * Compare with `angular-expert` ("Use PROACTIVELY for Angular …") or
 * `architect-reviewer` ("Use after structural changes …") — these
 * descriptions tell the orchestrator *when* to route, and they bench well.
 *
 * Severity: warning. Hits ~25-35% of public corpora; high signal.
 */

import type { Rule, Issue, ParsedSubagent } from "../types.js";

// Verbs/markers that strongly indicate a routing trigger. The agent is
// telling the orchestrator under what circumstances it should be invoked.
const TRIGGER_KEYWORDS: RegExp[] = [
  /\buse\s+(?:when|after|before|for|in|whenever|if|on|during)\b/i,
  /\binvoke\s+(?:when|for|on|after|before)\b/i,
  /\b(?:route|routing)\b/i,
  /\bproactively\b/i,
  /\btrigger(?:ed)?\s+(?:when|by|on|after)\b/i,
  /\bcall(?:ed)?\s+(?:when|for|on|after|before)\b/i,
  /\bautomatically\s+(?:invoked?|triggered?|called?|used?)\b/i,
  /\bask(?:s)?\s+(?:to|for)\b/i,
  /\b(?:after|when|before|whenever)\s+(?:the\s+user|you|a\s+user)\b/i,
  // Catch the common "Use this agent ..." preamble even without a when-token.
  /\buse\s+this\s+(?:agent|subagent)\b/i,
];

// Role nouns that indicate self-description. If a description contains
// one of these and no trigger keyword, the agent is an identity card
// not a routing card.
const NARROW_ROLE_NOUN =
  /\b(?:expert|specialist|master|guru|wizard|architect|developer|engineer|professional|pro)\b/i;

// "Expertise in X" / "Specializing in X" / "Mastery of X" — same shape:
// an identity claim with no when-clause. Catches phrasings that sidestep
// the role-noun regex (e.g. "Expertise in Bun, focusing on …").
const NOMINAL_IDENTITY =
  /\b(?:expertise\s+in|specializing\s+in|specialization\s+in|mastery\s+of)\b/i;

const rule: Rule = {
  id: "description-no-routing-trigger",
  defaultSeverity: "warning",
  description:
    "Description names a domain role ('X expert', 'Y specialist') but contains no when-to-route clause. The orchestrator may invoke this agent for off-domain tasks.",
  check(subagent: ParsedSubagent): Issue[] {
    const desc = (subagent.frontmatter?.description ?? "").trim();
    // Sufficiently short / missing descriptions are flagged by other rules
    // (`frontmatter-description-missing`, `description-too-vague`).
    if (desc.length < 20) return [];

    const isIdentityCard = NARROW_ROLE_NOUN.test(desc) || NOMINAL_IDENTITY.test(desc);
    if (!isIdentityCard) return [];
    if (TRIGGER_KEYWORDS.some((re) => re.test(desc))) return [];

    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          "description names a domain role but never says when to route to this agent. The orchestrator may match it to off-domain tasks via keyword overlap.",
        fix: 'Add a when-clause, e.g. "Use when the user asks for X", "Invoke after Y happens", or "Use PROACTIVELY for Z".',
      },
    ];
  },
};

export default rule;
