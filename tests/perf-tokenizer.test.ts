/**
 * Performance regression test for the markdown tokenizer + parser pipeline.
 *
 * The promise to users is that `agelin check` stays fast enough to
 * be useful in pre-commit hooks (well under one second on a typical
 * `.claude/agents/` directory). Tokenization is the most expensive
 * per-agent step now that we have an AST. This test enforces a budget so
 * a future refactor that accidentally O(n²)s the tokenizer can't slip
 * through.
 *
 * Budgets are intentionally generous to avoid flake on slow CI hardware.
 * If this test fails on a fast laptop, the regression is real.
 */

import { describe, expect, test } from "bun:test";
import { tokenizeMarkdown } from "../src/parser/markdown.js";

// ~1 KB realistic agent body
const SMALL_BODY = `# Heading 1

This is a paragraph with some text spanning multiple lines.

## Heading 2

- bullet one
- bullet two
- bullet three

\`\`\`typescript
function foo() {
  return 42;
}
\`\`\`

## Heading 3

1. step one
2. step two
3. step three

> a blockquote
> with two lines

Final paragraph.
`;

// Build a ~50 KB body by repeating the small body. Closer to a real
// agent's body length is 5-10 KB; 50 KB is a stress test.
const LARGE_BODY = SMALL_BODY.repeat(50);

describe("perf: tokenizer", () => {
  test("small body (1 KB) tokenizes in under 5ms", () => {
    // Warm the JIT
    tokenizeMarkdown(SMALL_BODY);
    tokenizeMarkdown(SMALL_BODY);
    const start = performance.now();
    for (let i = 0; i < 100; i++) tokenizeMarkdown(SMALL_BODY);
    const elapsed = performance.now() - start;
    const perCall = elapsed / 100;
    // 5ms budget per call; expect <0.5ms in practice
    expect(perCall).toBeLessThan(5);
  });

  test("large body (~50 KB) tokenizes in under 50ms", () => {
    tokenizeMarkdown(LARGE_BODY);
    const start = performance.now();
    tokenizeMarkdown(LARGE_BODY);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  test("100 small bodies (~simulating 100 agents) under 100ms total", () => {
    // Warm
    for (let i = 0; i < 5; i++) tokenizeMarkdown(SMALL_BODY);
    const start = performance.now();
    for (let i = 0; i < 100; i++) tokenizeMarkdown(SMALL_BODY);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  test("output structure is reasonable (sanity, not perf)", () => {
    const ast = tokenizeMarkdown(SMALL_BODY);
    expect(ast.nodes.length).toBeGreaterThan(0);
    expect(ast.codeBlocks.length).toBe(1);
    expect(ast.codeBlocks[0]!.lang).toBe("typescript");
    expect(ast.sections.length).toBeGreaterThanOrEqual(3);
    expect(ast.prose.length).toBeGreaterThan(0);
  });
});
