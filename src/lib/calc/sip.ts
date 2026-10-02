import { addMonths } from './dates.ts';
import { indexOnOrAfter, type NavSeries } from './series.ts';
import { MAX_GAP_DAYS } from './returns.ts';
import { xirr, type CashFlow } from './xirr.ts';

/** Outcome of a historical SIP simulation. */
export interface SipResult {
  /** Annualised return (XIRR) as a fraction. */
  xirr: number;
  /** Total money invested. */
  invested: number;
  /** Value of all units at the latest NAV. */
  value: number;
  /** Number of instalments made. */
  instalments: number;
}

/**
 * Simulate a monthly SIP over the last `months` months and return its XIRR.
 *
 * Rules: one instalment of `amount` on the same calendar day each month, starting
 * `months` months before the latest NAV date and ending one month before it (so `months`
 * instalments). Each buys at the first NAV on or after the scheduled day (at most
 * {@link MAX_GAP_DAYS} days later, else the whole result is `null`). All units are valued
 * at the latest NAV on the latest NAV date.
 *
 * @param series - Clean series.
 * @param months - SIP length in months (12, 36, 60, ...).
 * @param amount - Monthly instalment; any positive number (XIRR does not depend on it).
 * @returns The result, or `null` if the fund is too young or data has gaps.
 * @example
 * sipReturn(series, 36)?.xirr; // 3-year SIP XIRR as a fraction
 */
export function sipReturn(series: NavSeries, months: number, amount = 10_000): SipResult | null {
  const n = series.days.length;
  if (n < 2 || months < 1 || !(amount > 0)) return null;
  const endDay = series.days[n - 1];
  const endNav = series.navs[n - 1];

  const flows: CashFlow[] = [];
  let units = 0;
  for (let k = months; k >= 1; k--) {
    const scheduled = addMonths(endDay, -k);
    const i = indexOnOrAfter(series, scheduled);
    if (i < 0 || series.days[i] - scheduled > MAX_GAP_DAYS) return null;
    if (scheduled < series.days[0]) return null;
    flows.push({ day: series.days[i], amount: -amount });
    units += amount / series.navs[i];
  }
  const value = units * endNav;
  flows.push({ day: endDay, amount: value });
  const rate = xirr(flows);
  return rate === null ? null : { xirr: rate, invested: amount * months, value, instalments: months };
}
