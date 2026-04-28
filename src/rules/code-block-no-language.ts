import type { Rule, Issue, ParsedSubagent } from "../types.js";

/**
 * Code blocks without a language tag don't get syntax-highlighting in
 * editors/renderers, and tools that extract executable snippets (docs
 * generators, snippet harvesters, agent runners that pre-parse code blocks)
 * can't tell what dialect the content is. The fix is one token long:
 * append the language to the opening fence.
 *
 * We only flag blocks with three or more content lines so we don't pester
 * agents that drop in a one-line shell command or a small ASCII diagram.
 *
 * Severity is `suggestion`. Missing language tags are a hygiene issue, not
 * a correctness bug.
 *
 * TODO(integration): once Unit 1 lands, replace `parseCodeBlocks` with
 * `subagent.ast?.codeBlocks` and drop the inline tokenizer.
 */

interface InlineCodeBlock {
  lang: string | null;
  contentLineCount: number;
  line: number;
}

/**
 * Inline fallback tokenizer for fenced code blocks. Tracks line numbers,
 * mirrors the subset of `tokenizeMarkdown` semantics this rule needs:
 * a fence opens with ``` or ~~~ optionally followed by a language token
 * and closes with the same fence character on its own line.
 */
function parseCodeBlocks(body: string): InlineCodeBlock[] {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const fenceRe = /^(\s*)(```|~~~)\s*([^\s`~]*)\s*$/;
  const blocks: InlineCodeBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const open = line.match(fenceRe);
    if (!open) {
      i++;
      continue;
    }
    const fence = open[2];
    const lang = open[3] && open[3].length > 0 ? open[3] : null;
    const startLine = i + 1;
    let contentLineCount = 0;
    i++;
    while (i < lines.length) {
      const inner = lines[i] ?? "";
      const close = inner.match(fenceRe);
      if (close && close[2] === fence) {
        i++;
        break;
      }
      contentLineCount++;
      i++;
    }
    blocks.push({ lang, contentLineCount, line: startLine });
  }
  return blocks;
}

const rule: Rule = {
  id: "code-block-no-language",
  defaultSeverity: "suggestion",
  description:
    "Fenced code block has no language tag. Syntax highlighting won't render and tools can't extract the language.",
  check(subagent: ParsedSubagent): Issue[] {
    const body = subagent.body;
    if (!body) return [];

    // TODO(integration): prefer `subagent.ast?.codeBlocks` once Unit 1 lands.
    const blocks = parseCodeBlocks(body);

    const issues: Issue[] = [];
    for (const block of blocks) {
      if (block.lang) continue;
      // Skip ASCII-art / one-liners: only flag blocks with real content.
      if (block.contentLineCount < 3) continue;
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `code block at line ${block.line} has no language tag. Syntax highlighting won't render and tools can't extract the language.`,
        line: block.line,
        fix: 'Add a language after the opening fence, e.g. "```python", "```typescript", "```bash", or "```text" if no real language applies.',
      });
    }
    return issues;
  },
};

export default rule;
