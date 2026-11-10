/**
 * Build-time view of staged indexing: reads `INDEX_STAGE` and `INDEX_FUNDS` from the environment and,
 * at stage `funds`, the dataset (to find the largest funds). Node only; used by the page layout and the
 * sitemap setup in astro.config.mjs. The rules themselves are in indexStage.ts.
 */
import { loadScreener } from './data.ts';
import { hreflangAllowed, isIndexable, parseStage, parseTopFunds, topFundSlugs, type Stage } from './indexStage.ts';

let top: { n: number; slugs: Set<string> } | null = null;

/** The stage for this build; throws on an invalid `INDEX_STAGE`. */
export function currentStage(): Stage {
  return parseStage(process.env.INDEX_STAGE);
}

function topFunds(): Set<string> {
  const n = parseTopFunds(process.env.INDEX_FUNDS);
  if (!top || top.n !== n) top = { n, slugs: topFundSlugs(loadScreener(), n) };
  return top.slugs;
}

/**
 * Is this page open to Google in this build?
 *
 * @param path - Site path, e.g. `/hi/tools/sip-calculator/`.
 */
export function pageIndexable(path: string): boolean {
  const stage = currentStage();
  return isIndexable(path, stage, stage === 'funds' ? topFunds() : undefined);
}

/**
 * May `hreflang` links tie these pages together in this build?
 *
 * @param paths - A page and its alternates in other languages.
 */
export function hreflangOk(paths: readonly string[]): boolean {
  const stage = currentStage();
  return hreflangAllowed(paths, stage, stage === 'funds' ? topFunds() : undefined);
}
