/**
 * Investment calculators. Pure functions: no DOM, no network.
 *
 * Conventions (also shown on each calculator page):
 * - `annualReturn` is a yearly rate as a fraction (0.12 = 12%).
 * - Monthly products (SIP, step-up SIP, goal SIP, SWP) use the market-standard convention: the
 *   monthly rate is `annual / 12`, compounded monthly. So "12% a year" grows 1% a month, which
 *   is an effective 12.68% over a year. This is what nearly every Indian SIP calculator does,
 *   so results can be compared with them. (Historical fund returns elsewhere on this site are
 *   CAGR / XIRR, which are effective annual rates.)
 * - Lumpsum uses annual compounding: `amount x (1 + annual)^years`.
 * - SIP instalments are invested at the START of each month.
 * - Results are projections from an assumed constant return, never a forecast.
 */

/** One row of a year-by-year breakdown. */
export interface YearRow {
  /** 1-based year. */
  year: number;
  /** Total money put in by the end of this year. */
  invested: number;
  /** Value of the investment at the end of this year. */
  value: number;
}

/** Result of a SIP-style projection. */
export interface SipProjection {
  invested: number;
  value: number;
  /** `value - invested`. */
  gain: number;
  years: YearRow[];
}

/**
 * Monthly rate for a yearly return, using the market-standard nominal convention (annual / 12).
 *
 * @param annualReturn - Yearly return as a fraction.
 * @returns Monthly rate as a fraction.
 * @example
 * monthlyRate(0.12); // 0.01
 */
export function monthlyRate(annualReturn: number): number {
  return annualReturn / 12;
}

/**
 * Project a monthly SIP, optionally increasing the instalment every year (step-up).
 *
 * Month by month: balance = (balance + instalment) x (1 + monthly rate). The instalment for
 * year `y` (0-based) is `monthly x (1 + stepUp)^y`.
 *
 * @param monthly - First-year monthly instalment (rupees).
 * @param annualReturn - Assumed yearly return as a fraction.
 * @param years - Duration in whole years.
 * @param stepUp - Yearly increase of the instalment as a fraction (0 for a flat SIP).
 * @returns Totals plus a per-year breakdown.
 * @example
 * sipProjection(10_000, 0.12, 10).value; // about 2.3 million
 */
export function sipProjection(monthly: number, annualReturn: number, years: number, stepUp = 0): SipProjection {
  const i = monthlyRate(annualReturn);
  let balance = 0;
  let invested = 0;
  const rows: YearRow[] = [];
  for (let y = 0; y < years; y++) {
    const instalment = monthly * Math.pow(1 + stepUp, y);
    for (let m = 0; m < 12; m++) {
      balance = (balance + instalment) * (1 + i);
      invested += instalment;
    }
    rows.push({ year: y + 1, invested, value: balance });
  }
  return { invested, value: balance, gain: balance - invested, years: rows };
}

/**
 * Value of a one-time investment.
 *
 * @param amount - Amount invested (rupees).
 * @param annualReturn - Assumed yearly return as a fraction.
 * @param years - Duration in years (may be fractional).
 * @returns Totals plus a per-year breakdown (whole years only).
 * @example
 * lumpsumProjection(100_000, 0.1, 2).value; // 121000
 */
export function lumpsumProjection(amount: number, annualReturn: number, years: number): SipProjection {
  const rows: YearRow[] = [];
  for (let y = 1; y <= Math.floor(years); y++) rows.push({ year: y, invested: amount, value: amount * Math.pow(1 + annualReturn, y) });
  const value = amount * Math.pow(1 + annualReturn, years);
  return { invested: amount, value, gain: value - amount, years: rows };
}

/**
 * Monthly SIP needed to reach a target amount.
 *
 * Inverts the flat-SIP formula: `target / (((1+i)^n - 1) / i x (1+i))`.
 *
 * @param target - Target corpus (rupees).
 * @param annualReturn - Assumed yearly return as a fraction.
 * @param years - Duration in whole years.
 * @returns The monthly instalment.
 */
export function requiredSip(target: number, annualReturn: number, years: number): number {
  const n = years * 12;
  const i = monthlyRate(annualReturn);
  if (n <= 0) return target;
  const factor = i === 0 ? n : (((1 + i) ** n - 1) / i) * (1 + i);
  return target / factor;
}

/** Result of a systematic withdrawal projection. */
export interface SwpProjection {
  totalWithdrawn: number;
  /** Corpus left at the end (0 if it ran out). */
  finalBalance: number;
  /** Months the withdrawals could be paid in full. */
  monthsLasted: number;
  /** True if the full duration was covered. */
  lastedFullTerm: boolean;
  years: { year: number; withdrawn: number; balance: number }[];
}

/**
 * Project a systematic withdrawal plan.
 *
 * Each month the balance grows by the monthly rate, then the withdrawal is taken at the end
 * of the month. If the balance cannot cover a full withdrawal, the remainder is paid out and
 * the plan stops (the corpus is exhausted).
 *
 * @param corpus - Starting amount (rupees).
 * @param monthlyWithdrawal - Amount taken each month.
 * @param annualReturn - Assumed yearly return as a fraction.
 * @param years - Planned duration in whole years.
 * @returns Totals, how long the money lasted, and a per-year breakdown.
 */
export function swpProjection(corpus: number, monthlyWithdrawal: number, annualReturn: number, years: number): SwpProjection {
  const i = monthlyRate(annualReturn);
  let balance = corpus;
  let totalWithdrawn = 0;
  let monthsLasted = 0;
  const rows: SwpProjection['years'] = [];
  let withdrawnThisYear = 0;
  for (let m = 1; m <= years * 12; m++) {
    if (balance > 0) {
      balance *= 1 + i;
      const take = Math.min(monthlyWithdrawal, balance);
      balance -= take;
      totalWithdrawn += take;
      withdrawnThisYear += take;
      if (take === monthlyWithdrawal) monthsLasted++;
      else if (take > 0) monthsLasted++; // partial final payment
    }
    if (m % 12 === 0) {
      rows.push({ year: m / 12, withdrawn: withdrawnThisYear, balance: Math.max(0, balance) });
      withdrawnThisYear = 0;
    }
  }
  return { totalWithdrawn, finalBalance: Math.max(0, balance), monthsLasted, lastedFullTerm: monthsLasted >= years * 12 && balance >= 0, years: rows };
}

/**
 * CAGR between two values.
 *
 * @param start - Starting value (> 0).
 * @param end - Ending value (>= 0).
 * @param years - Duration in years (> 0).
 * @returns CAGR as a fraction, or `null` for invalid input.
 * @example
 * cagrBetween(100, 200, 5); // 0.1487
 */
export function cagrBetween(start: number, end: number, years: number): number | null {
  if (!(start > 0) || !(end >= 0) || !(years > 0)) return null;
  return Math.pow(end / start, 1 / years) - 1;
}
