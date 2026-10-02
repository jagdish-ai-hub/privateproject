import { parseDmy } from './dates.ts';

/**
 * A clean NAV time series: strictly ascending dates, one positive NAV per date.
 * Every calculation in this library takes this shape, so parsing happens once.
 */
export interface NavSeries {
  /** Day numbers (see dates.ts), strictly ascending. */
  days: number[];
  /** NAV on each day; same length as `days`, all > 0. */
  navs: number[];
}

/** One raw MFapi data row: `{ date: "01-10-2026", nav: "205.75400" }`. */
export interface RawNavRow {
  date: string;
  nav: string | number;
}

/**
 * Turn raw MFapi rows into a clean {@link NavSeries}.
 *
 * Rows with an unparseable date, a non-numeric NAV or NAV <= 0 are dropped.
 * Input order does not matter (MFapi sends newest first). If a date appears more
 * than once, the last occurrence in the input wins.
 *
 * @param rows - Raw rows as returned by MFapi `data`.
 * @returns A sorted, de-duplicated series (possibly empty).
 * @example
 * parseSeries([{ date: '02-01-2026', nav: '11' }, { date: '01-01-2026', nav: '10' }]).navs; // [10, 11]
 */
export function parseSeries(rows: readonly RawNavRow[]): NavSeries {
  const byDay = new Map<number, number>();
  for (const row of rows) {
    const day = parseDmy(String(row.date));
    const nav = typeof row.nav === 'number' ? row.nav : Number.parseFloat(row.nav);
    if (day === null || !Number.isFinite(nav) || nav <= 0) continue;
    byDay.set(day, nav);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  return { days, navs: days.map((d) => byDay.get(d) as number) };
}

/**
 * Index of the last point dated on or before `day` (binary search).
 *
 * @param series - Clean series.
 * @param day - Target day number.
 * @returns The index, or -1 if every point is after `day`.
 */
export function indexOnOrBefore(series: NavSeries, day: number): number {
  let lo = 0;
  let hi = series.days.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series.days[mid] <= day) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/**
 * Index of the first point dated on or after `day` (binary search).
 *
 * @param series - Clean series.
 * @param day - Target day number.
 * @returns The index, or -1 if every point is before `day`.
 */
export function indexOnOrAfter(series: NavSeries, day: number): number {
  let lo = 0;
  let hi = series.days.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series.days[mid] >= day) {
      ans = mid;
      hi = mid - 1;
    } else lo = mid + 1;
  }
  return ans;
}
