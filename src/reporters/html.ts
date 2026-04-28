/**
 * HTML reporter — renders ReportContext as a single self-contained file.
 *
 * Design goals:
 *   - One file, no external assets. Drop on a static host or attach to an
 *     issue and it Just Works.
 *   - Sortable rank/score/name columns. Click a header to toggle sort.
 *   - One expandable detail panel per agent (vanilla JS, no framework).
 *   - Score cells colour-coded green/yellow/red.
 *   - Links back to source files when `agentPath` looks like a URL.
 *
 * The HTML is intentionally hand-rolled rather than templated: keeping it
 * inline makes the output diffable and inspectable without extra deps.
 */

import type {
  AgentScore,
  Issue,
  ReportContext,
  Reporter,
  RunResult,
} from "../types.js";

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attr(s: string): string {
  return esc(s);
}

// ---------------------------------------------------------------------------
// Score colour bands
// ---------------------------------------------------------------------------

function scoreBand(score: number): "good" | "warn" | "bad" {
  if (score >= 75) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

// ---------------------------------------------------------------------------
// Source path -> display + (optional) hyperlink
// ---------------------------------------------------------------------------

interface SourceLink {
  display: string;
  href?: string;
}

function sourceLink(agentPath: string): SourceLink {
  if (/^https?:\/\//i.test(agentPath)) {
    let display = agentPath;
    try {
      const u = new URL(agentPath);
      // For github.com, show owner/repo/.../filename
      if (u.host === "github.com") {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          display = `${parts[0]}/${parts[1]}/.../${parts[parts.length - 1]}`;
        }
      } else {
        display = `${u.host}${u.pathname}`;
      }
    } catch {
      // ignore — fall through to raw string
    }
    return { display, href: agentPath };
  }
  // Local path. Try to extract a repo-ish slug if we recognise targets/<slug>/file.md
  const m = /[\\/]targets[\\/]([^\\/]+)[\\/]([^\\/]+)$/.exec(agentPath);
  if (m) {
    return { display: `${m[1].replace("__", "/")} :: ${m[2]}` };
  }
  return { display: agentPath };
}

// ---------------------------------------------------------------------------
// Top issues summary for the table column
// ---------------------------------------------------------------------------

function topIssues(issues: Issue[]): string {
  if (issues.length === 0) return "<span class=\"muted\">none</span>";
  const order: Record<string, number> = {
    error: 0,
    warning: 1,
    suggestion: 2,
  };
  const sorted = [...issues].sort(
    (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3),
  );
  const top = sorted.slice(0, 3);
  return top
    .map(
      (i) =>
        `<span class="issue sev-${attr(i.severity)}" title="${attr(i.message)}">${esc(i.ruleId)}</span>`,
    )
    .join(" ");
}

// ---------------------------------------------------------------------------
// Detail panels
// ---------------------------------------------------------------------------

function renderIssue(i: Issue): string {
  const lineSuffix = i.line ? ` <span class="muted">L${i.line}</span>` : "";
  return `<li class="sev-${attr(i.severity)}">
    <span class="issue sev-${attr(i.severity)}">${esc(i.ruleId)}</span>
    ${esc(i.message)}${lineSuffix}
    ${i.fix ? `<div class="fix">fix: ${esc(i.fix)}</div>` : ""}
  </li>`;
}

function renderRun(r: RunResult): string {
  const tools = r.toolCalls
    .map((t) => `${esc(t.tool)}=${t.count}`)
    .join(", ");
  const reason = r.failureReason
    ? `<div class="muted">reason: ${esc(r.failureReason)}</div>`
    : "";
  return `<tr class="${r.success ? "ok" : "fail"}">
    <td>${esc(r.taskId)}</td>
    <td>${r.success ? "pass" : "fail"}</td>
    <td>${r.durationMs} ms</td>
    <td>$${r.costUsd.toFixed(4)}</td>
    <td>${r.inputTokens} / ${r.outputTokens}</td>
    <td>${esc(tools || "-")}</td>
    <td>${reason}</td>
  </tr>`;
}

