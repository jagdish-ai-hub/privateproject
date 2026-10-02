/**
 * Number formatting for the UI. All numbers use Indian digit grouping (1,23,456.78).
 * Every formatter returns a placeholder dash for `null` / `undefined` / `NaN`.
 */

/** Shown wherever a value does not exist (never a made-up number). */
export const DASH = '—';

const inr = (dp: number): Intl.NumberFormat => new Intl.NumberFormat('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const FORMATTERS = { 0: inr(0), 1: inr(1), 2: inr(2), 3: inr(3), 4: inr(4) } as const;

/**
 * Format a fraction as a signed percentage: 0.1234 -> "+12.34%", -0.031 -> "-3.10%".
 * A sign is always shown so colour is never the only cue for gain vs loss.
 *
 * @param fraction - Value as a fraction (0.1234 = 12.34%).
 * @param dp - Decimal places (default 2).
 * @returns Text, or {@link DASH} for a missing value.
 */
export function formatPct(fraction: number | null | undefined, dp: 0 | 1 | 2 = 2): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return DASH;
  const v = Math.round(fraction * 100 * 10 ** dp) / 10 ** dp;
  const sign = v > 0 ? '+' : '';
  return `${sign}${FORMATTERS[dp].format(v)}%`;
}

/**
 * Format an unsigned percentage (e.g. share of positive windows): 0.5 -> "50.0%".
 *
 * @param fraction - Value as a fraction.
 * @param dp - Decimal places (default 1).
 * @returns Text, or {@link DASH}.
 */
export function formatPlainPct(fraction: number | null | undefined, dp: 0 | 1 | 2 = 1): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return DASH;
  return `${FORMATTERS[dp].format(fraction * 100)}%`;
}

/**
 * Format a NAV to 4 decimals: 1234.5 -> "1,234.5000".
 *
 * @param nav - NAV in rupees.
 * @returns Text, or {@link DASH}.
 */
export function formatNav(nav: number | null | undefined): string {
  if (nav === null || nav === undefined || Number.isNaN(nav)) return DASH;
  return FORMATTERS[4].format(nav);
}

/**
 * Format a plain number with fixed decimals (Sharpe, Sortino, counts).
 *
 * @param n - Value.
 * @param dp - Decimal places (default 2).
 * @returns Text, or {@link DASH}.
 */
export function formatNum(n: number | null | undefined, dp: 0 | 1 | 2 | 3 = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return DASH;
  return FORMATTERS[dp].format(n);
}

/**
 * Format a rupee amount with a symbol and Indian grouping: 1234567 -> "₹12,34,567".
 *
 * @param amount - Amount in rupees.
 * @param dp - Decimal places (default 0).
 * @returns Text, or {@link DASH}.
 */
export function formatRupees(amount: number | null | undefined, dp: 0 | 2 = 0): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return DASH;
  return `₹${FORMATTERS[dp].format(amount)}`;
}

/**
 * CSS class for a gain / loss number: `pos`, `neg`, or empty for zero / missing.
 *
 * @param v - The value (sign is what matters).
 * @returns Class name.
 */
export function signClass(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0 || Number.isNaN(v)) return '';
  return v > 0 ? 'pos' : 'neg';
}

/**
 * Format a day number as "01 Oct 2026".
 *
 * @param dayNumber - Days since 1970-01-01 UTC.
 * @returns Text.
 */
export function formatDay(dayNumber: number): string {
  return new Date(dayNumber * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
