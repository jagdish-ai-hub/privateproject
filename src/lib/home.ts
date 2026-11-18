/**
 * Lists for the home page, built from screener.json at build time: highest returns over a period and the
 * leading funds in popular categories. Pure functions (no file access) so they can be unit-tested.
 *
 * These are facts about past returns, never advice: the page labels them "highest returns over …", says
 * they are past figures, and leaves out sector and theme funds so a single industry bet does not fill a list.
 */
import { shortName } from './compare.ts';
import { fundHrefAt } from './fundLinks.ts';
import { slugify } from './slug.ts';
import { DEFAULT_VIEW, serializeView } from './screener/url.ts';
import type { MetricKey, ScreenerData, ViewState } from './screener/types.ts';

/** Return periods shown on the home page, shortest first. */
export const HOME_PERIODS = ['r1m', 'r3m', 'r1y', 'r3y', 'r5y'] as const;
/** One of {@link HOME_PERIODS}. */
export type HomePeriod = (typeof HOME_PERIODS)[number];

/** Smallest fund size (₹ crore, all plans) a fund needs to appear in the home lists. */
export const MIN_AUM = 500;
/** Categories left out of the "highest returns" lists: one-industry or one-theme bets. */
export const EXCLUDED_CATEGORIES = ['Sectoral / Thematic'] as const;

/** One fund in a home list. */
export interface HomeFund {
  code: number;
  name: string;
  category: string;
  /** Return as a fraction (0.12 = 12%). */
  value: number;
  aum: number | null;
  href: string;
}

/** Leading funds of one category. */
export interface CategoryTop {
  category: string;
  slug: string;
  /** Asset class of the category, used for the screener link (e.g. "Index Fund", "Hybrid", "Debt"). */
  assetClass: string;
  funds: HomeFund[];
}

const at = (data: ScreenerData, i: number, key: MetricKey): HomeFund | null => {
  const v = data.metrics[key][i];
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return {
    code: data.code[i],
    name: shortName(data.name[i]).replace(/\s*\([^)]*\)/g, ''),
    category: data.dict.category[data.category[i]],
    value: v,
    aum: data.aum?.[i] ?? null,
    href: fundHrefAt(data, i),
  };
};

const directGrowth = (data: ScreenerData, i: number): boolean =>
  data.dict.plan[data.plan[i]] === 'direct' && data.dict.option[data.option[i]] === 'growth';

const byValue = (a: HomeFund, b: HomeFund): number => b.value - a.value || (b.aum ?? 0) - (a.aum ?? 0) || a.code - b.code;

/**
 * Highest returns over one period among diversified equity funds: Direct plan, Growth option, asset class
 * Equity, not sector / theme, fund size of at least {@link MIN_AUM} crore.
 *
 * @param data - Screener data.
 * @param key - Period: r1m and r3m are absolute returns, r1y and longer are yearly (CAGR).
 * @param n - How many funds to return.
 * @returns Up to `n` funds, highest return first (ties: larger fund first).
 */
export function topByReturn(data: ScreenerData, key: HomePeriod, n = 10): HomeFund[] {
  const out: HomeFund[] = [];
  for (let i = 0; i < data.count; i++) {
    if (!directGrowth(data, i)) continue;
    if (data.dict.assetClass[data.assetClass[i]] !== 'Equity') continue;
    if ((EXCLUDED_CATEGORIES as readonly string[]).includes(data.dict.category[data.category[i]])) continue;
    const aum = data.aum?.[i];
    if (aum === null || aum === undefined || aum < MIN_AUM) continue;
    const f = at(data, i, key);
    if (f) out.push(f);
  }
  return out.sort(byValue).slice(0, n);
}

/**
 * The funds with the highest 3-year return (a year) in each category, Direct plan and Growth option.
 * Categories missing from the data, or with no fund that has a 3-year return, are left out.
 *
 * @param data - Screener data.
 * @param categories - Category names as they appear in `data.dict.category`.
 * @param n - Funds per category.
 * @returns One entry per category that has funds, in the order given.
 */
export function topByCategory(data: ScreenerData, categories: readonly string[], n = 3): CategoryTop[] {
  const out: CategoryTop[] = [];
  for (const category of categories) {
    const c = data.dict.category.indexOf(category);
    if (c < 0) continue;
    const funds: HomeFund[] = [];
    let assetClass = '';
    for (let i = 0; i < data.count; i++) {
      if (data.category[i] !== c || !directGrowth(data, i)) continue;
      const f = at(data, i, 'r3y');
      if (!f) continue;
      assetClass ||= data.dict.assetClass[data.assetClass[i]];
      funds.push(f);
    }
    if (funds.length === 0) continue;
    out.push({ category, slug: slugify(category), assetClass, funds: funds.sort(byValue).slice(0, n) });
  }
  return out;
}

/**
 * Link to the screener showing a list, sorted by a return. Starts from the default view (Direct, Growth,
 * equity) and changes only what is asked, so the link is as short as possible.
 *
 * @param opts - `key` to sort by (descending); `category` and `assetClass` to filter; `minAum` in crore.
 * @returns A path such as `/?min_aum=500&sort=r1y%3Adesc`.
 */
export function screenerHref(opts: { key?: MetricKey | 'aum'; category?: string; assetClass?: string; minAum?: number }): string {
  const view: ViewState = structuredClone(DEFAULT_VIEW);
  if (opts.category) view.filters.category = [opts.category];
  if (opts.assetClass) view.filters.assetClass = [opts.assetClass];
  if (opts.minAum !== undefined) view.filters.ranges = { aum: { min: opts.minAum } };
  if (opts.key) view.sort = { key: opts.key, dir: 'desc' };
  const qs = serializeView(view);
  return qs ? `/?${qs}` : '/';
}
