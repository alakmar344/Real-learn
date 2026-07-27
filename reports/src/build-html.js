#!/usr/bin/env node
/**
 * build-html.js — assembles the standalone HTML edition of the report.
 *
 * Reuses the exact same document assembly as build-pdf.js (chapters, front
 * matter, appendices, inlined pdf.css) and post-processes it for the browser:
 *   - the invisible @@PG:<id>@@ page markers become real anchor targets
 *   - the table of contents becomes clickable in-page links
 *   - a screen-only stylesheet is appended (centered column, link styling)
 *
 * The output is a single self-contained file with no external resources
 * (no images, no web fonts, no scripts) — it can be emailed, archived, or
 * opened from disk anywhere. Printing it from a browser still uses the
 * original print styles.
 *
 * Usage: node reports/src/build-html.js
 */
const fs = require('fs');
const path = require('path');
const { buildDocument } = require('./build-pdf.js');

const OUT = path.resolve(__dirname, '..', 'RealLearn-Complete-Report.html');

let html = buildDocument(null);

// 1. Turn invisible page markers into anchor targets. Chapter <section>
//    elements already declare id="ch-XX", so only add an id when the
//    document doesn't define it elsewhere (avoids duplicate ids).
const source = html;
html = html.replace(
  /<span class="pgmark">@@PG:([A-Za-z0-9_-]+)@@<\/span>/g,
  (m, id) => new RegExp(`id="${id}"`).test(source)
    ? '<span class="pgmark"></span>'
    : `<span class="pgmark" id="${id}"></span>`
);

// 2. Make TOC rows clickable. Chapter rows link to #ch-<num>, appendix rows
//    to #app-<letter>. Rows contain no nested divs, so a lazy match is safe.
html = html.replace(
  /<div class="toc-row"><span class="t-num">(\d{2})<\/span>([\s\S]*?)<\/div>/g,
  '<a class="toc-row" href="#ch-$1"><span class="t-num">$1</span>$2</a>'
);
html = html.replace(
  /<div class="toc-row"><span class="t-num">([A-F])<\/span>([\s\S]*?)<\/div>/g,
  '<a class="toc-row" href="#app-$1"><span class="t-num">$1</span>$2</a>'
);

// 3. Page-number cells have no meaning on screen — show a jump glyph instead.
html = html.replace(/<span class="t-page">·<\/span>/g, '<span class="t-page">→</span>');

// 4. Screen-only styles, appended so they win the cascade at equal specificity.
const screenCss = `
/* ---------- standalone HTML edition (screen only) ---------- */
@media screen {
  html { background: #e8eaee; }
  body {
    max-width: 210mm;
    margin: 0 auto;
    background: var(--paper);
    box-shadow: 0 0 24px rgba(16, 22, 35, 0.18);
  }
  body > :not(.cover) { padding-left: 16mm; padding-right: 16mm; }
  .cover { min-height: 90vh; }
  .pgmark { scroll-margin-top: 24px; }
  a { color: var(--accent); }
  a.toc-row { color: inherit; text-decoration: none; }
  a.toc-row:hover .t-title { color: var(--accent-bright); text-decoration: underline; }
  a.toc-row .t-page { color: var(--accent); }
}
@media print {
  a.toc-row { color: inherit; text-decoration: none; }
}`;
html = html.replace('</style>', `${screenCss}\n</style>`);

fs.writeFileSync(OUT, html);
const bytes = fs.statSync(OUT).size;
console.log(`Wrote ${OUT} — ${(bytes / 1024).toFixed(0)} KB, self-contained (no external resources).`);
