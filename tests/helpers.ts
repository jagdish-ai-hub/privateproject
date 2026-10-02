import { toDayNumber, type NavSeries } from '../src/lib/calc/index.ts';

/** Day number from an ISO string "YYYY-MM-DD". */
export function iso(text: string): number {
  const [y, m, d] = text.split('-').map(Number);
  return toDayNumber(y, m, d);
}

/** Build a NavSeries from `[isoDate, nav]` pairs (must already be ascending). */
export function series(pairs: [string, number][]): NavSeries {
  return { days: pairs.map(([d]) => iso(d)), navs: pairs.map(([, n]) => n) };
}

/** Daily series from `start` for `count` consecutive days; `nav(i)` gives the NAV on day i. */
export function daily(start: string, count: number, nav: (i: number) => number): NavSeries {
  const s = iso(start);
  return {
    days: Array.from({ length: count }, (_, i) => s + i),
    navs: Array.from({ length: count }, (_, i) => nav(i)),
  };
}
