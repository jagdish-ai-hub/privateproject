/**
 * Build-time data access for static pages (fund, category, AMC pages).
 * Node only: reads the files written by `npm run data:build`. Never import this from a
 * browser component.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fundSlug } from './slug.ts';
import { METRIC_KEYS, type MetricKey, type ScreenerData } from './screener/types.ts';

/** Everything the fund page needs about one scheme. */
export interface Fund {
  /** Row index in the columnar data. */
  index: number;
  code: number;
  slug: string;
  name: string;
  amc: string;
  category: string;
  assetClass: string;
  schemeType: string;
  plan: string;
  option: string;
  nav: number;
  /** Day number of the latest NAV. */
  navDate: number;
  /** Day number of the first NAV. */
  inception: number;
  isin: string | null;
  metrics: Record<MetricKey, number | null>;
  /** Rank among peers (same category + plan + option), where available. */
  ranks: Record<'r1y' | 'r3y' | 'r5y', { rank: number; of: number } | null>;
  /** 0 = plain, 1 = adjusted for unit splits, 2 = early history dropped at an unexplained NAV jump. */
  adj: number;
}

let cached: ScreenerData | null = null;
let cachedIsin: (string | null)[] | null = null;

/** ISINs aligned with the dataset rows (kept out of the public file; static pages only). */
function loadIsins(): (string | null)[] {
  if (cachedIsin) return cachedIsin;
  const path = 'data/generated/extra.json';
  cachedIsin = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as { isin: (string | null)[] }).isin : [];
  return cachedIsin;
}

/**
 * Read `public/data/screener.json` (cached after the first call).
 *
 * @returns The dataset.
 * @throws If the file is missing (run `npm run data:build` first).
 */
export function loadScreener(): ScreenerData {
  if (cached) return cached;
  const path = 'public/data/screener.json';
  if (!existsSync(path)) throw new Error('public/data/screener.json not found. Run `npm run data:build` first.');
  cached = JSON.parse(readFileSync(path, 'utf8')) as ScreenerData;
  return cached;
}

/**
 * Materialise one row of the columnar data as a {@link Fund}.
 *
 * @param data - The dataset.
 * @param i - Row index.
 * @returns The fund.
 */
export function fundAt(data: ScreenerData, i: number): Fund {
  const rank = (k: 'r1y' | 'r3y' | 'r5y'): { rank: number; of: number } | null => {
    const r = data.ranks[`${k}Rank`]?.[i];
    const of = data.ranks[`${k}Of`]?.[i];
    return r === null || r === undefined || !of ? null : { rank: r, of };
  };
  return {
    index: i,
    code: data.code[i],
    slug: fundSlug(data.name[i], data.code[i]),
    name: data.name[i],
    amc: data.dict.amc[data.amc[i]],
    category: data.dict.category[data.category[i]],
    assetClass: data.dict.assetClass[data.assetClass[i]],
    schemeType: data.dict.schemeType[data.schemeType[i]],
    plan: data.dict.plan[data.plan[i]],
    option: data.dict.option[data.option[i]],
    nav: data.nav[i],
    navDate: data.navDate[i],
    inception: data.inception[i],
    isin: loadIsins()[i] ?? null,
    adj: data.adj[i],
    metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, data.metrics[k][i]])) as Fund['metrics'],
    ranks: { r1y: rank('r1y'), r3y: rank('r3y'), r5y: rank('r5y') },
  };
}

/** Chart series for one fund: day numbers and NAVs, ascending. */
export interface ChartData {
  d: number[];
  n: number[];
  /** `[day, factor]` unit splits the history was adjusted for. */
  splits?: [number, number][];
  /** `[day, ratio]` unexplained jumps (history before the last one was dropped). */
  breaks?: [number, number][];
  /** Day numbers of removed one-day data glitches. */
  spikes?: number[];
}

/**
 * Read the pre-thinned chart series for a scheme.
 *
 * @param code - Scheme code.
 * @returns The series, or `null` if the file does not exist.
 */
export function loadNav(code: number): ChartData | null {
  const path = `data/generated/nav/${code}.json`;
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as ChartData) : null;
}

/**
 * Peer funds: same category, plan and option, best 3-year return first (funds with no 3Y
 * value come after, by 1-year return), excluding the fund itself.
 *
 * @param data - The dataset.
 * @param f - The fund.
 * @param limit - How many to return.
 * @returns Row indices of peers.
 */
export function peersOf(data: ScreenerData, f: Fund, limit = 6): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.count; i++) {
    if (i === f.index) continue;
    if (data.category[i] === data.category[f.index] && data.plan[i] === data.plan[f.index] && data.option[i] === data.option[f.index]) out.push(i);
  }
  const score = (i: number): number => data.metrics.r3y[i] ?? (data.metrics.r1y[i] ?? -Infinity) - 1000;
  return out.sort((a, b) => score(b) - score(a)).slice(0, limit);
}
