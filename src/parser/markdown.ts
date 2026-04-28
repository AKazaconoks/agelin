/**
 * Tiny line-by-line markdown tokenizer.
 *
 * Goals:
 *   - Recognize block-level structures rules need: headings, code blocks (with
 *     fence + lang tag), list items (ordered + unordered, with index + indent),
 *     blockquotes, horizontal rules, paragraphs.
 *   - Build a `prose` string excluding code blocks so keyword rules don't
 *     match against shell snippets.
 *   - Build a `sections` view (heading -> following body until next heading)
 *     so rules can ask "is there an Output section?".
 *
 * Non-goals:
 *   - CommonMark conformance. Inline markup (emphasis, links, images, code
 *     spans) is preserved as raw text.
 *   - Setext headings (=== / ---) — vanishingly rare in subagent prompts.
 *   - Tables. Rules don't need them yet.
 *
 * The tokenizer is pure, deterministic, and runs in roughly O(lines).
 */

export type MdNode =
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string; line: number }
  | { kind: "paragraph"; text: string; line: number }
  | {
      kind: "code-block";
      lang: string | null;
      content: string;
      line: number;
      fence: "```" | "~~~";
    }
  | {
      kind: "list-item";
      ordered: boolean;
      marker: string;
      text: string;
      indent: number;
      index: number | null;
      line: number;
    }
  | { kind: "blockquote"; text: string; line: number }
  | { kind: "hr"; line: number }
  | { kind: "blank"; line: number };

export interface MarkdownAST {
  nodes: MdNode[];
  sections: { heading: MdNode & { kind: "heading" }; body: MdNode[] }[];
  codeBlocks: (MdNode & { kind: "code-block" })[];
  /** prose text outside code blocks, lowercased. paragraphs + headings + list items, joined with \n. */
  prose: string;
}

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE_RE = /^(\s*)(```|~~~)\s*([^\s`~]*)\s*$/;
const HR_RE = /^\s{0,3}([-_*])(\s*\1){2,}\s*$/;
const BLOCKQUOTE_RE = /^\s{0,3}>\s?(.*)$/;
const ORDERED_LIST_RE = /^(\s*)(\d{1,9})([.)])\s+(.*)$/;
const UNORDERED_LIST_RE = /^(\s*)([-*+])\s+(.*)$/;

export function tokenizeMarkdown(body: string): MarkdownAST {
  // Normalize line endings; keep \n splits cheap.
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const nodes: MdNode[] = [];

  // Buffered paragraph state: consecutive non-block lines coalesce.
  let paraBuf: string[] = [];
  let paraStart = 0;

  function flushParagraph(): void {
    if (paraBuf.length === 0) return;
    const text = paraBuf.join("\n").trim();
    if (text.length > 0) {
      nodes.push({ kind: "paragraph", text, line: paraStart });
    }
    paraBuf = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i] ?? "";

    // Code-fence start? Consume until closing fence.
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      flushParagraph();
      const fence = fenceMatch[2] as "```" | "~~~";
      const lang = fenceMatch[3] && fenceMatch[3].length > 0 ? fenceMatch[3] : null;
      const startLine = lineNum;
      const content: string[] = [];
      i++;
      while (i < lines.length) {
        const inner = lines[i] ?? "";
        const close = inner.match(FENCE_RE);
        if (close && close[2] === fence) {
          break;
        }
        content.push(inner);
        i++;
      }
      // i is now on the closing fence (or past end). Loop will advance to next line.
      nodes.push({
        kind: "code-block",
        lang,
        content: content.join("\n"),
        line: startLine,
        fence,
      });
      continue;
    }

    // Blank line — flush paragraph, record blank.
    if (line.trim() === "") {
      flushParagraph();
      nodes.push({ kind: "blank", line: lineNum });
      continue;
    }

    // Horizontal rule.
    if (HR_RE.test(line)) {
      flushParagraph();
      nodes.push({ kind: "hr", line: lineNum });
      continue;
    }

    // Heading.
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = (headingMatch[2] ?? "").trim();
      nodes.push({ kind: "heading", level, text, line: lineNum });
      continue;
    }

    // Blockquote.
    const bqMatch = line.match(BLOCKQUOTE_RE);
    if (bqMatch) {
      flushParagraph();
      nodes.push({ kind: "blockquote", text: bqMatch[1] ?? "", line: lineNum });
      continue;
    }

    // Ordered list item.
    const olMatch = line.match(ORDERED_LIST_RE);
    if (olMatch) {
      flushParagraph();
      const indexNum = Number.parseInt(olMatch[2] ?? "", 10);
      nodes.push({
        kind: "list-item",
        ordered: true,
        marker: `${olMatch[2]}${olMatch[3]}`,
        text: (olMatch[4] ?? "").trim(),
        indent: (olMatch[1] ?? "").length,
        index: Number.isFinite(indexNum) ? indexNum : null,
        line: lineNum,
      });
      continue;
    }

    // Unordered list item.
    const ulMatch = line.match(UNORDERED_LIST_RE);
    if (ulMatch) {
      flushParagraph();
      nodes.push({
        kind: "list-item",
        ordered: false,
        marker: ulMatch[2] ?? "-",
        text: (ulMatch[3] ?? "").trim(),
        indent: (ulMatch[1] ?? "").length,
        index: null,
        line: lineNum,
      });
      continue;
    }

    // Otherwise: part of a paragraph.
    if (paraBuf.length === 0) paraStart = lineNum;
    paraBuf.push(line);
  }
  flushParagraph();

  // Group sections: each heading owns the nodes between it and the next heading.
  const sections: { heading: MdNode & { kind: "heading" }; body: MdNode[] }[] = [];
  let currentHeading: (MdNode & { kind: "heading" }) | null = null;
  let currentBody: MdNode[] = [];
  for (const n of nodes) {
    if (n.kind === "heading") {
      if (currentHeading) {
        sections.push({ heading: currentHeading, body: currentBody });
      }
      currentHeading = n;
      currentBody = [];
    } else if (currentHeading) {
      currentBody.push(n);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, body: currentBody });
  }

  const codeBlocks = nodes.filter(
    (n): n is MdNode & { kind: "code-block" } => n.kind === "code-block",
  );

  // Prose: text from every non-code node, joined with \n, lowercased.
  // Code blocks are deliberately excluded so keyword scans don't match shell.
  const PROSE_KINDS = new Set(["paragraph", "heading", "list-item", "blockquote"]);
  const prose = nodes
    .filter((n) => PROSE_KINDS.has(n.kind))
    .map((n) => ("text" in n ? n.text : ""))
    .join("\n")
    .toLowerCase();

  return { nodes, sections, codeBlocks, prose };
}