function renderDetail(score: AgentScore, idx: number): string {
  const issuesHtml =
    score.staticIssues.length === 0
      ? "<p class=\"muted\">No static issues.</p>"
      : `<ul class="issue-list">${score.staticIssues.map(renderIssue).join("")}</ul>`;

  const benchHtml =
    !score.benchResults || score.benchResults.length === 0
      ? "<p class=\"muted\">No benchmark runs (try `agelin bench`).</p>"
      : `<table class="bench-table">
        <thead>
          <tr>
            <th>task</th><th>result</th><th>duration</th>
            <th>cost</th><th>tokens (in/out)</th><th>tools</th><th>notes</th>
          </tr>
        </thead>
        <tbody>${score.benchResults.map(renderRun).join("")}</tbody>
      </table>`;

  const link = sourceLink(score.agentPath);

  return `<tr class="detail-row" id="detail-${idx}" hidden>
    <td colspan="6">
      <div class="detail-body">
        <div class="detail-header">
          <strong>${esc(score.agentName)}</strong>
          <span class="muted">${
            link.href
              ? `<a href="${attr(link.href)}" target="_blank" rel="noopener noreferrer">${esc(link.display)}</a>`
              : esc(link.display)
          }</span>
        </div>
        <div class="components">
          <span class="comp">static <b>${score.components.staticHealth.toFixed(0)}</b></span>
          <span class="comp">success <b>${score.components.successRate.toFixed(0)}</b></span>
          <span class="comp">cost-eff <b>${score.components.costEfficiency.toFixed(0)}</b></span>
          <span class="comp">consistency <b>${score.components.consistency.toFixed(0)}</b></span>
        </div>
        <h4>Static issues</h4>
        ${issuesHtml}
        <h4>Benchmark runs</h4>
        ${benchHtml}
      </div>
    </td>
  </tr>`;
}

// ---------------------------------------------------------------------------
// CSS — compact, modern, no framework
// ---------------------------------------------------------------------------

const CSS = `
:root {
  --bg: #fafafa;
  --fg: #1a1a1a;
  --muted: #666;
  --border: #e0e0e0;
  --good: #1d7a3a;
  --good-bg: #e6f4ea;
  --warn: #8a6d00;
  --warn-bg: #fff5cc;
  --bad: #b3261e;
  --bad-bg: #fde7e6;
  --accent: #2563eb;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
  color: var(--fg);
  background: var(--bg);
}
header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
header h1 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.01em;
}
header .logo {
  display: inline-block;
  width: 28px;
  height: 28px;
  margin-right: 10px;
  border-radius: 6px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  vertical-align: middle;
}
header .meta {
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
main { padding: 24px 32px; max-width: 1200px; }
.summary {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  color: var(--muted);
  font-size: 13px;
}
table.results {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}
table.results th,
table.results td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
table.results th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
}
table.results th .arrow { font-size: 10px; opacity: 0.4; margin-left: 4px; }
table.results th.sorted .arrow { opacity: 1; }
table.results tbody tr.row { cursor: pointer; }
table.results tbody tr.row:hover { background: #f9f9f9; }
table.results tbody tr.row.open { background: #f0f4ff; }
.score {
  display: inline-block;
  min-width: 44px;
  text-align: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.score.good { color: var(--good); background: var(--good-bg); }
.score.warn { color: var(--warn); background: var(--warn-bg); }
.score.bad  { color: var(--bad);  background: var(--bad-bg); }
.muted { color: var(--muted); }
.issue {
  display: inline-block;
  padding: 1px 6px;
  margin: 1px 1px;
  border-radius: 3px;
  font-size: 11px;
  font-family: "SF Mono", Menlo, Consolas, monospace;
}
.issue.sev-error { background: var(--bad-bg); color: var(--bad); }
.issue.sev-warning { background: var(--warn-bg); color: var(--warn); }
.issue.sev-suggestion { background: #eef; color: #335; }
.detail-body {
  padding: 18px 22px;
  background: #fff;
  border-top: 2px solid var(--accent);
}
.detail-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}
.detail-body h4 {
  margin: 16px 0 6px;
  font-size: 13px;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.05em;
}
.components {
  display: flex;
  gap: 12px;
  margin: 8px 0 4px;
}
.components .comp {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #f5f5f5;
}
.components .comp b { color: var(--fg); }
ul.issue-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
ul.issue-list li {
  padding: 6px 8px;
  border-left: 3px solid transparent;
  margin-bottom: 2px;
  background: #fafafa;
  border-radius: 3px;
}
ul.issue-list li.sev-error { border-left-color: var(--bad); }
ul.issue-list li.sev-warning { border-left-color: var(--warn); }
ul.issue-list li.sev-suggestion { border-left-color: var(--accent); }
ul.issue-list .fix {
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
  font-family: "SF Mono", Menlo, Consolas, monospace;
}
table.bench-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 6px;
}
table.bench-table th,
table.bench-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
table.bench-table tr.ok td:nth-child(2) { color: var(--good); font-weight: 600; }
table.bench-table tr.fail td:nth-child(2) { color: var(--bad); font-weight: 600; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
@media (max-width: 720px) {
  main { padding: 16px; }
  header { padding: 16px; flex-direction: column; align-items: flex-start; gap: 6px; }
  table.results th:nth-child(4),
  table.results td:nth-child(4) { display: none; }
}
`.trim();

// ---------------------------------------------------------------------------
// Vanilla-JS interactions: row toggle + column sort
// ---------------------------------------------------------------------------

