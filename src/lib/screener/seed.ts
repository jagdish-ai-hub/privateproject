import { applyView, prepare } from './query.ts';
import type { ScreenerData, ViewState } from './types.ts';
import { DEFAULT_VIEW } from './url.ts';

/**
 * The first rows of the default view as a small dataset, so the page can be built with real fund names and
 * numbers in its HTML (search engines and slow phones see them before the full data file arrives).
 * Same shape as `screener.json`, with only these rows; row `i` of the result is the i-th row shown.
 *
 * @param data - The full dataset.
 * @param size - How many rows (the default page size when omitted).
 * @returns The rows as a dataset, or `null` when the default view is empty (a tiny test dataset).
 */
export function seedFromDefaultView(data: ScreenerData, size: ViewState['size'] = DEFAULT_VIEW.size): ScreenerData | null {
  const { rows } = applyView(prepare(data), { ...DEFAULT_VIEW, size, page: 1 });
  if (rows.length === 0) return null;
  const pick = <T>(col: readonly T[]): T[] => rows.map((i) => col[i]);
  return {
    asOf: data.asOf,
    generatedAt: data.generatedAt,
    count: rows.length,
    dict: data.dict,
    code: pick(data.code),
    name: pick(data.name),
    amc: pick(data.amc),
    category: pick(data.category),
    assetClass: pick(data.assetClass),
    plan: pick(data.plan),
    option: pick(data.option),
    schemeType: pick(data.schemeType),
    nav: pick(data.nav),
    navDate: pick(data.navDate),
    inception: pick(data.inception),
    adj: pick(data.adj),
    ter: pick(data.ter),
    aum: pick(data.aum),
    terAsOf: data.terAsOf,
    aumPeriod: data.aumPeriod,
    metrics: Object.fromEntries(Object.entries(data.metrics).map(([k, v]) => [k, pick(v)])) as ScreenerData['metrics'],
    ranks: Object.fromEntries(Object.entries(data.ranks).map(([k, v]) => [k, pick(v)])),
  };
}
