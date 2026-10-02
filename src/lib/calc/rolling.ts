import { addMonths } from './dates.ts';
import { cagr, MAX_GAP_DAYS } from './returns.ts';
import { indexOnOrBefore, type NavSeries } from './series.ts';

/** Summary of rolling returns over every possible start date. */
export interface RollingStats {
  /** Mean of all rolling returns (fraction). */
  average: number;
  /** Lowest rolling return (fraction). */
  min: number;
  /** Highest rolling return (fraction). */
  max: number;
  /** Share of windows with a positive return, 0..1. */
  pctPositive: number;
  /** Number of windows evaluated. */
  count: number;
}

/**
 * Rolling returns: for every NAV date that has data `months` earlier, compute the
 * return over the trailing window (CAGR if >= 12 months, else absolute), then summarise.
 *
 * @param series - Clean series.
 * @param months - Window length in months (12 or 36 are typical).
 * @returns Summary stats, or `null` if the fund has no full window yet.
 */
export function rollingReturns(series: NavSeries, months: number): RollingStats | null {
  const values: number[] = [];
  for (let i = 0; i < series.days.length; i++) {
    const target = addMonths(series.days[i], -months);
    const j = indexOnOrBefore(series, target);
    if (j < 0 || j >= i || target - series.days[j] > MAX_GAP_DAYS) continue;
    const v = months >= 12
      ? cagr(series.navs[j], series.navs[i], series.days[i] - series.days[j])
      : series.navs[i] / series.navs[j] - 1;
    if (v !== null) values.push(v);
  }
  if (values.length === 0) return null;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let pos = 0;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    if (v > 0) pos++;
  }
  return { average: sum / values.length, min, max, pctPositive: pos / values.length, count: values.length };
}