const SCRIPT = `
(function () {
  var tbody = document.querySelector("table.results tbody");
  if (!tbody) return;

  // ---- expand/collapse on row click --------------------------------------
  tbody.addEventListener("click", function (e) {
    var row = e.target.closest("tr.row");
    if (!row) return;
    var idx = row.getAttribute("data-idx");
    var detail = document.getElementById("detail-" + idx);
    if (!detail) return;
    var isOpen = !detail.hasAttribute("hidden");
    if (isOpen) {
      detail.setAttribute("hidden", "");
      row.classList.remove("open");
    } else {
      detail.removeAttribute("hidden");
      row.classList.add("open");
    }
  });

  // ---- sortable headers --------------------------------------------------
  var ths = document.querySelectorAll("table.results thead th[data-sort]");
  var dir = {};

  function compare(a, b, kind) {
    if (kind === "num") {
      var an = parseFloat(a) || 0;
      var bn = parseFloat(b) || 0;
      return an - bn;
    }
    return String(a).localeCompare(String(b));
  }

  ths.forEach(function (th) {
    th.addEventListener("click", function () {
      var key = th.getAttribute("data-sort");
      var kind = th.getAttribute("data-kind") || "str";
      dir[key] = !dir[key];
      var asc = dir[key];

      // Group rows in pairs: [main row, detail row]
      var rows = Array.prototype.slice.call(tbody.children);
      var pairs = [];
      for (var i = 0; i < rows.length; i += 2) {
        pairs.push([rows[i], rows[i + 1]]);
      }

      pairs.sort(function (p1, p2) {
        var v1 = p1[0].getAttribute("data-" + key);
        var v2 = p2[0].getAttribute("data-" + key);
        var c = compare(v1, v2, kind);
        return asc ? c : -c;
      });

      // Re-attach in new order.
      pairs.forEach(function (p) {
        tbody.appendChild(p[0]);
        if (p[1]) tbody.appendChild(p[1]);
      });

      ths.forEach(function (other) { other.classList.remove("sorted"); });
      th.classList.add("sorted");
      var arrow = th.querySelector(".arrow");
      if (arrow) arrow.textContent = asc ? "\u25B2" : "\u25BC";
    });
  });
})();
`.trim();

// ---------------------------------------------------------------------------
// Top-level render
// ---------------------------------------------------------------------------

function renderRow(score: AgentScore, idx: number, rank: number): string {
  const band = scoreBand(score.score);
  const link = sourceLink(score.agentPath);
  const sourceCell = link.href
    ? `<a href="${attr(link.href)}" target="_blank" rel="noopener noreferrer">${esc(link.display)}</a>`
    : esc(link.display);

  return `<tr class="row"
              data-idx="${idx}"
              data-rank="${rank}"
              data-name="${attr(score.agentName.toLowerCase())}"
              data-score="${score.score}"
              data-source="${attr(link.display.toLowerCase())}">
    <td>${rank}</td>
    <td><strong>${esc(score.agentName)}</strong></td>
    <td><span class="score ${band}">${score.score.toFixed(0)}</span></td>
    <td>${topIssues(score.staticIssues)}</td>
    <td>${sourceCell}</td>
    <td><span class="muted">click to expand</span></td>
  </tr>${renderDetail(score, idx)}`;
}

function render(ctx: ReportContext): string {
  // Stable: by score desc, then name asc.
  const sorted = [...ctx.results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.agentName.localeCompare(b.agentName);
  });

  const rowsHtml = sorted
    .map((s, i) => renderRow(s, i, i + 1))
    .join("\n");

  const totalIssues = sorted.reduce(
    (acc, s) => acc + s.staticIssues.length,
    0,
  );
  const errors = sorted.reduce(
    (acc, s) => acc + s.staticIssues.filter((i) => i.severity === "error").length,
    0,
  );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>agelin report</title>
  <style>${CSS}</style>
</head>
<body>
  <header>
    <h1><span class="logo" aria-hidden="true"></span>agelin report</h1>
    <div class="meta">
      generated ${esc(ctx.generatedAt)} &middot; v${esc(ctx.toolVersion)}
    </div>
  </header>
  <main>
    <div class="summary">
      <span><strong>${sorted.length}</strong> agents</span>
      <span><strong>${totalIssues}</strong> static issues</span>
      <span><strong>${errors}</strong> errors</span>
    </div>
    <table class="results">
      <thead>
        <tr>
          <th data-sort="rank" data-kind="num">rank<span class="arrow"></span></th>
          <th data-sort="name" data-kind="str">name<span class="arrow"></span></th>
          <th data-sort="score" data-kind="num" class="sorted">score<span class="arrow">\u25BC</span></th>
          <th>top issues</th>
          <th data-sort="source" data-kind="str">source<span class="arrow"></span></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </main>
  <script>${SCRIPT}</script>
</body>
</html>
`;
}

const reporter: Reporter = {
  name: "html",
  render,
};

export default reporter;
