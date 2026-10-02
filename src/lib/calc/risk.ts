import { addMonths } from './dates.ts';
import { indexOnOrBefore, type NavSeries } from './series.ts';

/** Trading days per year used to annualise daily statistics. */
export const TRADING_DAYS = 252;

/** Default annual risk-free rate (6.5%) used for Sharpe and Sortino. */
export const DEFAULT_RISK_FREE = 0.065;

/** Risk statistics over a window. */
export interface RiskStats {
  /** Annualised standard deviation of daily returns, as a fraction. */
  volatility: number;
  /** Annualised excess return per unit of volatility. */
  sharpe: number;
  /** Annualised excess return per unit of downside deviation. */
  sortino: number;
  /** Worst peak-to-trough fall as a negative fraction (-0.25 = -25%). */
  maxDrawdown: number;
}

/**
 * Slice a series to the last `months` months (inclusive of the start NAV on or before the cut).
 *
 * @param series - Clean series.
 * @param months - Window length in months.
 * @returns The NAVs in the window, or `null` if the fund does not reach back that far.
 */
function windowNavs(series: NavSeries, months: number): number[] | null {
  const n = series.days.length;
  if (n < 2) return null;
  const startIdx = indexOnOrBefore(series, addMonths(series.days[n - 1], -months));
  if (startIdx < 0) return null;
  return series.navs.slice(startIdx);
}

/**
 * Maximum drawdown of a NAV list: the largest peak-to-trough decline.
 *
 * @param navs - NAVs in time order.
 * @returns A value <= 0 (0 means NAV never fell below an earlier high).
 * @example
 * maxDrawdown([100, 120, 90, 110]); // -0.25
 */
export function maxDrawdown(navs: readonly number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of navs) {
    if (v > peak) peak = v;
    const dd = v / peak - 1;
    if (dd < worst) worst = dd;
  }
  return worst;
}

/**
 * Risk statistics over the last `months` months.
 *
 * Definitions (also on the site's methodology page):
 * - Daily simple returns between consecutive NAVs.
 * - Volatility = sample standard deviation x sqrt(252).
 * - Sharpe = ((mean daily return - rf/252) x 252) / volatility.
 * - Sortino = same numerator / (downside deviation x sqrt(252)), where downside deviation
 *   is the root mean square of daily returns below rf/252 (over all days).
 * - Max drawdown over the same window.
 *
 * @param series - Clean series.
 * @param months - Window, e.g. 36 for 3 years. Needs at least 30 daily returns.
 * @param riskFree - Annual risk-free rate as a fraction.
 * @returns Stats, or `null` when the window is not covered or has too few points.
 */
export function riskStats(series: NavSeries, months: number, riskFree = DEFAULT_RISK_FREE): RiskStats | null {
  const navs = windowNavs(series, months);
  if (!navs || navs.length < 31) return null;
  const rets: number[] = [];
  for (let i = 1; i < navs.length; i++) rets.push(navs[i] / navs[i - 1] - 1);
  const n = rets.length;
  const mean = rets.reduce((a, b) => a + b, 0) / n;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const vol = Math.sqrt(variance) * Math.sqrt(TRADING_DAYS);
  const rfDaily = riskFree / TRADING_DAYS;
  const excess = (mean - rfDaily) * TRADING_DAYS;
  const downside = Math.sqrt(rets.reduce((a, b) => a + Math.min(0, b - rfDaily) ** 2, 0) / n) * Math.sqrt(TRADING_DAYS);
  return {
    volatility: vol,
    sharpe: vol > 0 ? excess / vol : 0,
    sortino: downside > 0 ? excess / downside : 0,
    maxDrawdown: maxDrawdown(navs),
  };
}
