/**
 * "Popular comparisons" for the home page: in each chosen category, the two largest Direct Growth funds
 * by fund size. Picked by size (a fact, not a verdict) so the links are always valid and never promote
 * a fund for its returns. Pure function; the home page calls it at build time.
 */
import { shortName } from './compare.ts';
import type { ScreenerData } from './screener/types.ts';

/** One pair of funds to link to the compare page. */
export interface PopularPair {
  category: string;
  a: { code: number; name: string };
  b: { code: number; name: string };
}

/**
 * Find the two largest Direct Growth funds in each category.
 *
 * @param data - The dataset.
 * @param categories - Category names to look for, in display order.
 * @returns A pair per category that has at least two Direct Growth funds with a known fund size.
 */
export function popularPairs(data: ScreenerData, categories: readonly string[]): PopularPair[] {
  const out: PopularPair[] = [];
  for (const category of categories) {
    const ci = data.dict.category.indexOf(category);
    if (ci < 0) continue;
    const rows: number[] = [];
    for (let i = 0; i < data.count; i++) {
      if (data.category[i] === ci && data.dict.plan[data.plan[i]] === 'direct' && data.dict.option[data.option[i]] === 'growth' && data.aum?.[i] != null) rows.push(i);
    }
    rows.sort((x, y) => (data.aum[y] as number) - (data.aum[x] as number));
    if (rows.length < 2) continue;
    // Parenthetical notes such as "(erstwhile Bluechip Fund)" make chips too long; the fund page keeps the full name.
    const pick = (i: number) => ({ code: data.code[i], name: shortName(data.name[i]).replace(/\s*\([^)]*\)/g, '').trim() });
    out.push({ category, a: pick(rows[0]), b: pick(rows[1]) });
  }
  return out;
}
