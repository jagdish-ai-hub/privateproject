/**
 * Staged indexing: which pages Google may list, chosen by one build setting, `INDEX_STAGE`.
 *
 * Every page is always built and reachable for visitors. A page that is not open yet carries
 * `<meta name="robots" content="noindex, follow">`, is left out of the sitemap, and is not named in
 * `hreflang` links. Moving to the next stage is a change of the setting and a redeploy.
 *
 * | Stage   | Open to Google                                                 |
 * |---------|----------------------------------------------------------------|
 * | `en`    | the hand-written English pages (the default)                   |
 * | `core`  | + the Hindi pages                                              |
 * | `lists` | + the category and fund-house list pages                       |
 * | `funds` | + the largest funds by fund size (`INDEX_FUNDS`, default 250)  |
 * | `all`   | + every fund page                                              |
 *
 * This module is pure (no file access) so it can be unit tested; `indexing.ts` reads the environment.
 */
import { hasFundPage } from './fundLinks.ts';
import { fundSlug } from './slug.ts';
import type { ScreenerData } from './screener/types.ts';

export const STAGES = ['en', 'core', 'lists', 'funds', 'all'] as const;
export type Stage = (typeof STAGES)[number];

/** Used when `INDEX_STAGE` is not set: a forgotten setting can never open more than the English pages. */
export const DEFAULT_STAGE: Stage = 'en';
/** How many of the largest funds open at stage `funds` when `INDEX_FUNDS` is not set. */
export const DEFAULT_TOP_FUNDS = 250;

/** The sets of pages that open one after another. `ondemand` (the shared /fund/ page) never opens. */
export type PageGroup = 'en' | 'hi' | 'lists' | 'funds';
export const GROUPS: readonly PageGroup[] = ['en', 'hi', 'lists', 'funds'];

/**
 * Read the stage from the environment value.
 *
 * @param raw - The value of `INDEX_STAGE`; empty or unset means the default.
 * @returns The stage.
 * @throws If the value is not one of the stages (a typo must not silently pick another stage).
 */
export function parseStage(raw?: string | null): Stage {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === '') return DEFAULT_STAGE;
  if ((STAGES as readonly string[]).includes(v)) return v as Stage;
  throw new Error(`INDEX_STAGE must be one of ${STAGES.join(', ')} (got "${raw}")`);
}

/**
 * Read how many of the largest funds open at stage `funds`.
 *
 * @param raw - The value of `INDEX_FUNDS`; empty or unset means the default.
 * @returns A whole number, 0 or more.
 * @throws If the value is not a whole number.
 */
export function parseTopFunds(raw?: string | null): number {
  const v = (raw ?? '').trim();
  if (v === '') return DEFAULT_TOP_FUNDS;
  if (!/^\d+$/.test(v)) throw new Error(`INDEX_FUNDS must be a whole number (got "${raw}")`);
  return Number(v);
}

/** Path with a leading and a trailing slash, without query or fragment. */
function clean(path: string): string {
  const p = path.split('#')[0].split('?')[0];
  const lead = p.startsWith('/') ? p : `/${p}`;
  return lead.endsWith('/') ? lead : `${lead}/`;
}

/**
 * Which group a page belongs to.
 *
 * @param path - Site path, e.g. `/tools/sip-calculator/`.
 * @returns The group, or `ondemand` for the shared `/fund/` page that loads any fund in the browser.
 */
export function groupOf(path: string): PageGroup | 'ondemand' {
  const p = clean(path);
  if (p === '/hi/' || p.startsWith('/hi/')) return 'hi';
  if (p === '/fund/') return 'ondemand';
  if (p.startsWith('/fund/')) return 'funds';
  if (p.startsWith('/category/') || p.startsWith('/amc/')) return 'lists';
  return 'en';
}

/**
 * The fund pages that open at stage `funds`: the largest by fund size (AUM), ties broken by scheme code.
 *
 * @param data - The dataset.
 * @param n - How many to open.
 * @returns The slugs of those fund pages (only schemes that have a page of their own are considered).
 */
export function topFundSlugs(data: ScreenerData, n: number): Set<string> {
  const rows: { i: number; aum: number; code: number }[] = [];
  for (let i = 0; i < data.count; i++) {
    if (hasFundPage(data.dict.plan[data.plan[i]], data.dict.option[data.option[i]])) rows.push({ i, aum: data.aum?.[i] ?? -1, code: data.code[i] });
  }
  rows.sort((a, b) => b.aum - a.aum || a.code - b.code);
  return new Set(rows.slice(0, n).map((r) => fundSlug(data.name[r.i], data.code[r.i])));
}

/**
 * Is a page open to Google at this stage?
 *
 * @param path - Site path.
 * @param stage - The stage.
 * @param topFunds - Slugs of the funds open at stage `funds` (see {@link topFundSlugs}); only read at that stage.
 */
export function isIndexable(path: string, stage: Stage, topFunds: ReadonlySet<string> = new Set()): boolean {
  const g = groupOf(path);
  if (g === 'ondemand') return false;
  if (stage === 'all') return true;
  if (g === 'en') return true;
  if (g === 'hi') return stage !== 'en';
  if (g === 'lists') return stage === 'lists' || stage === 'funds';
  return stage === 'funds' && topFunds.has(clean(path).split('/')[2]);
}

/**
 * May `hreflang` links tie these pages together? Only when every one of them is open to Google:
 * a link to a page that is held back shows up in Search Console as an error and can make Google ignore the pair.
 *
 * @param paths - The page and its alternates in other languages.
 * @param stage - The stage.
 * @param topFunds - See {@link isIndexable}.
 */
export function hreflangAllowed(paths: readonly string[], stage: Stage, topFunds: ReadonlySet<string> = new Set()): boolean {
  return paths.every((p) => isIndexable(p, stage, topFunds));
}
