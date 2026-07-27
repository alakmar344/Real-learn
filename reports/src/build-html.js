#!/usr/bin/env node
/**
 * build-html.js — generates a high-performance, interactive, SVG-powered
 * Analytics Dashboard for RealLearn AI in reports/RealLearn-Complete-Report.html.
 *
 * Reuses data from reports/src/data.json and chapters from reports/src/chapters/*.html.
 * Output is a single, self-contained HTML file (no external dependencies, fonts, or scripts).
 *
 * Usage: node reports/src/build-html.js
 */
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const OUT = path.resolve(SRC, '..', 'RealLearn-Complete-Report.html');

const data = JSON.parse(fs.readFileSync(path.join(SRC, 'data.json'), 'utf8'));
const T = data.totals;

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Number(n || 0).toLocaleString('en-US');

// Read chapters
const chapterFiles = fs.readdirSync(path.join(SRC, 'chapters'))
  .filter((f) => f.endsWith('.html')).sort();

const chapters = chapterFiles.map((f) => {
  const html = fs.readFileSync(path.join(SRC, 'chapters', f), 'utf8');
  const num = f.slice(0, 2);
  const h1Match = html.match(/<h1>([\s\S]*?)<\/h1>/);
  let rawTitle = f;
  if (h1Match) {
    rawTitle = h1Match[1].replace(/<span class="ch-num">\d+<\/span>/, '').replace(/<[^>]+>/g, '').trim();
  }
  return { file: f, num, id: `ch-${num}`, title: esc(rawTitle), html };
});

const PARTS = [
  { roman: 'I', title: 'The Product & Pedagogy', range: ['01', '05'], desc: 'Core product mechanics, 3-part journey, quiz gates, Worked Real Madrid example, multilingual support.' },
  { roman: 'II', title: 'Frontend Engine & UX', range: ['06', '12'], desc: 'Next.js 15 App router, 50 components, Zustand stores, hooks, design tokens, responsive UI.' },
  { roman: 'III', title: 'Backend & AI Pipeline', range: ['13', '21'], desc: 'Express endpoints, Cerebras/Cloudflare Gemma 4 engine, Serper live grounding, moderation, LRU+Mongo cache.' },
  { roman: 'IV', title: 'Engineering & Operations', range: ['22', '27'], desc: '717 commits history, 236 merged PRs, design eras, test suite, incident logs, ops roadmap.' },
];

// Languages breakdown stats
const langEntries = Object.entries(data.byLang || {})
  .filter(([lang]) => !['other', '.example'].includes(lang))
  .sort((a, b) => b[1].lines - a[1].lines);

const totalCodeLines = langEntries.reduce((acc, curr) => acc + curr[1].lines, 0);

const langColors = {
  'TypeScript (TSX)': '#3178C6',
  'TypeScript': '#2B7489',
  'JavaScript': '#F7DF1E',
  'CSS': '#1572B6',
  'Markdown': '#083344',
  'JSON': '#292929',
  'SVG': '#FFB300',
  'HTML': '#E34F26',
};

// SVG Monthly Commits Chart calculation
const months = Object.keys(data.commitsByMonth || {}).sort();
const maxCommits = Math.max(...Object.values(data.commitsByMonth || { a: 1 }), 1);
const chartW = 600;
const chartH = 200;
const padding = 40;

const points = months.map((m, idx) => {
  const count = data.commitsByMonth[m];
  const x = padding + (idx / Math.max(months.length - 1, 1)) * (chartW - padding * 2);
  const y = chartH - padding - (count / maxCommits) * (chartH - padding * 2);
  return { m, count, x, y };
});

const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
const areaPoints = `${points[0].x},${chartH - padding} ${polylinePoints} ${points[points.length - 1].x},${chartH - padding}`;

// Commit type distribution
const commitTypes = Object.entries(data.typeDist || {}).sort((a, b) => b[1] - a[1]);

