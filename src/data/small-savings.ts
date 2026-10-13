/**
 * Government small savings scheme interest rates.
 *
 * The Finance Ministry (Department of Economic Affairs) notifies these rates every quarter, usually
 * on the last working day before the quarter starts. Update this file when a new notice comes out:
 * change `period`, `notice` and any rate that moved, and set `checked` to the day you read it.
 * A page built after `period.to` shows a warning that the rates may be out of date, and CI prints a
 * warning too (see tests/small-savings-data.test.ts), so a missed update is visible.
 *
 * Rates are percent per year. Sources were read on `checked`; the official India Post and NSI pages
 * could not be fetched from the build environment, so two independent copies of the same notice
 * were used and they agree on every rate.
 */
export const SMALL_SAVINGS = {
  period: { from: '2026-10-01', to: '2026-12-31', label: 'October–December 2026 (Q3 FY 2026-27)', labelHi: 'अक्टूबर–दिसंबर 2026 (वित्त वर्ष 2026-27 की तीसरी तिमाही)' },
  notice: {
    number: 'F. No. 1/4/2019-NS',
    date: '2026-09-30',
    issuer: 'Ministry of Finance, Department of Economic Affairs (Budget Division)',
    summary: 'Rates for 1 October to 31 December 2026 unchanged from the previous quarter.',
  },
  checked: '2026-10-12',
  sources: [
    { name: 'Office memorandum F. No. 1/4/2019-NS dated 30.09.2026 (republished by TaxGuru)', url: 'https://taxguru.in/?p=1084242' },
    { name: 'Indian Bank: interest rates for small savings schemes', url: 'https://indianbank.bank.in/en/interest-rates-for-small-savings-schemes' },
    { name: 'Department of Economic Affairs, Budget Division', url: 'https://dea.gov.in/budget-division/475' },
  ],
  rates: {
    savings: 4.0,
    td1: 6.9,
    td2: 7.0,
    td3: 7.1,
    td5: 7.5,
    rd5: 6.7,
    scss: 8.2,
    mis: 7.4,
    nsc: 7.7,
    ppf: 7.1,
    kvp: 7.5,
    ssy: 8.2,
  },
  /** Kisan Vikas Patra doubles the deposit in this many months at the current rate (stated in the notice). */
  kvpMonths: 115,
} as const;

export type SchemeRateKey = keyof typeof SMALL_SAVINGS.rates;

/**
 * True when a page is built after the notified quarter has ended, so it should warn that the
 * rates may have changed.
 *
 * @param today - ISO date of the build (YYYY-MM-DD).
 * @returns Whether the stored quarter is over.
 */
export function ratesMayBeStale(today: string): boolean {
  return today > SMALL_SAVINGS.period.to;
}
