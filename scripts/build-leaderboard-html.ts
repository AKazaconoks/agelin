/**
 * Builds `leaderboard.html` from `leaderboard.json`.
 *
 * One self-contained HTML file. No frameworks, no external requests, no
 * build step beyond running this script. Inline CSS, vanilla JS.
 *
 * Features:
 *   - Sortable columns (click header).
 *   - Color-banded score column (green / yellow / red).
 *   - Search filter (matches agent name, source repo, tags).
 *   - Expandable detail row with the four sub-component scores.
 *
 * Usage:
 *   bun run scripts/build-leaderboard-html.ts
 *   bun run build:leaderboard
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface LeaderboardEntry {
  rank: number;
  agentName: string;
  sourceRepo: string;
  sourceUrl: string;
  license: string | null;
  score: number;
  components: {
    staticHealth: number;
    successRate: number;
    costEfficiency: number;
    consistency: number;
  };
  tags: string[];
}

interface LeaderboardData {
  generatedAt: string;
  toolVersion: string;
  modelUsed: string;
  totalAgents: number;
  totalTasks: number;
  meanScore: number;
  entries: LeaderboardEntry[];
}

const cwd = process.cwd();
const inputPath = resolve(cwd, "leaderboard.json");
const outputPath = resolve(cwd, "leaderboard.html");

if (!existsSync(inputPath)) {
  console.error(
    `leaderboard.json not found at ${inputPath}. Run \`agelin baseline\` first.`,
  );
  process.exit(1);
}

const board = JSON.parse(readFileSync(inputPath, "utf8")) as LeaderboardData;
const html = renderHtml(board);
writeFileSync(outputPath, html, "utf8");
console.log(`Wrote ${outputPath} (${board.entries.length} entries)`);

// ---------------------------------------------------------------------------

function renderHtml(board: LeaderboardData): string {
  const dataJson = JSON.stringify(board);
  const generated = escapeHtml(board.generatedAt);
  const model = escapeHtml(board.modelUsed);
  const version = escapeHtml(board.toolVersion);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>agelin leaderboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --bg: #0f1115;
    --panel: #161922;
    --panel-2: #1e2230;
    --border: #2a2f3d;
    --text: #e7e9ee;
    --muted: #8a93a6;
    --accent: #6aa9ff;
    --green: #4cd964;
    --yellow: #ffcc33;
    --red: #ff5c5c;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
  header {
    padding: 32px 40px 16px;
    border-bottom: 1px solid var(--border);
  }
  header h1 {
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  header .meta {
    color: var(--muted);
    font-size: 13px;
  }
  header .meta span + span::before {
    content: " · ";
    color: var(--border);
  }
  main {
    padding: 24px 40px 64px;
    max-width: 1280px;
    margin: 0 auto;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .search {
    flex: 1;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
  }
  .search:focus {
    outline: none;
    border-color: var(--accent);
  }
  .stats {
    display: flex;
    gap: 18px;
    color: var(--muted);
    font-size: 13px;
  }
  .stat strong {
    color: var(--text);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  thead th {
    text-align: left;
    padding: 12px 14px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    background: var(--panel-2);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  thead th .arrow {
    color: var(--accent);
    margin-left: 4px;
    opacity: 0.5;
  }
  thead th.sorted .arrow { opacity: 1; }
  tbody tr {
    border-bottom: 1px solid var(--border);
  }
  tbody tr.row {
    cursor: pointer;
  }
  tbody tr.row:hover {
    background: var(--panel-2);
  }
  tbody tr:last-child { border-bottom: 0; }
  tbody td {
    padding: 12px 14px;
    vertical-align: middle;
  }
  td.rank {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    width: 1%;
  }
  td.agent {
    font-weight: 600;
  }
  td.agent .repo {
    display: block;
    color: var(--muted);
    font-weight: 400;
    font-size: 12px;
    margin-top: 2px;
  }
  td.score {
    width: 96px;
    font-variant-numeric: tabular-nums;
  }
  td.score .pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 600;
    color: #0f1115;
  }
  td.score .pill.green { background: var(--green); }
  td.score .pill.yellow { background: var(--yellow); }
  td.score .pill.red { background: var(--red); color: #fff; }
  td.tags { color: var(--muted); font-size: 13px; }
  td.tags .tag {
    display: inline-block;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 6px;
    margin-right: 4px;
    margin-bottom: 2px;
    color: var(--text);
    font-size: 12px;
  }
  td.license { color: var(--muted); font-size: 12px; white-space: nowrap; }
  tr.detail td {
    background: var(--panel-2);
    padding: 16px 24px 20px;
  }
  tr.detail .components {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }
  tr.detail .comp {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 14px;
  }
  tr.detail .comp h3 {
    margin: 0 0 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    font-weight: 500;
  }
  tr.detail .comp .v {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  tr.detail .comp .bar {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
  }
  tr.detail .comp .bar > div {
    height: 100%;
    background: var(--accent);
  }
  tr.detail a {
    color: var(--accent);
    text-decoration: none;
  }
  tr.detail a:hover { text-decoration: underline; }
  tr.detail .links {
    margin-top: 12px;
    color: var(--muted);
    font-size: 13px;
  }
  footer {
    padding: 24px 40px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 12px;
    text-align: center;
  }
</style>
</head>
<body>
<header>
  <h1>agelin leaderboard</h1>
  <div class="meta">
    <span>Generated ${generated}</span>
    <span>Model ${model}</span>
    <span>v${version}</span>
  </div>
</header>
<main>
  <div class="toolbar">
    <input id="search" class="search" type="search" placeholder="Filter by agent, repo, or tag..." autocomplete="off">
    <div class="stats">
      <div class="stat"><strong id="stat-count">${board.entries.length}</strong> agents</div>
      <div class="stat"><strong>${board.totalTasks}</strong> tasks</div>
      <div class="stat"><strong>${board.meanScore.toFixed(1)}</strong> mean</div>
    </div>
  </div>
  <table id="lb">
    <thead>
      <tr>
        <th data-key="rank" data-dir="asc">#<span class="arrow"></span></th>
        <th data-key="agentName" data-dir="asc">Agent<span class="arrow"></span></th>
        <th data-key="score" data-dir="desc" class="sorted">Score<span class="arrow">&#x25BC;</span></th>
        <th data-key="staticHealth" data-dir="desc">Static<span class="arrow"></span></th>
        <th data-key="successRate" data-dir="desc">Success<span class="arrow"></span></th>
        <th data-key="costEfficiency" data-dir="desc">Cost<span class="arrow"></span></th>
        <th data-key="consistency" data-dir="desc">Consistency<span class="arrow"></span></th>
        <th data-key="tags" data-dir="asc">Tags<span class="arrow"></span></th>
        <th data-key="license" data-dir="asc">License<span class="arrow"></span></th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
</main>
<footer>
  Generated by <a href="https://github.com/anthropics/agelin" style="color: var(--accent); text-decoration: none;">agelin</a>.
  Scores are 0-100 composites of static health, golden-task success rate, cost efficiency, and consistency across repeats.
</footer>
<script>
const DATA = ${dataJson};
const ENTRIES = DATA.entries.slice();
const tbody = document.getElementById('rows');
const search = document.getElementById('search');
const ths = document.querySelectorAll('thead th');
const statCount = document.getElementById('stat-count');

let state = { sortKey: 'score', sortDir: 'desc', q: '' };
const expanded = new Set();

function scoreClass(s) {
  if (s >= 80) return 'green';
  if (s >= 50) return 'yellow';
  return 'red';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compare(a, b, key) {
  const av = key in a ? a[key] : (a.components ? a.components[key] : undefined);
  const bv = key in b ? b[key] : (b.components ? b.components[key] : undefined);
  if (key === 'tags') {
    return (a.tags.join(',')).localeCompare(b.tags.join(','));
  }
  if (key === 'license') {
    return String(a.license || '').localeCompare(String(b.license || ''));
  }
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv));
}

function matches(entry, q) {
  if (!q) return true;
  const hay = [
    entry.agentName,
    entry.sourceRepo,
    entry.license || '',
    entry.tags.join(' '),
  ].join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

function render() {
  const filtered = ENTRIES.filter(e => matches(e, state.q));
  filtered.sort((a, b) => {
    const cmp = compare(a, b, state.sortKey);
    return state.sortDir === 'desc' ? -cmp : cmp;
  });
  statCount.textContent = filtered.length;

  const html = [];
  for (const e of filtered) {
    const cls = scoreClass(e.score);
    const tagHtml = e.tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('');
    const repo = e.sourceUrl
      ? '<a href="' + escapeHtml(e.sourceUrl) + '" target="_blank" rel="noopener" style="color: var(--muted); text-decoration: none;">' + escapeHtml(e.sourceRepo) + '</a>'
      : escapeHtml(e.sourceRepo);
    html.push(
      '<tr class="row" data-name="' + escapeHtml(e.agentName) + '">' +
        '<td class="rank">' + e.rank + '</td>' +
        '<td class="agent">' + escapeHtml(e.agentName) + '<span class="repo">' + repo + '</span></td>' +
        '<td class="score"><span class="pill ' + cls + '">' + e.score.toFixed(1) + '</span></td>' +
        '<td>' + e.components.staticHealth.toFixed(0) + '</td>' +
        '<td>' + e.components.successRate.toFixed(0) + '</td>' +
        '<td>' + e.components.costEfficiency.toFixed(0) + '</td>' +
        '<td>' + e.components.consistency.toFixed(0) + '</td>' +
        '<td class="tags">' + tagHtml + '</td>' +
        '<td class="license">' + escapeHtml(e.license || '') + '</td>' +
      '</tr>'
    );
    if (expanded.has(e.agentName)) {
      html.push(detailRow(e));
    }
  }
  tbody.innerHTML = html.join('');

  for (const th of ths) {
    th.classList.remove('sorted');
    const arrow = th.querySelector('.arrow');
    if (arrow) arrow.innerHTML = '';
    if (th.dataset.key === state.sortKey) {
      th.classList.add('sorted');
      if (arrow) arrow.innerHTML = state.sortDir === 'desc' ? '&#x25BC;' : '&#x25B2;';
    }
  }
}

function detailRow(e) {
  const comps = [
    ['Static health', e.components.staticHealth],
    ['Success rate', e.components.successRate],
    ['Cost efficiency', e.components.costEfficiency],
    ['Consistency', e.components.consistency],
  ];
  const compHtml = comps.map(c =>
    '<div class="comp">' +
      '<h3>' + escapeHtml(c[0]) + '</h3>' +
      '<div class="v">' + c[1].toFixed(1) + '</div>' +
      '<div class="bar"><div style="width: ' + Math.max(0, Math.min(100, c[1])) + '%"></div></div>' +
    '</div>'
  ).join('');
  const link = e.sourceUrl
    ? '<a href="' + escapeHtml(e.sourceUrl) + '" target="_blank" rel="noopener">View source on GitHub</a>'
    : '(no source URL recorded)';
  return '<tr class="detail"><td colspan="9">' +
    '<div class="components">' + compHtml + '</div>' +
    '<div class="links">' + link + '</div>' +
  '</td></tr>';
}

for (const th of ths) {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      state.sortDir = th.dataset.dir || 'desc';
    }
    render();
  });
}

tbody.addEventListener('click', (ev) => {
  const tr = ev.target.closest('tr.row');
  if (!tr) return;
  const name = tr.dataset.name;
  if (expanded.has(name)) expanded.delete(name);
  else expanded.add(name);
  render();
});

search.addEventListener('input', () => {
  state.q = search.value.trim();
  render();
});

render();
</script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
