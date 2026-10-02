import { addMonths } from './dates.ts';
import { indexOnOrBefore, type NavSeries } from './series.ts';

/** Largest gap (days) allowed between a target date and the NAV used for it. */
export const MAX_GAP_DAYS = 7;

/** Result of a point-to-point return. */
export interface PeriodReturn {
  /** Return as a fraction (0.123 = 12.3%). CAGR when `annualised`, otherwise absolute. */
  value: number;
  /** True when the period is 12 months or longer (CAGR); false for absolute return. */
  annualised: boolean;
  /** Day number of the NAV used as the start. */
  startDay: number;
  /** Day number of the NAV used as the end. */
  endDay: number;
}

/**
 * NAV on a date, using the last NAV on or before it (weekends / holidays).
 *
 * Never interpolates. Returns `null` if no NAV exists on or before the date, or if the
 * nearest one is more than {@link MAX_GAP_DAYS} days earlier (stale / missing data).
 *
 * @param series - Clean series.
 * @param day - Target day number.
 * @returns The point `{ index, day, nav }`, or `null`.
 */
export function navOnOrBefore(series: NavSeries, day: number): { index: number; day: number; nav: number } | null {
  const i = indexOnOrBefore(series, day);
  if (i < 0) return null;
  if (day - series.days[i] > MAX_GAP_DAYS) return null;
  return { index: i, day: series.days[i], nav: series.navs[i] };
}

/**
 * Compound annual growth rate between two NAVs.
 *
 * Uses the AMC factsheet convention: `(end / start) ^ (365 / days) - 1`.
 *
 * @param startNav - NAV at the start.
 * @param endNav - NAV at the end.
 * @param days - Calendar days between the two NAV dates (must be > 0).
 * @returns CAGR as a fraction, or `null` for invalid input.
 * @example
 * cagr(100, 121, 730); // ~0.1 (10% a year over two years)
 */
export function cagr(startNav: number, endNav: number, days: number): number | null {
  if (!(startNav > 0) || !(endNav > 0) || !(days > 0)) return null;
  return Math.pow(endNav / startNav, 365 / days) - 1;
}

/**
 * Point-to-point return over the last `months` months ending at the latest NAV.
 *
 * - Start target = latest date minus `months` calendar months (29 Feb clamps to 28 Feb).
 * - Start NAV = last NAV on or before the target, at most {@link MAX_GAP_DAYS} days earlier.
 * - A fund younger than the period returns `null`. It is never a partial-period figure.
 * - Periods under 12 months are absolute returns; 12 months and over are CAGR.
 *
 * @param series - Clean series.
 * @param months - Period length in months (1, 3, 6, 12, 36, 60, 120, ...).
 * @returns The return, or `null` when it cannot be computed honestly.
 * @example
 * periodReturn(series, 12)?.value; // 1-year CAGR as a fraction
 */
export function periodReturn(series: NavSeries, months: number): PeriodReturn | null {
  const n = series.days.length;
  if (n < 2) return null;
  const endDay = series.days[n - 1];
  const endNav = series.navs[n - 1];
  const start = navOnOrBefore(series, addMonths(endDay, -months));
  if (!start || start.index >= n - 1) return null;
  const annualised = months >= 12;
  const value = annualised
    ? cagr(start.nav, endNav, endDay - start.day)
    : endNav / start.nav - 1;
  return value === null ? null : { value, annualised, startDay: start.day, endDay };
}

/**
 * Return since the first NAV: CAGR if the fund is at least a year old, else absolute.
 *
 * @param series - Clean series.
 * @returns The return, or `null` if fewer than two points exist.
 */
export function sinceInception(series: NavSeries): PeriodReturn | null {
  const n = series.days.length;
  if (n < 2) return null;
  const span = series.days[n - 1] - series.days[0];
  const annualised = span >= 365;
  const value = annualised
    ? cagr(series.navs[0], series.navs[n - 1], span)
    : series.navs[n - 1] / series.navs[0] - 1;
  return value === null ? null : { value, annualised, startDay: series.days[0], endDay: series.days[n - 1] };
}
