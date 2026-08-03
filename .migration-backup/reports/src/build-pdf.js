#!/usr/bin/env node
/**
 * build-pdf.js — assembles the standalone PDF report from:
 *   - reports/src/data.json        (measured repo dataset — see collect-data.js)
 *   - reports/src/chapters/*.html  (27 hand-written chapters)
 *   - generated front matter (cover, colophon, TOC) and appendices A–F
 *
 * Two-pass render: pass 1 prints with invisible @@PG:<id>@@ markers and
 * placeholder TOC page numbers, the marker positions are read back out of the
 * PDF text layer, and pass 2 prints the final document with a true TOC.
 *
 * Usage: NODE_PATH=/tmp/pdfgen/node_modules node reports/src/build-pdf.js
 */
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const OUT = path.resolve(SRC, '..', 'RealLearn-Complete-Report.pdf');
const data = JSON.parse(fs.readFileSync(path.join(SRC, 'data.json'), 'utf8'));
const css = fs.readFileSync(path.join(SRC, 'pdf.css'), 'utf8');
const T = data.totals;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => Number(n).toLocaleString('en-US');
const kb = (b) => (b / 1024).toFixed(1);

// ------------------------------------------------------------- chapter files
const chapterFiles = fs.readdirSync(path.join(SRC, 'chapters'))
  .filter((f) => f.endsWith('.html')).sort();
const chapters = chapterFiles.map((f) => {
  const html = fs.readFileSync(path.join(SRC, 'chapters', f), 'utf8');
  const num = f.slice(0, 2);
  const h1 = html.match(/<h1>[\s\S]*?<\/h1>/);
  const title = h1 ? h1[0].replace(/<span class="ch-num">\d+<\/span>/, '')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim() : f;
  return { file: f, num, id: `ch-${num}`, title, html };
});

const PARTS = [
  { roman: 'I', title: 'The Product', range: ['01', '05'],
    desc: 'What RealLearn is, who it serves, and how one question becomes a gated three-part lesson — traced end to end with a worked Real Madrid example.' },
  { roman: 'II', title: 'The Frontend', range: ['06', '12'],
    desc: 'The Next.js 15 application: every page, all 50 components, the four Zustand stores, the hooks and client libraries, and the design system in a 3,189-line stylesheet.' },
  { roman: 'III', title: 'The Backend', range: ['13', '21'],
    desc: 'The Express service on Render: twelve endpoints, the multi-provider AI engine, the prompt contract, live grounding, moderation, two-tier caching, auth, and security.' },
  { roman: 'IV', title: 'Engineering Process', range: ['22', '27'],
    desc: 'How the codebase came to be: 724 commits and 239 merged pull requests in three months, the design eras, the test suite, the incident log, operations, and the road ahead.' },
];
const partOf = (num) => PARTS.find((p) => num >= p.range[0] && num <= p.range[1]);

// ------------------------------------------------------------- front matter
const mark = (id) => `<span class="pgmark">@@PG:${id}@@</span>`;

function cover() {
  return `<div class="cover">
  <div class="cover-kicker">Engineering &amp; Product Report · ${data.repo}</div>
  <h1>RealLearn AI<br>The Complete Engineering<br>&amp; Product Report</h1>
  <p class="cover-sub">A full-depth account of an AI-native learning platform — its product, frontend, backend,
  design system, history, and operations — in which every number is measured directly from the repository.</p>
  <div class="cover-rule"></div>
  <div class="cover-stats">
    <div class="cs"><b>${fmt(T.totalLines)}</b><span>lines of code</span></div>
    <div class="cs"><b>${fmt(T.commits)}</b><span>commits</span></div>
    <div class="cs"><b>${fmt(T.mergedPRs)}</b><span>merged PRs</span></div>
    <div class="cs"><b>${T.components}</b><span>components</span></div>
    <div class="cs"><b>${T.endpoints}</b><span>API endpoints</span></div>
    <div class="cs"><b>12</b><span>languages</span></div>
  </div>
  <div class="cover-meta">
    <b>Repository</b> github.com/${data.repo} &nbsp;·&nbsp; <b>Branch analyzed</b> ${data.branchAnalyzed}<br>
    <b>History window</b> ${T.firstCommitDate} → ${T.lastCommitDate} &nbsp;·&nbsp; <b>Report generated</b> ${data.generatedAt.slice(0, 10)}<br>
    <b>Method</b> every statistic in this document was computed by <span style="font-family:monospace">reports/src/collect-data.js</span> from the working tree and git history — nothing is estimated unless labeled as such.
  </div>
</div>`;
}

