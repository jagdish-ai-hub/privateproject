import type { NavSeries } from './series.ts';

/** Round unit-split factors we recognise (a "10" means 10 new units for every old unit). */
export const SPLIT_FACTORS = [2, 3, 4, 5, 10, 20, 25, 50, 100, 500, 1000] as const;

/** Day-over-day moves inside [LOW, HIGH] are ordinary market moves, never inspected further. */
const LOW = 0.7;
const HIGH = 1.4;

/** A detected unit split or consolidation. */
export interface SplitEvent {
  /** Day number of the first NAV after the event. */
  day: number;
  /**
   * NAV was divided by this factor at the event: 10 for a 10-for-1 split. Below 1 for a
   * consolidation (0.1 = NAV multiplied by 10).
   */
  factor: number;
}

/** A large one-day jump that does not match any round split factor. */
export interface BreakEvent {
  /** Day number of the first NAV after the jump. */
  day: number;
  /** NAV after / NAV before. */
  ratio: number;
}

/** Result of {@link adjustForSplits}. */
export interface AdjustResult {
  /** Day numbers of one-day data glitches that were removed (NAV jumped and fully reverted next day). */
  spikes: number[];
  /** Series safe to compute returns on (older NAVs rescaled, history before the last break dropped). */
  series: NavSeries;
  splits: SplitEvent[];
  /** Unexplained jumps. History before the last one is dropped from `series`. */
  breaks: BreakEvent[];
  /** True when history before the last break was dropped. */
  trimmed: boolean;
}

/**
 * Make a NAV series safe for return calculations.
 *
 * ETFs and some funds change their unit face value (e.g. 10-for-1), so NAV falls to a tenth
 * overnight with no change in what investors own. Naive maths reads that as a 90% crash.
 * This function:
 *
 * 0. removes isolated one-day glitches: a NAV that jumps outside the ordinary band and
 *    returns to within 15% of the previous level on the very next day is a bad data point;
 * 1. finds one-day moves below 0.70x or above 1.40x (no ordinary fund moves that much);
 * 2. if the move is within `tolerance` of a round factor in {@link SPLIT_FACTORS} (or its
 *    inverse), records a split and divides every earlier NAV by that exact factor, so the
 *    day's remaining move is the real market move (typically a fraction of a percent);
 * 3. if it matches no factor, records a break and drops all history before it, because no
 *    honest return can span it.
 *
 * The latest NAV is never changed; only older NAVs are rescaled.
 *
 * @param s - Clean series (ascending).
 * @param tolerance - How far (relative) a move may sit from a round factor (default 10%).
 * @returns The adjusted series plus what was found.
 * @example
 * // 10-for-1 split with a +0.5% market move that day: 1000 -> 100.5
 * adjustForSplits({ days: [1, 2, 3], navs: [1000, 1000, 100.5] }).series.navs; // [100, 100, 100.5]
 */
export function adjustForSplits(input: NavSeries, tolerance = 0.1): AdjustResult {
  const { series: s, spikes } = removeSpikes(input);
  const n = s.days.length;
  const splits: SplitEvent[] = [];
  const breaks: BreakEvent[] = [];
  const events: { index: number; factor: number }[] = [];

  for (let i = 1; i < n; i++) {
    const r = s.navs[i] / s.navs[i - 1];
    if (r >= LOW && r <= HIGH) continue;
    const down = SPLIT_FACTORS.find((k) => Math.abs(r * k - 1) <= tolerance);
    const up = SPLIT_FACTORS.find((k) => Math.abs(r / k - 1) <= tolerance);
    if (down !== undefined) {
      events.push({ index: i, factor: down });
      splits.push({ day: s.days[i], factor: down });
    } else if (up !== undefined) {
      events.push({ index: i, factor: 1 / up });
      splits.push({ day: s.days[i], factor: 1 / up });
    } else {
      events.push({ index: i, factor: NaN });
      breaks.push({ day: s.days[i], ratio: r });
    }
  }
  if (events.length === 0) return { series: s, spikes, splits, breaks, trimmed: false };

  const lastBreak = events.filter((e) => Number.isNaN(e.factor)).pop();
  const start = lastBreak ? lastBreak.index : 0;
  const navs: number[] = [];
  const days = s.days.slice(start);
  // Walk backward from the newest point, accumulating the divisor of every later split.
  let divisor = 1;
  const usable = events.filter((e) => e.index > start && !Number.isNaN(e.factor));
  let ei = usable.length - 1;
  for (let i = n - 1; i >= start; i--) {
    while (ei >= 0 && usable[ei].index > i) {
      divisor *= usable[ei].factor;
      ei--;
    }
    navs.push(s.navs[i] / divisor);
  }
  navs.reverse();
  return { series: { days, navs }, spikes, splits, breaks, trimmed: start > 0 };
}

/**
 * Drop isolated one-day glitches: points whose move in and move out are both outside the
 * ordinary band and which return to within 15% of the previous kept NAV.
 *
 * @param s - Clean series.
 * @returns The series without glitches (the same object if none) and the removed days.
 */
export function removeSpikes(s: NavSeries): { series: NavSeries; spikes: number[] } {
  const n = s.days.length;
  const days: number[] = n ? [s.days[0]] : [];
  const navs: number[] = n ? [s.navs[0]] : [];
  const spikes: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    const prev = navs[navs.length - 1];
    const r1 = s.navs[i] / prev;
    const r2 = s.navs[i + 1] / s.navs[i];
    const jumpIn = r1 < LOW || r1 > HIGH;
    const jumpOut = r2 < LOW || r2 > HIGH;
    if (jumpIn && jumpOut && Math.abs(s.navs[i + 1] / prev - 1) <= 0.15) {
      spikes.push(s.days[i]);
      continue;
    }
    days.push(s.days[i]);
    navs.push(s.navs[i]);
  }
  if (n > 1) { days.push(s.days[n - 1]); navs.push(s.navs[n - 1]); }
  return spikes.length ? { series: { days, navs }, spikes } : { series: s, spikes };
}
