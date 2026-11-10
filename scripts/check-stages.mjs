/**
 * Builds the site once per INDEX_STAGE (into .stage-check/<stage>) and checks that what is in the HTML and the
 * sitemaps matches the stage: held-back pages are tagged noindex and left out of the sitemaps, open pages are
 * not tagged and are all in a sitemap, hreflang links only join open pages, and a mistyped stage fails the build.
 * Usage: node scripts/check-stages.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { groupOf } from '../src/lib/indexStage.ts';

const base = join(process.cwd(), '.stage-check');
rmSync(base, { recursive: true, force: true });
const problems = [];
const fail = (stage, msg) => problems.push(`[${stage}] ${msg}`);

/** What each stage must open: the number of open pages per group (null = at least one, a number = exactly that many). */
const PLAN = [
  { stage: 'en', env: { MAX_FUND_PAGES: '5' }, open: { en: null, hi: 0, lists: 0, funds: 0 } },
  { stage: 'core', env: { MAX_FUND_PAGES: '5' }, open: { en: null, hi: null, lists: 0, funds: 0 } },
  { stage: 'lists', env: { MAX_FUND_PAGES: '5' }, open: { en: null, hi: null, lists: null, funds: 0 } },
  { stage: 'funds', env: { INDEX_FUNDS: '3' }, open: { en: null, hi: null, lists: null, funds: 3 } },
  { stage: 'all', env: { MAX_FUND_PAGES: '5' }, open: { en: null, hi: null, lists: null, funds: 5 } },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

for (const { stage, env, open } of PLAN) {
  const outDir = join(base, stage);
  const r = spawnSync('npx', ['astro', 'build'], { env: { ...process.env, ...env, INDEX_STAGE: stage, OUT_DIR: outDir, SITE_URL: 'https://example.test' }, encoding: 'utf8' });
  if (r.status !== 0) { fail(stage, `build failed:\n${r.stdout}\n${r.stderr}`); continue; }
  if (!existsSync(join(outDir, 'sitemap-index.xml'))) { fail(stage, 'no sitemap-index.xml'); continue; }

  // Pages: path, noindex tag, hreflang links.
  const pages = new Map();
  for (const f of walk(outDir).filter((p) => p.endsWith('.html'))) {
    const path = f.slice(outDir.length).replace(/index\.html$/, '');
    if (path === '/404.html') continue;
    const html = readFileSync(f, 'utf8');
    pages.set(path, {
      noindex: /<meta name="robots" content="[^"]*noindex/.test(html),
      alternates: [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ lang: m[1], path: new URL(m[2]).pathname })),
      switchLink: html.includes('data-testid="lang-switch"'),
    });
  }
  const openPages = [...pages].filter(([, v]) => !v.noindex).map(([p]) => p);

  // Sitemaps.
  const index = readFileSync(join(outDir, 'sitemap-index.xml'), 'utf8');
  const children = [...index.matchAll(/<loc>[^<]*?\/(sitemap-[a-z]+-\d+\.xml)<\/loc>/g)].map((m) => m[1]);
  const all = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
  if (children.length === 0 || children.length !== all) fail(stage, `sitemap index lists ${all} files, ${children.length} with an expected name`);
  const inMap = new Set();
  for (const c of children) {
    const group = /^sitemap-([a-z]+)-/.exec(c)[1];
    const locs = [...readFileSync(join(outDir, c), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    if (locs.length === 0) fail(stage, `${c} is empty`);
    for (const p of locs) {
      if (groupOf(p) !== group) fail(stage, `${p} is in ${c}`);
      inMap.add(p);
    }
  }
  if (children.some((c) => c.startsWith('sitemap-pages-'))) fail(stage, 'a catch-all sitemap file exists: some page is in no group');
  for (const p of openPages) if (!inMap.has(p)) fail(stage, `${p} is open but not in a sitemap`);
  for (const p of inMap) if (!pages.has(p) || pages.get(p).noindex) fail(stage, `${p} is in a sitemap but tagged noindex or missing`);

  // Counts per group.
  const n = { en: 0, hi: 0, lists: 0, funds: 0 };
  for (const p of openPages) { const g = groupOf(p); if (g !== 'ondemand') n[g]++; else fail(stage, `${p} (on-demand) must be noindex`); }
  for (const [g, want] of Object.entries(open)) {
    if (want === null ? n[g] === 0 : n[g] !== want) fail(stage, `open ${g} pages: ${n[g]}, expected ${want === null ? 'at least 1' : want}`);
  }
  if (!pages.get('/fund/')?.noindex) fail(stage, '/fund/ is not tagged noindex');
  if (pages.get('/')?.noindex) fail(stage, 'the home page is tagged noindex');

  // hreflang only between open pages, never from or to a held-back page.
  for (const [p, v] of pages) {
    if (v.alternates.length === 0) continue;
    if (v.noindex) fail(stage, `${p} is noindex but has hreflang links`);
    for (const a of v.alternates) if (pages.get(a.path)?.noindex) fail(stage, `${p} points hreflang at held-back ${a.path}`);
  }
  const en = pages.get('/tools/sip-calculator/');
  const hi = pages.get('/hi/tools/sip-calculator/');
  const paired = stage !== 'en';
  if (!en || !hi) fail(stage, 'SIP calculator pages missing');
  else {
    if (en.alternates.some((a) => a.lang === 'hi-IN') !== paired) fail(stage, `English SIP page hreflang hi-IN should be ${paired ? 'present' : 'absent'}`);
    if (hi.alternates.some((a) => a.lang === 'en-IN') !== paired) fail(stage, `Hindi SIP page hreflang en-IN should be ${paired ? 'present' : 'absent'}`);
    if (!en.switchLink || !hi.switchLink) fail(stage, 'the language switch is missing: visitors can no longer move between languages');
    if (hi.noindex !== !paired) fail(stage, `Hindi SIP page noindex should be ${!paired}`);
  }
  console.log(`stage ${stage}: ${openPages.length} open of ${pages.size} pages, ${children.length} sitemap files (${JSON.stringify(n)})`);
}

// A mistyped stage must stop the build, not quietly pick another one.
const bad = spawnSync('npx', ['astro', 'build'], { env: { ...process.env, INDEX_STAGE: 'everything', OUT_DIR: join(base, 'bad') }, encoding: 'utf8' });
if (bad.status === 0) problems.push('a mistyped INDEX_STAGE did not fail the build');
else if (!`${bad.stdout}${bad.stderr}`.includes('INDEX_STAGE must be one of')) problems.push('a mistyped INDEX_STAGE failed with an unclear message');

rmSync(base, { recursive: true, force: true });
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.slice(0, 40).join('\n- ')}`);
  process.exit(1);
}
console.log('stage check passed');