function colophon() {
  return `<div class="colophon">${mark('colophon')}
  <h2>About This Report</h2>
  <p>This document is the standalone, long-form companion to the RealLearn AI engineering dashboard. It is written
  for three audiences at once: a product reviewer who wants to understand what the platform does and why; an
  engineer who needs a faithful map of the code before touching it; and the project's own future maintainers —
  human or AI agent — for whom the repository's <code>docs/AGENT_MEMORY.md</code> protocol makes written memory a
  first-class artifact.</p>
  <p>The report is organized in four parts and six appendices. Parts I–IV are narrative chapters grounded in direct
  reading of the source; the appendices are generated mechanically from the same dataset that powers the dashboard,
  so the two artifacts can never disagree.</p>
  <div class="kv">
    <div><b>Repository</b><span>github.com/${data.repo}</span></div>
    <div><b>Branch analyzed</b><span>${data.branchAnalyzed} (HEAD at ${data.commits[0].hash}, ${T.lastCommitDate})</span></div>
    <div><b>Dataset</b><span>reports/src/data.json — regenerate with <code>node reports/src/collect-data.js</code></span></div>
    <div><b>Code measured</b><span>${fmt(T.totalLines)} lines across ${T.codeFiles} files (lock files excluded)</span></div>
    <div><b>History measured</b><span>${fmt(T.commits)} commits, ${T.mergedPRs} merged pull requests, ${T.authors} authors</span></div>
    <div><b>Documentation corpus</b><span>${T.docFiles} Markdown documents, ~${fmt(T.docWords)} words</span></div>
    <div><b>Worked example</b><span>Chapter 3 follows one real pipeline run for the question “Why does Real Madrid win so many Champions League finals?” — lesson excerpts there are illustrative and labeled as such.</span></div>
    <div><b>Generated</b><span>${data.generatedAt.replace('T', ' ').slice(0, 16)} UTC</span></div>
  </div>
  <p>Where the code and the documentation disagree, the chapters say so explicitly and side with the code. Claims about
  external facts (for example, Real Madrid's fifteen European Cups) are common public record and are used only to
  illustrate lesson content.</p>
</div>`;
}

function tocHtml(pageOf) {
  const pg = (id) => {
    const n = pageOf && pageOf[id];
    return `<span class="t-page">${n ? n : '·'}</span>`;
  };
  let rows = '';
  for (const part of PARTS) {
    const first = chapters.find((c) => c.num === part.range[0]);
    rows += `<div class="toc-part"><span>Part ${part.roman} — ${esc(part.title)}</span></div>`;
    for (const c of chapters.filter((x) => partOf(x.num) === part)) {
      rows += `<div class="toc-row"><span class="t-num">${c.num}</span><span class="t-title">${esc(c.title)}</span><span class="t-dots"></span>${pg(c.id)}</div>`;
    }
  }
  rows += `<div class="toc-part"><span>Appendices</span></div>`;
  for (const a of APPENDICES) {
    rows += `<div class="toc-row"><span class="t-num">${a.letter}</span><span class="t-title">${esc(a.title)}</span><span class="t-dots"></span>${pg(`app-${a.letter}`)}</div>`;
  }
  return `<div class="toc">${mark('toc')}<h2>Contents</h2>${rows}</div>`;
}

function partDivider(part) {
  const list = chapters.filter((c) => partOf(c.num) === part)
    .map((c) => `<li><b>${c.num}</b>${esc(c.title)}</li>`).join('');
  return `<div class="part-divider">${mark(`part-${part.roman}`)}
    <div class="pd-num">${part.roman}</div>
    <h2>${esc(part.title)}</h2>
    <p class="pd-desc">${esc(part.desc)}</p>
    <ul>${list}</ul>
  </div>`;
}

