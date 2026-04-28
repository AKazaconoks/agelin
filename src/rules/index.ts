/**
 * Rule registry. Each rule lives in its own file under src/rules/.
 * Add new rules by importing them here and pushing to ALL_RULES.
 *
 * Rule naming convention: kebab-case, problem-first, e.g.
 *   tool-overreach (not "check-tools-match-description")
 *   no-exit-criteria (not "missing-exit-criteria")
 */

import type { Rule } from "../types.js";

// 20 baseline rules (cycle 0-2)
import toolOverreach from "./tool-overreach.js";
import noExitCriteria from "./no-exit-criteria.js";
import vaguePronouns from "./vague-pronouns.js";
import noNegativeConstraints from "./no-negative-constraints.js";
import injectionVector from "./injection-vector.js";
import costBomb from "./cost-bomb.js";
import rolePlayBloat from "./role-play-bloat.js";
import promptTooLong from "./prompt-too-long.js";
import promptTooShort from "./prompt-too-short.js";
import noExamples from "./no-examples.js";
import frontmatterNameMismatch from "./frontmatter-name-mismatch.js";
import frontmatterDescriptionMissing from "./frontmatter-description-missing.js";
import unknownTool from "./unknown-tool.js";
import descriptionTooVague from "./description-too-vague.js";
import toolsAsStringNotArray from "./tools-as-string-not-array.js";
import unboundedRetry from "./unbounded-retry.js";
import verbosityEncouraged from "./verbosity-encouraged.js";
import noVerificationStep from "./no-verification-step.js";
import descriptionUsesCliche from "./description-uses-cliche.js";
import toolListTooBroad from "./tool-list-too-broad.js";

// 12 context-aware rules added by the cycle-2 batch (Units 2-8)
import toolBodyMismatch from "./tool-body-mismatch.js";
import contradictoryRoleCapability from "./contradictory-role-capability.js";
import undefinedOutputShape from "./undefined-output-shape.js";
import missingInputPreconditions from "./missing-input-preconditions.js";
import unresolvedCrossReferences from "./unresolved-cross-references.js";
import codeBlockNoLanguage from "./code-block-no-language.js";
import malformedList from "./malformed-list.js";
import hardcodedPaths from "./hardcoded-paths.js";
import staleModelVersions from "./stale-model-versions.js";
import descriptionUsesExamplesInsteadOfSummary from "./description-uses-examples-instead-of-summary.js";
import vagueCompletionCriteria from "./vague-completion-criteria.js";
import hiddenTutorial from "./hidden-tutorial.js";

// 2 cycle-5+ rules from rule-gap audit (calibration/rule-gaps-audit.md).
// These target patterns that wild agents exhibit but the prior 32 missed:
//   - description-no-routing-trigger: the "wolf" pattern (high-static, low-bench)
//   - stale-pinned-version: framework majors baked into prompts that age out
import descriptionNoRoutingTrigger from "./description-no-routing-trigger.js";
import stalePinnedVersion from "./stale-pinned-version.js";

export const ALL_RULES: Rule[] = [
  toolOverreach,
  noExitCriteria,
  vaguePronouns,
  noNegativeConstraints,
  injectionVector,
  costBomb,
  rolePlayBloat,
  promptTooLong,
  promptTooShort,
  noExamples,
  frontmatterNameMismatch,
  frontmatterDescriptionMissing,
  unknownTool,
  descriptionTooVague,
  toolsAsStringNotArray,
  unboundedRetry,
  verbosityEncouraged,
  noVerificationStep,
  descriptionUsesCliche,
  toolListTooBroad,
  toolBodyMismatch,
  contradictoryRoleCapability,
  undefinedOutputShape,
  missingInputPreconditions,
  unresolvedCrossReferences,
  codeBlockNoLanguage,
  malformedList,
  hardcodedPaths,
  staleModelVersions,
  descriptionUsesExamplesInsteadOfSummary,
  vagueCompletionCriteria,
  hiddenTutorial,
  descriptionNoRoutingTrigger,
  stalePinnedVersion,
];

export function getRule(id: string): Rule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}
