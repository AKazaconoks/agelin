import { describe, expect, test } from "bun:test";
import { tokenizeMarkdown } from "../src/parser/markdown.js";

describe("tokenizeMarkdown — block kinds", () => {
  test("empty body yields no nodes", () => {
    const ast = tokenizeMarkdown("");
    expect(ast.nodes).toHaveLength(1); // single blank line
    expect(ast.sections).toHaveLength(0);
    expect(ast.codeBlocks).toHaveLength(0);
    expect(ast.prose).toBe("");
  });

  test("recognizes ATX headings at all six levels", () => {
    const md = "# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6";
    const ast = tokenizeMarkdown(md);
    const headings = ast.nodes.filter((n) => n.kind === "heading");
    expect(headings).toHaveLength(6);
    expect(headings.map((h) => (h.kind === "heading" ? h.level : 0))).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(headings[0]).toMatchObject({ kind: "heading", level: 1, text: "h1", line: 1 });
  });

  test("strips trailing # in closed-style ATX headings", () => {
    const ast = tokenizeMarkdown("## hello ##");
    const h = ast.nodes.find((n) => n.kind === "heading");
    expect(h?.kind === "heading" && h.text).toBe("hello");
  });

  test("groups consecutive non-block lines into a single paragraph", () => {
    const md = "line one\nline two\nline three";
    const ast = tokenizeMarkdown(md);
    const paras = ast.nodes.filter((n) => n.kind === "paragraph");
    expect(paras).toHaveLength(1);
    expect(paras[0]).toMatchObject({
      kind: "paragraph",
      text: "line one\nline two\nline three",
      line: 1,
    });
  });

  test("blank line separates paragraphs", () => {
    const md = "first para\n\nsecond para";
    const ast = tokenizeMarkdown(md);
    const paras = ast.nodes.filter((n) => n.kind === "paragraph");
    expect(paras).toHaveLength(2);
    expect(paras[0].kind === "paragraph" && paras[0].text).toBe("first para");
    expect(paras[1].kind === "paragraph" && paras[1].text).toBe("second para");
  });

  test("recognizes fenced code blocks with language tag", () => {
    const md = "intro\n\n```ts\nconst x = 1;\n```\n\noutro";
    const ast = tokenizeMarkdown(md);
    expect(ast.codeBlocks).toHaveLength(1);
    expect(ast.codeBlocks[0]).toMatchObject({
      kind: "code-block",
      lang: "ts",
      content: "const x = 1;",
      fence: "```",
    });
    // prose excludes the code block content.
    expect(ast.prose).not.toContain("const x = 1");
    expect(ast.prose).toContain("intro");
    expect(ast.prose).toContain("outro");
  });

  test("recognizes fenced code blocks without language tag (lang = null)", () => {
    const md = "```\nplain\n```";
    const ast = tokenizeMarkdown(md);
    expect(ast.codeBlocks[0]).toMatchObject({ lang: null, content: "plain" });
  });

  test("recognizes ~~~ tilde fences", () => {
    const md = "~~~py\nprint('hi')\n~~~";
    const ast = tokenizeMarkdown(md);
    expect(ast.codeBlocks[0]).toMatchObject({ fence: "~~~", lang: "py" });
  });

  test("does not close ``` fence on ~~~ line and vice versa", () => {
    const md = "```\n~~~ not a fence ~~~\nstill in code\n```\nafter";
    const ast = tokenizeMarkdown(md);
    expect(ast.codeBlocks).toHaveLength(1);
    expect(ast.codeBlocks[0].kind === "code-block" && ast.codeBlocks[0].content).toContain(
      "still in code",
    );
  });

  test("recognizes ordered list items with index + indent", () => {
    const md = "1. first\n2. second\n  3. nested";
    const ast = tokenizeMarkdown(md);
    const items = ast.nodes.filter((n) => n.kind === "list-item");
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ ordered: true, index: 1, indent: 0, text: "first" });
    expect(items[1]).toMatchObject({ ordered: true, index: 2, indent: 0, text: "second" });
    expect(items[2]).toMatchObject({ ordered: true, index: 3, indent: 2, text: "nested" });
  });

  test("recognizes unordered list items with each marker variant", () => {
    const md = "- dash\n* star\n+ plus";
    const ast = tokenizeMarkdown(md);
    const items = ast.nodes.filter((n) => n.kind === "list-item");
    expect(items).toHaveLength(3);
    expect(items.map((it) => (it.kind === "list-item" ? it.marker : "?"))).toEqual([
      "-",
      "*",
      "+",
    ]);
    items.forEach((it) => {
      if (it.kind === "list-item") expect(it.ordered).toBe(false);
    });
  });

  test("recognizes blockquotes and horizontal rules", () => {
    const md = "> quoted line\n\n---\n\nafter";
    const ast = tokenizeMarkdown(md);
    expect(ast.nodes.some((n) => n.kind === "blockquote")).toBe(true);
    expect(ast.nodes.some((n) => n.kind === "hr")).toBe(true);
  });
});