// ------------------------------------------------------------- appendices
function appOpener(letter, title, lede) {
  return `${mark(`app-${letter}`)}<div class="chapter-opener">
    <div class="chapter-kicker">Appendix ${letter}</div>
    <h1><span class="ch-num">${letter}</span>${esc(title)}</h1>
    <p class="chapter-lede">${esc(lede)}</p>
  </div>`;
}

function appendixA() {
  const langRows = Object.entries(data.byLang).sort((a, b) => b[1].lines - a[1].lines)
    .map(([lang, v]) => `<tr><td>${esc(lang)}</td><td class="num">${fmt(v.files)}</td><td class="num">${fmt(v.lines)}</td><td class="num">${kb(v.bytes)}</td></tr>`).join('');
  const areaRows = Object.entries(data.byArea).sort((a, b) => b[1].lines - a[1].lines)
    .map(([area, v]) => `<tr><td>${esc(area)}</td><td class="num">${fmt(v.files)}</td><td class="num">${fmt(v.lines)}</td><td class="num">${kb(v.bytes)}</td></tr>`).join('');
  const fileRows = data.files.map((f) =>
    `<tr><td class="mono">${esc(f.path)}</td><td>${esc(f.area)}</td><td>${esc(f.lang)}</td><td class="num">${fmt(f.lines)}</td><td class="num">${kb(f.bytes)}</td></tr>`).join('');
  return `<section class="appendix">
  ${appOpener('A', 'Complete File Inventory', `Every tracked source file in the repository — ${T.codeFiles} files, ${fmt(T.totalLines)} lines — measured from the working tree. Lock files are excluded from line counts.`)}
  <h2>Lines by language</h2>
  <table class="data"><thead><tr><th>Language</th><th class="num">Files</th><th class="num">Lines</th><th class="num">KB</th></tr></thead><tbody>${langRows}</tbody></table>
  <h2>Lines by area</h2>
  <table class="data"><thead><tr><th>Area</th><th class="num">Files</th><th class="num">Lines</th><th class="num">KB</th></tr></thead><tbody>${areaRows}</tbody></table>
  <h2>Every file</h2>
  <table class="data"><thead><tr><th>Path</th><th>Area</th><th>Language</th><th class="num">Lines</th><th class="num">KB</th></tr></thead><tbody>${fileRows}</tbody></table>
</section>`;
}

function appendixB() {
  const rows = data.dependencies.map((d) =>
    `<tr><td class="mono">${esc(d.name)}</td><td class="mono">${esc(d.version)}</td><td>${esc(d.area)}</td><td>${esc(d.kind)}</td></tr>`).join('');
  return `<section class="appendix">
  ${appOpener('B', 'Dependency Register', `All ${T.dependencies} direct dependencies declared in frontend/package.json and backend/package.json, with the exact version ranges pinned in the manifests.`)}
  <table class="data"><thead><tr><th>Package</th><th>Version</th><th>Area</th><th>Kind</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="callout"><div class="callout-title">Reading the register</div>
  <p>The runtime frontend list is dominated by the framework tier (next, react, react-dom), the auth tier (Clerk), and state (zustand); the backend list is a deliberately small Express surface. Transitive dependencies are resolved in the two package-lock.json files, which together account for the bulk of the repository's byte size.</p></div>
</section>`;
}