const htmlDocument = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RealLearn AI — Professional Engineering & Product Analytics Dashboard</title>
  <style>
    /* ==========================================================================
       REALLEARN AI ANALYTICS DASHBOARD - CORE DESIGN SYSTEM (SOFT PASTEL / INK)
       ========================================================================== */
    :root {
      /* Ink Dark Mode (Default) */
      --bg-canvas: #090D16;
      --bg-surface: #111827;
      --bg-card: #1F2937;
      --bg-card-hover: #374151;
      --border: #374151;
      --border-accent: rgba(2, 132, 199, 0.3);
      --text-main: #F9FAFB;
      --text-muted: #9CA3AF;
      --text-subtle: #6B7280;
      
      /* Soft Pastel Accents (No Purple/Violet) */
      --accent: #0284C7; /* Sky Blue */
      --accent-bright: #38BDF8;
      --accent-glow: rgba(2, 132, 199, 0.15);
      --teal: #0D9488;
      --mint: #10B981;
      --peach: #F97316;
      --rose: #F43F5E;
      --amber: #F59E0B;

      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --font-heading: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    [data-theme="light"] {
      /* Paper Daylight Mode */
      --bg-canvas: #FFFDF8;
      --bg-surface: #F3F4F6;
      --bg-card: #FFFFFF;
      --bg-card-hover: #F9FAFB;
      --border: #E5E7EB;
      --border-accent: rgba(2, 132, 199, 0.2);
      --text-main: #111827;
      --text-muted: #4B5563;
      --text-subtle: #9CA3AF;
      --accent-glow: rgba(2, 132, 199, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-heading);
      background-color: var(--bg-canvas);
      color: var(--text-main);
      line-height: 1.6;
      display: flex;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* --------------------------------------------------------------------------
       SIDEBAR NAVIGATION
       -------------------------------------------------------------------------- */
    .sidebar {
      width: 280px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 100;
    }

    .brand-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--accent), var(--teal));
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 20px;
      box-shadow: 0 4px 12px var(--accent-glow);
    }

    .brand-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-subtitle {
      font-size: 11px;
      color: var(--accent-bright);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .nav-list {
      list-style: none;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      overflow-y: auto;
    }

    .nav-item button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }

    .nav-item button:hover {
      background: var(--bg-card);
      color: var(--text-main);
    }

    .nav-item button.active {
      background: var(--bg-card);
      color: var(--accent-bright);
      border-color: var(--border-accent);
      box-shadow: 0 2px 8px var(--accent-glow);
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .theme-toggle-btn {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-main);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    /* --------------------------------------------------------------------------
       MAIN CONTENT CONTAINER
       -------------------------------------------------------------------------- */
    .main-wrapper {
      margin-left: 280px;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .top-bar {
      height: 64px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
    }

    .search-box {
      position: relative;
      width: 380px;
    }

    .search-box input {
      width: 100%;
      padding: 8px 16px 8px 36px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      color: var(--text-main);
      font-size: 13px;
      outline: none;
    }

    .search-box input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 14px;
    }

    .top-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .badge-pill {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--accent-bright);
    }

    .content-stage {
      padding: 28px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* --------------------------------------------------------------------------
       DASHBOARD CARDS & GRID
       -------------------------------------------------------------------------- */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-accent);
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--card-accent, var(--accent));
    }

    .kpi-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi-value {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-main);
      line-height: 1.1;
      font-family: var(--font-heading);
    }

    .kpi-sub {
      font-size: 12px;
      color: var(--text-subtle);
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }

    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: 1fr; }
      .sidebar { width: 100%; height: auto; position: relative; }
      .main-wrapper { margin-left: 0; }
    }

    .widget-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .widget-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chart-container {
      width: 100%;
      position: relative;
    }

    /* --------------------------------------------------------------------------
       SVG GRAPH & DIAGRAM STYLES
       -------------------------------------------------------------------------- */
    svg.analytics-chart {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .chart-area {
      fill: url(#chartGradient);
      opacity: 0.3;
    }

    .chart-line {
      fill: none;
      stroke: var(--accent-bright);
      stroke-width: 3;
      stroke-linecap: round;
    }

    .chart-point {
      fill: var(--accent-bright);
      stroke: var(--bg-card);
      stroke-width: 2;
      cursor: pointer;
      transition: r 0.2s ease;
    }

    .chart-point:hover {
      r: 7;
    }

    .chart-axis {
      stroke: var(--border);
      stroke-dasharray: 4;
    }

    .chart-label {
      fill: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      text-anchor: middle;
    }

    /* Stack list progress bars */
    .stack-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stack-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stack-meta {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
    }

    .bar-bg {
      height: 8px;
      background: var(--bg-surface);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Architecture Flow SVG */
    .arch-flow-box {
      fill: var(--bg-surface);
      stroke: var(--border);
      stroke-width: 2;
      rx: 10;
    }

    .arch-flow-text {
      fill: var(--text-main);
      font-size: 12px;
      font-weight: 700;
      text-anchor: middle;
    }

    .arch-flow-sub {
      fill: var(--text-muted);
      font-size: 10px;
      text-anchor: middle;
    }

    .arch-arrow {
      stroke: var(--accent-bright);
      stroke-width: 2;
      fill: none;
      marker-end: url(#arrowhead);
    }

    /* --------------------------------------------------------------------------
       CHAPTER READER STYLES
       -------------------------------------------------------------------------- */
    .chapters-wrapper {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 28px;
    }

    .toc-sticky {
      position: sticky;
      top: 84px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .toc-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .toc-link {
      display: block;
      padding: 6px 10px;
      font-size: 13px;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.2s ease;
    }

    .toc-link:hover, .toc-link.active {
      background: var(--bg-surface);
      color: var(--accent-bright);
      font-weight: 600;
    }

    .chapter-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 32px;
      margin-bottom: 24px;
      scroll-margin-top: 84px;
    }

    .chapter-card h1 {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 16px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 12px;
    }

    .chapter-card h2 {
      font-size: 18px;
      font-weight: 700;
      margin: 24px 0 12px 0;
      color: var(--accent-bright);
    }

    .chapter-card p {
      margin-bottom: 16px;
      color: var(--text-main);
      font-size: 15px;
      line-height: 1.7;
    }

    .chapter-card ul, .chapter-card ol {
      margin: 0 0 16px 24px;
      color: var(--text-main);
    }

    .chapter-card li { margin-bottom: 6px; }

    .chapter-card code {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--accent-bright);
    }

    .chapter-card pre {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      padding: 16px;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      margin-bottom: 16px;
    }

    .chapter-card pre code {
      background: transparent;
      border: none;
      padding: 0;
    }

    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .table-custom th, .table-custom td {
      padding: 10px 14px;
      border: 1px solid var(--border);
      text-align: left;
      font-size: 13px;
    }

    .table-custom th {
      background: var(--bg-surface);
      font-weight: 700;
      color: var(--text-main);
    }

    .hidden { display: none !important; }
  </style>
</head>
<body>

  <!-- SIDEBAR NAVIGATION -->
  <aside class="sidebar">
    <div class="brand-header">
      <div class="brand-logo">RL</div>
      <div>
        <div class="brand-title">RealLearn AI</div>
        <div class="brand-subtitle">Analytics Dashboard</div>
      </div>
    </div>

    <ul class="nav-list">
      <li class="nav-item">
        <button class="active" onclick="switchTab('overview', this)">
          <span>⚡</span> Overview & KPIs
        </button>
      </li>
      <li class="nav-item">
        <button onclick="switchTab('velocity', this)">
          <span>📊</span> Git & Commit Velocity
        </button>
      </li>
      <li class="nav-item">
        <button onclick="switchTab('architecture', this)">
          <span>🏗️</span> Architecture & Flow
        </button>
      </li>
      <li class="nav-item">
        <button onclick="switchTab('design', this)">
          <span>🎨</span> Design System Tokens
        </button>
      </li>
      <li class="nav-item">
        <button onclick="switchTab('chapters', this)">
          <span>📚</span> Complete 27 Chapters
        </button>
      </li>
    </ul>

    <div class="sidebar-footer">
      <button class="theme-toggle-btn" onclick="toggleTheme()">
        <span id="theme-icon">☀️</span> <span id="theme-label">Switch to Paper Light</span>
      </button>
    </div>
  </aside>

  <!-- MAIN WRAPPER -->
  <div class="main-wrapper">
    <!-- STICKY TOP BAR -->
    <header class="top-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="globalSearch" placeholder="Search chapters, metrics, architecture..." onkeyup="handleSearch()">
      </div>
      <div class="top-meta">
        <span>Repo: <strong>${data.repo}</strong></span>
        <span class="badge-pill">HEAD: ${data.branchAnalyzed}</span>
        <span>Generated: ${data.generatedAt.slice(0, 10)}</span>
      </div>
    </header>

    <!-- CONTENT STAGE -->
    <main class="content-stage">

      <!-- TAB 1: OVERVIEW -->
      <section id="tab-overview" class="tab-content active">
        <!-- KPI METRICS GRID -->
        <div class="kpi-grid">
          <div class="kpi-card" style="--card-accent: var(--accent);">
            <div class="kpi-label">Lines of Code</div>
            <div class="kpi-value">${fmt(T.totalLines)}</div>
            <div class="kpi-sub">Across ${T.codeFiles} measured files</div>
          </div>
          <div class="kpi-card" style="--card-accent: var(--teal);">
            <div class="kpi-label">Git Velocity</div>
            <div class="kpi-value">${fmt(T.commits)}</div>
            <div class="kpi-sub">${T.mergedPRs} merged PRs</div>
          </div>
          <div class="kpi-card" style="--card-accent: var(--peach);">
            <div class="kpi-label">React Components</div>
            <div class="kpi-value">${T.components}</div>
            <div class="kpi-sub">Next.js 15 + React 19</div>
          </div>
          <div class="kpi-card" style="--card-accent: var(--mint);">
            <div class="kpi-label">API Endpoints</div>
            <div class="kpi-value">${T.endpoints}</div>
            <div class="kpi-sub">Express + SSE Streaming</div>
          </div>
          <div class="kpi-card" style="--card-accent: var(--amber);">
            <div class="kpi-label">Languages</div>
            <div class="kpi-value">12</div>
            <div class="kpi-sub">Indian regional support</div>
          </div>
          <div class="kpi-card" style="--card-accent: var(--rose);">
            <div class="kpi-label">Pedagogy Gate</div>
            <div class="kpi-value">100%</div>
            <div class="kpi-sub">2-Question quiz score required</div>
          </div>
        </div>

        <!-- DASHBOARD WIDGETS GRID -->
        <div class="dashboard-grid">
          <!-- CHART: GIT COMMITS OVER TIME -->
          <div class="widget-card">
            <div class="widget-title">
              <span>📈 Commit Velocity (Monthly Timeline)</span>
              <span class="badge-pill">${months[0]} → ${months[months.length - 1]}</span>
            </div>
            <div class="chart-container">
              <svg class="analytics-chart" viewBox="0 0 ${chartW} ${chartH}">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.5" />
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="${padding}" y1="${chartH - padding}" x2="${chartW - padding}" y2="${chartH - padding}" class="chart-axis" />
                <polygon points="${areaPoints}" class="chart-area" />
                <polyline points="${polylinePoints}" class="chart-line" />
                ${points.map(p => `
                  <circle cx="${p.x}" cy="${p.y}" r="5" class="chart-point">
                    <title>${p.m}: ${p.count} commits</title>
                  </circle>
                  <text x="${p.x}" y="${chartH - 12}" class="chart-label">${p.m}</text>
                  <text x="${p.x}" y="${p.y - 12}" class="chart-label" style="fill: var(--accent-bright); font-weight:700;">${p.count}</text>
                `).join('')}
              </svg>
            </div>
          </div>

          <!-- STACK / LANGUAGE BREAKDOWN -->
          <div class="widget-card">
            <div class="widget-title">
              <span>🍩 Language Distribution</span>
            </div>
            <div class="stack-list">
              ${langEntries.map(([lang, stat]) => {
                const pct = ((stat.lines / totalCodeLines) * 100).toFixed(1);
                const color = langColors[lang] || 'var(--accent)';
                return `
                  <div class="stack-item">
                    <div class="stack-meta">
                      <span>${lang}</span>
                      <span style="color: var(--text-muted);">${fmt(stat.lines)} lines (${pct}%)</span>
                    </div>
                    <div class="bar-bg">
                      <div class="bar-fill" style="width: ${pct}%; background: ${color};"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- WORKED JOURNEY HIGHLIGHT -->
        <div class="widget-card">
          <div class="widget-title">
            <span>🎯 Core Worked Pipeline — Worked Real Madrid Example</span>
          </div>
          <p style="color: var(--text-muted); font-size: 14px;">
            Traced end-to-end for the question: <em>"Why does Real Madrid win so many Champions League finals?"</em>
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 12px;">
            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <strong style="color: var(--accent-bright);">Part 1: Foundation</strong>
              <p style="font-size: 13px; margin-top: 6px; color: var(--text-muted);">
                Teaches structural financial advantage, squad depth, and European DNA legacy. Gated behind Quiz 1.
              </p>
            </div>
            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <strong style="color: var(--peach);">Part 2: Mechanism</strong>
              <p style="font-size: 13px; margin-top: 6px; color: var(--text-muted);">
                Tactical flexibility under pressure, high-stress game management, and late-game physical conditioning. Gated behind Quiz 2.
              </p>
            </div>
            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <strong style="color: var(--mint);">Part 3: Real World</strong>
              <p style="font-size: 13px; margin-top: 6px; color: var(--text-muted);">
                Grounded with live Serper news results for the 2024 Champions League final performance. Complete Journey Unlocked!
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 2: GIT VELOCITY -->
      <section id="tab-velocity" class="tab-content">
        <div class="widget-card" style="margin-bottom: 24px;">
          <div class="widget-title">
            <span>🔀 Conventional Commit Type Distribution</span>
          </div>
          <div class="stack-list" style="margin-top: 12px;">
            ${commitTypes.map(([type, count]) => {
              const pct = ((count / T.commits) * 100).toFixed(1);
              return `
                <div class="stack-item">
                  <div class="stack-meta">
                    <span style="text-transform: uppercase; font-family: var(--font-mono);">${type}</span>
                    <span>${count} commits (${pct}%)</span>
                  </div>
                  <div class="bar-bg">
                    <div class="bar-fill" style="width: ${pct}%; background: var(--accent-bright);"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- TAB 3: ARCHITECTURE FLOW -->
      <section id="tab-architecture" class="tab-content">
        <div class="widget-card">
          <div class="widget-title">
            <span>🏗️ End-to-End System Architecture & Data Flow Diagram</span>
          </div>
          <div class="chart-container" style="padding: 20px 0;">
            <svg class="analytics-chart" viewBox="0 0 800 320">
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <polygon points="0 0, 8 4, 0 8" fill="var(--accent-bright)" />
                </marker>
              </defs>

              <!-- Node 1: Client -->
              <g transform="translate(40, 120)">
                <rect width="180" height="80" class="arch-flow-box" />
                <text x="90" y="36" class="arch-flow-text">Next.js 15 Frontend</text>
                <text x="90" y="56" class="arch-flow-sub">React 19 + Clerk + Zustand</text>
              </g>

              <!-- Arrow 1 -->
              <line x1="220" y1="160" x2="290" y2="160" class="arch-arrow" />

              <!-- Node 2: Express -->
              <g transform="translate(300, 120)">
                <rect width="180" height="80" class="arch-flow-box" />
                <text x="90" y="36" class="arch-flow-text">Express Backend API</text>
                <text x="90" y="56" class="arch-flow-sub">SSE Streamer + Auth Guard</text>
              </g>

              <!-- Arrow 2 -->
              <line x1="480" y1="160" x2="550" y2="160" class="arch-arrow" />

              <!-- Node 3: AI Engine -->
              <g transform="translate(560, 40)">
                <rect width="200" height="70" class="arch-flow-box" style="stroke: var(--mint);" />
                <text x="100" y="32" class="arch-flow-text">Gemma 4 AI Engine</text>
                <text x="100" y="50" class="arch-flow-sub">Cerebras (Pri) / Cloudflare (FB)</text>
              </g>

              <!-- Node 4: Serper Grounding -->
              <g transform="translate(560, 130)">
                <rect width="200" height="70" class="arch-flow-box" style="stroke: var(--peach);" />
                <text x="100" y="32" class="arch-flow-text">Serper Live Grounding</text>
                <text x="100" y="50" class="arch-flow-sub">Real-time web news context</text>
              </g>

              <!-- Node 5: Cache Tier -->
              <g transform="translate(560, 220)">
                <rect width="200" height="70" class="arch-flow-box" style="stroke: var(--accent);" />
                <text x="100" y="32" class="arch-flow-text">2-Tier Cache System</text>
                <text x="100" y="50" class="arch-flow-sub">In-Memory LRU + MongoDB</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <!-- TAB 4: DESIGN SYSTEM -->
      <section id="tab-design" class="tab-content">
        <div class="widget-card">
          <div class="widget-title">
            <span>🎨 Soft Pastel Design System Tokens (Rule 4 Compliance)</span>
          </div>
          <p style="color: var(--text-muted); font-size: 14px;">
            Strict design tokens enforced across Paper (Daylight), Ink (Dark Night), and Dusk themes. NO purple or violet permitted.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 16px;">
            <div style="padding: 16px; background: #0284C7; color: white; border-radius: var(--radius-sm); font-weight: 700;">
              Sky Blue Accent<br><small>#0284C7</small>
            </div>
            <div style="padding: 16px; background: #0D9488; color: white; border-radius: var(--radius-sm); font-weight: 700;">
              Teal Companion<br><small>#0D9488</small>
            </div>
            <div style="padding: 16px; background: #F97316; color: white; border-radius: var(--radius-sm); font-weight: 700;">
              Peach Wash<br><small>#F97316</small>
            </div>
            <div style="padding: 16px; background: #10B981; color: white; border-radius: var(--radius-sm); font-weight: 700;">
              Mint Wash<br><small>#10B981</small>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 5: COMPLETE 27 CHAPTERS READER -->
      <section id="tab-chapters" class="tab-content">
        <div class="chapters-wrapper">
          <!-- STICKY TOC -->
          <nav class="toc-sticky">
            <div class="toc-title">Chapter Navigation</div>
            ${chapters.map(c => `
              <a href="#${c.id}" class="toc-link">${c.num}. ${c.title}</a>
            `).join('')}
          </nav>

          <!-- CHAPTER CONTENT STACK -->
          <div class="chapters-stack">
            ${chapters.map(c => `
              <article id="${c.id}" class="chapter-card">
                ${c.html}
              </article>
            `).join('')}
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- CLIENT-SIDE INTERACTIVITY SCRIPT -->
  <script>
    function switchTab(tabId, btnElement) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-item button').forEach(el => el.classList.remove('active'));
      
      const target = document.getElementById('tab-' + tabId);
      if (target) {
        target.classList.add('active');
      }
      if (btnElement) {
        btnElement.classList.add('active');
      }
    }

    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      
      document.getElementById('theme-icon').textContent = next === 'dark' ? '☀️' : '🌙';
      document.getElementById('theme-label').textContent = next === 'dark' ? 'Switch to Paper Light' : 'Switch to Ink Dark';
    }

    function handleSearch() {
      const query = document.getElementById('globalSearch').value.toLowerCase().trim();
      const chapters = document.querySelectorAll('.chapter-card');
      const tocLinks = document.querySelectorAll('.toc-link');

      if (!query) {
        chapters.forEach(c => c.classList.remove('hidden'));
        tocLinks.forEach(l => l.classList.remove('hidden'));
        return;
      }

      // Automatically switch to chapters tab if typing search
      switchTab('chapters', document.querySelector('button[onclick*="chapters"]'));

      chapters.forEach((c, idx) => {
        const text = c.textContent.toLowerCase();
        const match = text.includes(query);
        c.classList.toggle('hidden', !match);
        if (tocLinks[idx]) {
          tocLinks[idx].classList.toggle('hidden', !match);
        }
      });
    }

    // Ctrl+K shortcut for search
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch').focus();
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(OUT, htmlDocument);
const bytes = fs.statSync(OUT).size;
console.log(`Wrote ${OUT} — ${(bytes / 1024).toFixed(0)} KB, self-contained interactive Analytics Dashboard.`);
