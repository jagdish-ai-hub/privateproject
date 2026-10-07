import { addMonths } from './calc/dates.ts';
import { navOnOrBefore } from './calc/returns.ts';
import type { NavSeries } from './calc/series.ts';

/** One fund's NAV history, tagged with its scheme code. */
export interface CompareInput extends NavSeries {
  code: number;
}

/** One line of the compare chart: the fund's NAV rebased so the common start equals 100. */
export interface CompareLine {
  code: number;
  days: number[];
  /** Rebased values; the first is exactly 100. */
  values: number[];
  /** Total change over the window as a fraction (last / first - 1). */
  change: number;
}

/** Result of {@link rebase}. */
export interface CompareResult {
  /** First day of the common window. */
  startDay: number;
  /** Last day of the common window (the earliest "latest NAV" among the funds). */
  endDay: number;
  lines: CompareLine[];
}

/**
 * Put several funds on one comparable scale.
 *
 * Every fund is rebased to 100 on the same start day and cut off on the same end day, so a
 * fund that updated a day later does not look better. Rules:
 *
 * - End day = the earliest latest-NAV date among the funds.
 * - `months > 0`: start day = end day minus that many calendar months. Every fund must have a
 *   NAV on or before it (at most 7 days earlier); if any fund is too young, the range is not
 *   available and the result is `null`. No partial comparisons.
 * - `months === 0` ("Max"): start day = the latest first-NAV date, i.e. the longest window all
 *   funds share.
 *
 * Each line starts at the start day with value 100 (using the last NAV on or before it),
 * then follows that fund's own NAV dates.
 *
 * @param funds - Two or more funds' series.
 * @param months - Window length in months, or 0 for the longest common window.
 * @returns The rebased lines, or `null` if the window cannot be shown honestly.
 * @example
 * rebase([a, b], 36); // both lines start at 100 three years before the earliest latest NAV
 */
export function rebase(funds: readonly CompareInput[], months: number): CompareResult | null {
  if (funds.length === 0 || funds.some((f) => f.days.length < 2)) return null;
  const endDay = Math.min(...funds.map((f) => f.days[f.days.length - 1]));
  const startDay = months === 0 ? Math.max(...funds.map((f) => f.days[0])) : addMonths(endDay, -months);
  if (startDay >= endDay) return null;

  const lines: CompareLine[] = [];
  for (const f of funds) {
    const base = navOnOrBefore(f, startDay);
    if (!base) return null;
    const days: number[] = [startDay];
    const values: number[] = [100];
    for (let i = base.index + 1; i < f.days.length && f.days[i] <= endDay; i++) {
      if (f.days[i] <= startDay) continue;
      days.push(f.days[i]);
      values.push((f.navs[i] / base.nav) * 100);
    }
    lines.push({ code: f.code, days, values, change: values[values.length - 1] / 100 - 1 });
  }
  return { startDay, endDay, lines };
}

/**
 * Longest standard window (in months) that {@link rebase} can show for these funds.
 *
 * @param funds - Funds to compare.
 * @param candidates - Windows to try, longest first (default 5Y, 3Y, 1Y, 6M, 3M, 1M).
 * @returns The first window that works, or 0 (the common "Max" window) if none do.
 */
export function defaultWindow(funds: readonly CompareInput[], candidates: readonly number[] = [60, 36, 12, 6, 3, 1]): number {
  return candidates.find((m) => rebase(funds, m) !== null) ?? 0;
}

/**
 * Shorten a scheme name for tight spaces (legends, tooltips): drops the plan / option tail.
 * "Parag Parikh Flexi Cap Fund - Direct Plan - Growth" -> "Parag Parikh Flexi Cap Fund".
 *
 * @param name - Full scheme name.
 * @returns The name without "- Direct Plan - Growth" style suffixes (never empty).
 */
export function shortName(name: string): string {
  const cut = name.replace(/\s*-\s*(direct|regular)\b.*$/i, '').replace(/\s*-\s*(growth|idcw|dividend)\b.*$/i, '').trim();
  return cut || name;
}
