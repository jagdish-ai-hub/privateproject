/**
 * Pure helpers behind the chart overlays: the high / low of a window, the "drop from peak"
 * series, and a tooltip-friendly change figure. No DOM, so they are unit tested directly.
 */

/** One point of a NAV series. */
export interface Point {
  day: number;
  nav: number;
}

/** What happened inside a chart window. */
export interface WindowStats {
  start: Point;
  end: Point;
  high: Point;
  low: Point;
}

/**
 * High, low, first and last point of the series from `startIdx` to the end.
 *
 * @param days - Ascending day numbers.
 * @param navs - NAVs, same length.
 * @param startIdx - First index of the window (clamped into range).
 * @returns The window's stats, or `null` for an empty series.
 */
export function windowStats(days: readonly number[], navs: readonly number[], startIdx: number): WindowStats | null {
  if (days.length === 0 || navs.length !== days.length) return null;
  const from = Math.min(Math.max(0, startIdx), days.length - 1);
  let hi = from;
  let lo = from;
  for (let i = from; i < navs.length; i++) {
    if (navs[i] > navs[hi]) hi = i;
    if (navs[i] < navs[lo]) lo = i;
  }
  const at = (i: number): Point => ({ day: days[i], nav: navs[i] });
  return { start: at(from), end: at(navs.length - 1), high: at(hi), low: at(lo) };
}

/**
 * "Drop from peak" (underwater) series: at each day, how far the NAV is below the highest NAV
 * seen since the window started, as a fraction (0 at a new high, -0.2 = 20% below the peak).
 *
 * @param days - Ascending day numbers.
 * @param navs - NAVs, same length.
 * @param startIdx - First index of the window.
 * @returns One `{ day, value }` per point from the window start.
 */
export function dropFromPeak(days: readonly number[], navs: readonly number[], startIdx: number): { day: number; value: number }[] {
  const out: { day: number; value: number }[] = [];
  let peak = -Infinity;
  for (let i = Math.max(0, startIdx); i < navs.length; i++) {
    peak = Math.max(peak, navs[i]);
    out.push({ day: days[i], value: navs[i] / peak - 1 });
  }
  return out;
}

/**
 * Hex colour with an alpha, for chart fills that must follow the theme tokens.
 *
 * @param hex - `#rgb` or `#rrggbb`.
 * @param alpha - 0..1.
 * @returns `rgba(r, g, b, a)`; unparseable input is returned unchanged.
 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