describe("tokenizeMarkdown — sections", () => {
  test("each heading owns the body until the next heading", () => {
    const md = [
      "# Intro",
      "intro para",
      "",
      "## Inputs",
      "you receive a path",
      "",
      "## Output",
      "return JSON",
    ].join("\n");
    const ast = tokenizeMarkdown(md);
    expect(ast.sections).toHaveLength(3);
    expect(ast.sections[0].heading.text).toBe("Intro");
    expect(ast.sections[1].heading.text).toBe("Inputs");
    expect(ast.sections[2].heading.text).toBe("Output");

    const inputsBody = ast.sections[1].body
      .filter((n) => n.kind === "paragraph")
      .map((n) => (n.kind === "paragraph" ? n.text : ""));
    expect(inputsBody).toEqual(["you receive a path"]);
  });

  test("nodes before any heading are not part of any section", () => {
    const md = "before heading\n\n# H\nafter";
    const ast = tokenizeMarkdown(md);
    expect(ast.sections).toHaveLength(1);
    expect(ast.sections[0].heading.text).toBe("H");
  });
});

describe("tokenizeMarkdown — prose", () => {
  test("prose excludes code-block content", () => {
    const md = "talk about secrets\n\n```\nrm -rf /\n```\nmore talk";
    const ast = tokenizeMarkdown(md);
    expect(ast.prose).toContain("talk about secrets");
    expect(ast.prose).toContain("more talk");
    expect(ast.prose).not.toContain("rm -rf");
  });

  test("prose is lowercased", () => {
    const md = "# UPPERCASE Heading\n\nALSO LOUD";
    const ast = tokenizeMarkdown(md);
    expect(ast.prose).toBe("uppercase heading\nalso loud");
  });

  test("prose includes list-item text", () => {
    const md = "- alpha\n- beta";
    const ast = tokenizeMarkdown(md);
    expect(ast.prose).toContain("alpha");
    expect(ast.prose).toContain("beta");
  });
});

describe("tokenizeMarkdown — line numbers + edge cases", () => {
  test("line numbers are 1-indexed and accurate after blank lines", () => {
    const md = "\n\n# H";
    const ast = tokenizeMarkdown(md);
    const heading = ast.nodes.find((n) => n.kind === "heading");
    expect(heading?.line).toBe(3);
  });

  test("CRLF line endings are normalized", () => {
    const md = "line one\r\nline two\r\n";
    const ast = tokenizeMarkdown(md);
    const para = ast.nodes.find((n) => n.kind === "paragraph");
    expect(para?.kind === "paragraph" && para.text).toBe("line one\nline two");
  });

  test("unterminated code fence consumes remainder without crashing", () => {
    const md = "```ts\nconst x = 1;\nstill open";
    const ast = tokenizeMarkdown(md);
    expect(ast.codeBlocks).toHaveLength(1);
    expect(ast.codeBlocks[0].kind === "code-block" && ast.codeBlocks[0].content).toContain(
      "still open",
    );
  });
});
