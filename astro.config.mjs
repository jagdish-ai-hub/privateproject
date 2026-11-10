// @ts-check
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { REVIEWED_ON } from './src/data/author.ts';
import { GROUPS, groupOf, parseStage, parseTopFunds } from './src/lib/indexStage.ts';
import { pageIndexable } from './src/lib/indexing.ts';

// SITE_URL is set in CI / hosting; the placeholder keeps canonical URLs valid locally.
// `||`, not `??`: GitHub Actions passes an unset variable as an empty string, which is not nullish and is not a valid URL.
const site = process.env.SITE_URL || 'https://mf-screener.example.com';

// Staged indexing (see src/lib/indexStage.ts): fail the build at once on a mistyped setting.
parseStage(process.env.INDEX_STAGE);
parseTopFunds(process.env.INDEX_FUNDS);

// Sitemap <lastmod>: a guide's own review date; the review date for calculators, scheme and author pages;
// the newest NAV date for pages built from fund data (home, fund, category and fund-house pages).
/** @type {Map<string, string>} */
const guideDates = new Map();
for (const dir of ['learn', 'learn-hi']) {
  const base = `./src/content/${dir}`;
  if (!existsSync(base)) continue;
  for (const f of readdirSync(base).filter((n) => n.endsWith('.md'))) {
    const m = /^dateModified:\s*"(\d{4}-\d{2}-\d{2})"/m.exec(readFileSync(`${base}/${f}`, 'utf8'));
    if (m) guideDates.set(`${dir === 'learn' ? '' : '/hi'}/learn/${f.replace(/\.md$/, '')}/`, m[1]);
  }
}
const dataPath = './public/data/screener.json';
const dataAsOf = existsSync(dataPath) ? /** @type {{ asOf?: string }} */ (JSON.parse(readFileSync(dataPath, 'utf8'))).asOf : undefined;

/** @param {string} path */
function lastmodFor(path) {
  if (guideDates.has(path)) return guideDates.get(path);
  if (/^\/(hi\/)?(tools|schemes|author)\//.test(path)) return REVIEWED_ON;
  if (dataAsOf && (path === '/' || /^\/(fund|category|amc)\//.test(path))) return dataAsOf;
  return undefined;
}

export default defineConfig({
  trailingSlash: 'always',
  site,
  // OUT_DIR lets the stage check (scripts/check-stages.mjs) build several variants side by side.
  outDir: process.env.OUT_DIR || './dist',
  integrations: [
    preact({ compat: false }),
    mdx(),
    sitemap({
      // Only pages open to Google at this INDEX_STAGE (never the on-demand /fund/ page), in one sitemap file per group
      // (sitemap-en-0.xml, sitemap-hi-0.xml, ...) so Search Console shows how each group is indexed.
      filter: (page) => pageIndexable(new URL(page).pathname),
      chunks: Object.fromEntries(GROUPS.map((g) => [g, (/** @type {import('@astrojs/sitemap').SitemapItem} */ item) => (groupOf(new URL(item.url).pathname) === g ? item : undefined)])),
      serialize(item) {
        const lastmod = lastmodFor(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
