import type { NavSeries } from './series.ts';

/**
 * Reduce a series to at most `target` points with the Largest-Triangle-Three-Buckets
 * algorithm, which keeps visual peaks and troughs. The first and last points are always
 * kept, so the % change between the ends is unchanged (it matches the returns table).
 *
 * @param series - Clean series.
 * @param target - Maximum number of points (>= 3). Series at or under this size are returned as-is.
 * @returns A new, smaller series (still ascending).
 */
export function downsample(series: NavSeries, target: number): NavSeries {
  const n = series.days.length;
  if (target < 3 || n <= target) return series;
  const outDays: number[] = [series.days[0]];
  const outNavs: number[] = [series.navs[0]];
  const bucket = (n - 2) / (target - 2);
  let a = 0;
  for (let i = 0; i < target - 2; i++) {
    const nextStart = Math.floor((i + 1) * bucket) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * bucket) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let k = nextStart; k < nextEnd; k++) {
      avgX += series.days[k];
      avgY += series.navs[k];
    }
    const cnt = Math.max(1, nextEnd - nextStart);
    avgX /= cnt;
    avgY /= cnt;
    const start = Math.floor(i * bucket) + 1;
    const end = Math.floor((i + 1) * bucket) + 1;
    let best = start;
    let bestArea = -1;
    for (let k = start; k < end; k++) {
      const area = Math.abs(
        (series.days[a] - avgX) * (series.navs[k] - series.navs[a]) -
          (series.days[a] - series.days[k]) * (avgY - series.navs[a]),
      );
      if (area > bestArea) {
        bestArea = area;
        best = k;
      }
    }
    outDays.push(series.days[best]);
    outNavs.push(series.navs[best]);
    a = best;
  }
  outDays.push(series.days[n - 1]);
  outNavs.push(series.navs[n - 1]);
  return { days: outDays, navs: outNavs };
}
