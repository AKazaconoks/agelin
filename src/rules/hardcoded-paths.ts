import type { Rule, Issue, ParsedSubagent } from "../types.js";

/**
 * hardcoded-paths — prose contains user-specific filesystem paths like
 * /home/alice/... or C:\Users\bob\.... These usually leak from local
 * authoring and break for anyone else. Code blocks are exempt — example
 * paths there are intentional. Excludes generic placeholders ("user").
 *
 * Detection runs against PROSE only. Until Unit 1's `ast.prose` lands we
 * strip fenced code blocks inline (` ``` ` and ` ~~~ `).
 *
 * Severity: `suggestion` — the prompt may still work as written, but
 * portability is materially better with a placeholder.
 */

// TODO(integration): replace `stripCodeBlocks(body)` with `subagent.ast.prose`
// once Unit 1's markdown tokenizer lands. We replace code-block contents with
// newlines (rather than deleting them) so match offsets still map back to the
// original line numbers in the unmodified body. We do NOT lowercase here —
// the macOS pattern relies on the uppercase-first-letter convention.
function stripCodeBlocks(body: string): string {
  return body.replace(/(```|~~~)[\s\S]*?\1/g, (block) =>
    block.replace(/[^\n]/g, " "),
  );
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

        // Dedupe per (path, line) so the same path mentioned twice on the
        // same line emits one issue, but multiple distinct lines still each
        // get reported.
        const line = body.slice(0, m.index).split("\n").length;
        const key = `${match}@${line}`;
        if (seen.has(key)) continue;
        seen.add(key);

        issues.push({
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          message: `body references a hardcoded user path '${match}'. This will not work for other users.`,
          line,
          fix: "Use `~`, `$HOME`, `%USERPROFILE%`, or a placeholder like `/home/<user>/` instead.",
        });
      }
    }

    return issues;
  },
};

export default rule;