function appendixC() {
  const months = {};
  for (const c of data.commits) {
    const m = c.date.slice(0, 7);
    (months[m] = months[m] || []).push(c);
  }
  let body = '';
  for (const m of Object.keys(months).sort()) {
    const rows = months[m].slice().reverse().map((c) =>
      `<tr><td>${c.date}</td><td class="mono">${c.hash}</td><td>${esc(c.author)}</td><td>${esc(c.subject.length > 96 ? c.subject.slice(0, 93) + '…' : c.subject)}</td></tr>`).join('');
    body += `<h2>${m} — ${months[m].length} commits</h2>
    <table class="data"><thead><tr><th>Date</th><th>Hash</th><th>Author</th><th>Subject</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  return `<section class="appendix">
  ${appOpener('C', 'Complete Commit Log', `All ${fmt(T.commits)} commits on ${data.branchAnalyzed}, oldest first within each month, exactly as recorded in git history from ${T.firstCommitDate} to ${T.lastCommitDate}.`)}
  ${body}
</section>`;
}

function appendixD() {
  const rows = data.cssTokens.map((t) =>
    `<tr><td class="mono">${esc(t.token)}</td><td class="mono">${esc(t.value)}</td></tr>`).join('');
  return `<section class="appendix">
  ${appOpener('D', 'Design Token Reference', `The ${T.designTokens} CSS custom properties defined in frontend/app/globals.css (${fmt(T.cssLines)} lines), listed with the first value each token is assigned.`)}
  <table class="data"><thead><tr><th>Token</th><th>First assigned value</th></tr></thead><tbody>${rows}</tbody></table>
</section>`;
}

function inferService(v) {
  if (/CLERK/.test(v)) return 'Clerk (auth)';
  if (/CEREBRAS/.test(v)) return 'Cerebras (AI primary)';
  if (/^(CF_|CLOUDFLARE)/.test(v)) return 'Cloudflare (AI fallback)';
  if (/GROQ/.test(v)) return 'Groq (AI provider)';
  if (/SAMBANOVA|SAMBA/.test(v)) return 'SambaNova (AI provider)';
  if (/GEMINI|GOOGLE/.test(v)) return 'Google AI';
  if (/SERPER/.test(v)) return 'Serper (news grounding)';
  if (/MONGO/.test(v)) return 'MongoDB (cache/persistence)';
  if (/^NEXT_PUBLIC_/.test(v)) return 'Frontend (public)';
  if (/SENTRY/.test(v)) return 'Sentry (monitoring)';
  if (/REDIS|UPSTASH/.test(v)) return 'Redis / Upstash';
  if (/PORT|NODE_ENV|HOST/.test(v)) return 'Runtime';
  if (/CORS|ORIGIN|CSP/.test(v)) return 'Security config';
  if (/TTS|SPEECH|EDGE/.test(v)) return 'Text-to-speech';
  return 'Application';
}
function appendixE() {
  const rows = data.envVars.map((v) =>
    `<tr><td class="mono">${esc(v)}</td><td>${inferService(v)}</td></tr>`).join('');
  return `<section class="appendix">
  ${appOpener('E', 'Environment Variable Reference', `The ${T.envVars} distinct environment variables referenced via process.env across the codebase, with the service each name points to (inferred from the variable name).`)}
  <table class="data"><thead><tr><th>Variable</th><th>Service</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="callout"><div class="callout-title">Secrets hygiene</div>
  <p>No secret values are stored in the repository; all of these are injected by Vercel (frontend) and Render (backend) at deploy time. Variables prefixed NEXT_PUBLIC_ are compiled into the client bundle by Next.js and must never hold secrets.</p></div>
</section>`;
}

function appendixF() {
  const epRows = data.endpoints.map((e) =>
    `<tr><td class="mono">${e.method}</td><td class="mono">${esc(e.path)}</td></tr>`).join('');
  const groups = Object.entries(data.inventory.componentGroups)
    .map(([g, list]) => `<tr><td class="mono">components/${esc(g)}</td><td class="num">${list.length}</td><td>${esc(list.join(', '))}</td></tr>`).join('');
  const pageRows = data.inventory.pages.map((p) => `<tr><td class="mono">${esc(p)}</td></tr>`).join('');
  const docRows = data.docsList.sort((a, b) => b.words - a.words).map((d) =>
    `<tr><td class="mono">${esc(d.path)}</td><td class="num">${fmt(d.lines)}</td><td class="num">${fmt(d.words)}</td></tr>`).join('');
  const list = (arr) => arr.map((x) => `<code>${esc(x.split('/').pop())}</code>`).join(' · ');
  return `<section class="appendix">
  ${appOpener('F', 'Quick Reference', 'The one-page-per-topic lookup: API routes, component groups, pages, stores, hooks, libraries, and the documentation corpus.')}
  <h2>API routes (${T.endpoints})</h2>
  <table class="data"><thead><tr><th>Method</th><th>Path</th></tr></thead><tbody>${epRows}</tbody></table>
  <h2>Component groups (${T.components} components)</h2>
  <table class="data"><thead><tr><th>Directory</th><th class="num">Count</th><th>Components</th></tr></thead><tbody>${groups}</tbody></table>
  <h2>Pages (${T.pages})</h2>
  <table class="data"><thead><tr><th>Route file</th></tr></thead><tbody>${pageRows}</tbody></table>
  <h2>Stores, hooks &amp; client libraries</h2>
  <p><strong>Stores (${T.stores}):</strong> ${list(data.inventory.stores)}</p>
  <p><strong>Hooks (${T.hooks}):</strong> ${list(data.inventory.hooks)}</p>
  <p><strong>Frontend lib (${T.frontendLibs}):</strong> ${list(data.inventory.frontendLibs)}</p>
  <p><strong>Backend lib (${T.backendLibs}):</strong> ${list(data.inventory.backendLibs)}</p>
  <h2>Documentation corpus (${T.docFiles} files, ~${fmt(T.docWords)} words)</h2>
  <table class="data"><thead><tr><th>Document</th><th class="num">Lines</th><th class="num">Words</th></tr></thead><tbody>${docRows}</tbody></table>
</section>`;
}

const APPENDICES = [
  { letter: 'A', title: 'Complete File Inventory', build: appendixA },
  { letter: 'B', title: 'Dependency Register', build: appendixB },
  { letter: 'C', title: 'Complete Commit Log', build: appendixC },
  { letter: 'D', title: 'Design Token Reference', build: appendixD },
  { letter: 'E', title: 'Environment Variable Reference', build: appendixE },
  { letter: 'F', title: 'Quick Reference', build: appendixF },
];

// ------------------------------------------------------------- assembly
function buildDocument(pageOf) {
  let body = cover() + colophon() + tocHtml(pageOf);
  for (const part of PARTS) {
    body += partDivider(part);
    for (const c of chapters.filter((x) => partOf(x.num) === part)) {
      body += c.html.replace('<div class="chapter-opener">', `${mark(c.id)}<div class="chapter-opener">`);
    }
  }
  body += `<div class="part-divider">${mark('part-app')}
    <div class="pd-num">A–F</div><h2>Appendices</h2>
    <p class="pd-desc">Mechanically generated reference material: every file, every dependency, every commit, every design token, every environment variable — straight from the dataset, with no editorial layer.</p>
    <ul>${APPENDICES.map((a) => `<li><b>${a.letter}</b>${esc(a.title)}</li>`).join('')}</ul></div>`;
  for (const a of APPENDICES) body += a.build();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>RealLearn AI — The Complete Engineering &amp; Product Report</title>
<style>${css}</style></head><body>${body}</body></html>`;
}

module.exports = { buildDocument, chapters, PARTS, APPENDICES, data };

// ------------------------------------------------------------- render
async function render(page, html, outPath) {
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.evaluateHandle('document.fonts.ready');
  return page.pdf({
    path: outPath || undefined,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    margin: { top: '13mm', bottom: '16mm', left: '16mm', right: '16mm' },
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-family:system-ui,sans-serif;font-size:7px;color:#8a8f98;padding:0 16mm;display:flex;justify-content:space-between;">
      <span>RealLearn AI — The Complete Engineering &amp; Product Report</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    timeout: 300000,
  });
}

if (require.main === module) (async () => {
  const puppeteer = require('puppeteer');
  const pdfParse = require('pdf-parse');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();

  console.log('Pass 1: measuring page positions…');
  const pass1 = await render(page, buildDocument(null), null);

  const pageTexts = [];
  await pdfParse(Buffer.from(pass1), {
    pagerender: (p) => p.getTextContent().then((tc) => {
      const txt = tc.items.map((i) => i.str).join('');
      pageTexts.push(txt);
      return txt;
    }),
  });
  const pageOf = {};
  pageTexts.forEach((txt, i) => {
    for (const m of txt.matchAll(/@@PG:([A-Za-z0-9_-]+)@@/g)) {
      if (!(m[1] in pageOf)) pageOf[m[1]] = i + 1;
    }
  });
  console.log(`Pass 1 rendered ${pageTexts.length} pages; ${Object.keys(pageOf).length} anchors found.`);

  console.log('Pass 2: final render with true TOC…');
  await render(page, buildDocument(pageOf), OUT);
  await browser.close();

  const bytes = fs.statSync(OUT).size;
  console.log(`Wrote ${OUT} — ${pageTexts.length} pages (pass 1), ${(bytes / 1024 / 1024).toFixed(2)} MB.`);
})().catch((e) => { console.error(e); process.exit(1); });
