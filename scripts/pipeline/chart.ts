import { addMonths } from '../../src/lib/calc/dates.ts';
import { downsample } from '../../src/lib/calc/downsample.ts';
import { indexOnOrBefore, type NavSeries } from '../../src/lib/calc/series.ts';

/** Max points kept (before anchors) for the part of the history older than one year. */
export const OLD_POINTS = 700;

/** Period lengths (months) whose exact start NAV must survive thinning. */
export const ANCHOR_MONTHS = [1, 3, 6, 12, 36, 60, 120];

/**
 * Prepare a series for the fund-page chart.
 *
 * - The most recent year is kept at full daily resolution, so the 1M / 3M / 6M / 1Y buttons
 *   are exact.
 * - Older history is thinned with LTTB to at most {@link OLD_POINTS} points, which keeps
 *   visual peaks and troughs.
 * - The exact NAV point used as the start of every standard period (see {@link ANCHOR_MONTHS})
 *   is always kept. So `periodReturn(chartSeries(s), m)` equals `periodReturn(s, m)` for
 *   those periods: the chart can never disagree with the returns table.
 * - The first and last points are always kept.
 *
 * @param s - Clean full series.
 * @returns A smaller, still strictly ascending series.
 */
export function chartSeries(s: NavSeries): NavSeries {
  const n = s.days.length;
  if (n === 0) return s;
  const last = s.days[n - 1];
  let split = s.days.findIndex((d) => d >= last - 366);
  if (split < 0) split = n;
  if (split <= OLD_POINTS) return s;

  const old = downsample({ days: s.days.slice(0, split + 1), navs: s.navs.slice(0, split + 1) }, OLD_POINTS);
  const keep = new Map<number, number>();
  old.days.forEach((d, i) => keep.set(d, old.navs[i]));
  for (let i = split; i < n; i++) keep.set(s.days[i], s.navs[i]);
  for (const m of ANCHOR_MONTHS) {
    const i = indexOnOrBefore(s, addMonths(last, -m));
    if (i >= 0) keep.set(s.days[i], s.navs[i]);
  }
  const days = [...keep.keys()].sort((a, b) => a - b);
  return { days, navs: days.map((d) => keep.get(d) as number) };
}
