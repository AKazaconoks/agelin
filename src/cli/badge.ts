/**
 * `agelin badge` — emit a shields.io-compatible SVG badge to stdout.
 *
 * Layout:
 *   [ agelin | <score>/100 ]
 *
 * Left side: gray (#555).
 * Right side: green / yellow / red depending on score band.
 *   - score >= 80   green  (#4c1)
 *   - score 50..79  yellow (#dfb317)
 *   - score <  50   red    (#e05d44)
 *
 * Width is estimated from character counts (no fontmetrics dep). The values
 * are tuned to look right with the default shields.io 11px Verdana — match
 * within ~3px which is fine for the sub-pixel-ish hinting shields uses too.
 *
 * Usage:
 *   agelin badge --score=87 --agent=python-pro > badge.svg
 */

export interface BadgeOptions {
  /** Score 0-100. Required. */
  score: number;
  /** Agent name. Embedded in the SVG title for accessibility; not currently
   *  shown in the badge body (shields.io convention is left-label = tool name). */
  agentName?: string;
  /** Reserved: future formats (json/png). Default "svg". */
  format?: string;
}

const LEFT_LABEL = "agelin";
const LEFT_COLOR = "#555";
const PAD_X = 6;
const FONT_SIZE = 11;
const HEIGHT = 20;

/**
 * Pure function: compose the SVG string for the given options. Exported for
 * tests and the future site builder.
 */
export function renderBadgeSvg(opts: BadgeOptions): string {
  const score = clamp(opts.score, 0, 100);
  const right = `${formatScore(score)}/100`;
  const rightColor = colorForScore(score);

  const leftTextWidth = estimateTextWidth(LEFT_LABEL);
  const rightTextWidth = estimateTextWidth(right);
  const leftWidth = leftTextWidth + 2 * PAD_X;
  const rightWidth = rightTextWidth + 2 * PAD_X;
  const totalWidth = leftWidth + rightWidth;

  const leftTextX = (leftWidth / 2) * 10;
  const rightTextX = (leftWidth + rightWidth / 2) * 10;
  const leftTextLength = leftTextWidth * 10;
  const rightTextLength = rightTextWidth * 10;

  const title = opts.agentName
    ? `${opts.agentName}: agelin ${formatScore(score)}/100`
    : `agelin ${formatScore(score)}/100`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${HEIGHT}" role="img" aria-label="${escapeXml(title)}">`,
    `  <title>${escapeXml(title)}</title>`,
    `  <linearGradient id="s" x2="0" y2="100%">`,
    `    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>`,
    `    <stop offset="1" stop-opacity=".1"/>`,
    `  </linearGradient>`,
    `  <clipPath id="r">`,
    `    <rect width="${totalWidth}" height="${HEIGHT}" rx="3" fill="#fff"/>`,
    `  </clipPath>`,
    `  <g clip-path="url(#r)">`,
    `    <rect width="${leftWidth}" height="${HEIGHT}" fill="${LEFT_COLOR}"/>`,
    `    <rect x="${leftWidth}" width="${rightWidth}" height="${HEIGHT}" fill="${rightColor}"/>`,
    `    <rect width="${totalWidth}" height="${HEIGHT}" fill="url(#s)"/>`,
    `  </g>`,
    `  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">`,
    `    <text aria-hidden="true" x="${leftTextX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${leftTextLength}">${escapeXml(LEFT_LABEL)}</text>`,
    `    <text x="${leftTextX}" y="140" transform="scale(.1)" fill="#fff" textLength="${leftTextLength}">${escapeXml(LEFT_LABEL)}</text>`,
    `    <text aria-hidden="true" x="${rightTextX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${rightTextLength}">${escapeXml(right)}</text>`,
    `    <text x="${rightTextX}" y="140" transform="scale(.1)" fill="#fff" textLength="${rightTextLength}">${escapeXml(right)}</text>`,
    `  </g>`,
    `</svg>`,
    "",
  ].join("\n");
}

export async function runBadge(opts: BadgeOptions): Promise<void> {
  if (!Number.isFinite(opts.score)) {
    console.error("badge: --score must be a number 0-100");
    process.exit(1);
  }
  const fmt = (opts.format ?? "svg").toLowerCase();
  if (fmt !== "svg") {
    console.error(`badge: unsupported format "${fmt}" (only "svg" is implemented)`);
    process.exit(1);
  }
  const svg = renderBadgeSvg(opts);
  process.stdout.write(svg);
}

// ---------------------------------------------------------------------------
// Width estimation
//
// shields.io uses a precomputed Verdana 11px width table. We don't have that
// luxury without a dep, so we approximate: average glyph ~7px, with the usual
// suspects (m/w wider, i/l narrower, digits and slash a bit wider than spaces).
// Tested against shields.io rendering — the badges land within a few pixels.

function estimateTextWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    w += charWidth(ch);
  }
  return Math.max(w, 1);
}

function charWidth(ch: string): number {
  if (/[mwMW]/.test(ch)) return 9;
  if (/[ilIjt!.,;: ]/.test(ch)) return 4;
  if (/[A-Z]/.test(ch)) return 8;
  if (/[0-9]/.test(ch)) return 7;
  if (/[\/\-]/.test(ch)) return 5;
  return 6;
}

// ---------------------------------------------------------------------------

function colorForScore(score: number): string {
  if (score >= 80) return "#4c1";
  if (score >= 50) return "#dfb317";
  return "#e05d44";
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function formatScore(score: number): string {
  // Whole-number display, but allow .5 if the input clearly carries it.
  if (Number.isInteger(score)) return String(score);
  return score.toFixed(1);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
