import type { Rule, Issue, ParsedSubagent } from "../types.js";

/**
 * Hardcoded user-path detection.
 *
 * Agent prompts that reference a specific user's home directory
 * (`/home/alice/...`, `/Users/Bob/...`, `C:\Users\carol\...`) won't work
 * for any other user — they break portability the moment the agent runs in
 * a different environment. The fix is to use `~`, `$HOME`, `%USERPROFILE%`,
 * or a placeholder like `/home/<user>/`.
 *
 * Detection runs against PROSE only — code blocks legitimately contain
 * absolute example paths and we don't want to flag those. Until Unit 1
 * provides `ast.prose`, we strip fenced code blocks with a regex.
 *
 * Severity: `suggestion` — the prompt may still work as written, but
 * portability is materially better with a placeholder.
 */

// TODO(integration): replace `stripCodeBlocks(body)` with `subagent.ast.prose`
// once Unit 1's markdown tokenizer lands. We do NOT lowercase here because the
// macOS pattern relies on the uppercase-first-letter convention.
function stripCodeBlocks(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");
}

// Segments that signal a documentation placeholder rather than a real
// user path. Compared lowercased.
const PLACEHOLDER_SEGMENTS = new Set([
  "user",
  "username",
  "you",
  "yourname",
  "<user>",
  "<username>",
  "placeholder",
  "name",
]);

interface PathPattern {
  /** regex with one capture group for the username segment (or the whole match for /root/) */
  re: RegExp;
  /** human-readable label */
  label: string;
}

const PATH_PATTERNS: PathPattern[] = [
  // Linux user home: /home/<name>/
  { re: /\/home\/([a-z][a-z0-9_-]*)\//g, label: "Linux user home" },
  // macOS user home: /Users/<Name>/  — name starts uppercase per macOS convention.
  { re: /\/Users\/([A-Z][a-zA-Z0-9_-]*)\//g, label: "macOS user home" },
  // Windows user home: C:\Users\<Name>\
  // Match both single-backslash (\) and the doubled escaped form (\\).
  { re: /[Cc]:\\{1,2}[Uu]sers\\{1,2}([A-Za-z][A-Za-z0-9_-]*)\\{1,2}/g, label: "Windows user home" },
  // /root/ — singular, no segment after, but still hardcoded.
  { re: /\/root\//g, label: "root home" },
];

const rule: Rule = {
  id: "hardcoded-paths",
  defaultSeverity: "suggestion",
  description:
    "Body references a hardcoded user-specific path ('/home/alice/', 'C:\\Users\\bob\\', '/root/'). Use '~', '$HOME', '%USERPROFILE%', or a placeholder.",
  check(subagent: ParsedSubagent): Issue[] {
    const body = subagent.body;
    if (!body) return [];

    const prose = stripCodeBlocks(body);
    const issues: Issue[] = [];
    const seen = new Set<string>();

    for (const { re } of PATH_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(prose)) !== null) {
        const match = m[0];
        const segment = (m[1] ?? "").toLowerCase();

        // /root/ has no segment to whitelist; everything else gets a
        // placeholder check.
        if (segment.length > 0 && PLACEHOLDER_SEGMENTS.has(segment)) continue;

        if (seen.has(match)) continue;
        seen.add(match);

        issues.push({
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          message: `body references a hardcoded user path '${match}'. This will not work for other users.`,
          fix: "Use `~`, `$HOME`, `%USERPROFILE%`, or a placeholder like `/home/<user>/` instead.",
        });
      }
    }

    return issues;
  },
};

export default rule;
