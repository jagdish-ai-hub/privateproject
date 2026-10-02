import { downsample } from '../../src/lib/calc/downsample.ts';
import type { NavSeries } from '../../src/lib/calc/series.ts';

/** Max points kept for the part of the history older than one year. */
export const OLD_POINTS = 700;

/**
 * Prepare a series for the fund-page chart.
 *
 * The most recent year is kept at full daily resolution (so the 1M / 3M / 6M / 1Y buttons
 * are exact), while older history is thinned with LTTB to at most {@link OLD_POINTS}
 * points. The first and last points of the whole history are always kept, so range changes
 * shown on the chart equal the returns table.
 *
 * @param s - Clean full series.
 * @returns A smaller, still ascending series.
 */
export function chartSeries(s: NavSeries): NavSeries {
  const n = s.days.length;
  if (n === 0) return s;
  const cut = s.days[n - 1] - 366;
  let split = s.days.findIndex((d) => d >= cut);
  if (split < 0) split = n;
  if (split <= OLD_POINTS) return s;
  const old = downsample({ days: s.days.slice(0, split + 1), navs: s.navs.slice(0, split + 1) }, OLD_POINTS);
  // `old` ends at index `split`, which is also the first recent point: drop the duplicate.
  return {
    days: [...old.days.slice(0, -1), ...s.days.slice(split)],
    navs: [...old.navs.slice(0, -1), ...s.navs.slice(split)],
  };
}
