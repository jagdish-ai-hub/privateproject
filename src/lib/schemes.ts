/**
 * Maths for Government small savings schemes (PPF, SSY, SCSS, NSC, KVP, Post Office MIS, RD and
 * Time Deposits). Each function states its convention, because the conventions are where most
 * calculators go wrong:
 *
 * - PPF and SSY: interest is worked out every month on the balance after the deposit made by the
 *   5th, at (yearly rate ÷ 12), and added to the account once a year at the end of the financial
 *   year. Depositing the year's money by 5 April earns interest on it for the whole year.
 * - NSC and KVP: interest compounds once a year and is paid at maturity.
 * - RD: interest compounds every quarter on monthly deposits.
 * - Time Deposit: interest is calculated quarterly and paid out once a year.
 * - SCSS and MIS: simple interest paid out (every quarter / every month); it does not compound.
 *
 * All rates are fractions here (0.071 = 7.1%). Amounts are rupees. Pure functions, no I/O.
 * The tests reproduce published figures (for example RD ₹100 a month at 6.7% → ₹7,136.58).
 */

/** One year of an account that builds up (PPF, SSY, NSC). */
export interface YearRow {
  year: number;
  deposit: number;
  interest: number;
  /** Balance at the end of the year. */
  balance: number;
}

/** Result of a build-up scheme. */
export interface BuildUp {
  invested: number;
  interest: number;
  maturity: number;
  rows: YearRow[];
}

/** How PPF / SSY deposits are made within each financial year. */
export type DepositTiming = 'yearly-start' | 'monthly';

/**
 * Simulate an account whose interest is computed monthly and credited yearly (PPF and SSY rules).
 *
 * @param yearly - Amount deposited each year (₹).
 * @param rate - Yearly rate as a fraction.
 * @param depositYears - Number of years in which deposits are made.
 * @param totalYears - Number of years the account earns interest (≥ depositYears).
 * @param timing - Whole year's deposit by 5 April, or one-twelfth by the 5th of every month.
 * @returns Year-by-year rows and totals.
 */
function monthlyInterestYearlyCredit(yearly: number, rate: number, depositYears: number, totalYears: number, timing: DepositTiming): BuildUp {
  const rows: YearRow[] = [];
  let balance = 0;
  let invested = 0;
  for (let y = 1; y <= totalYears; y++) {
    const depositing = y <= depositYears;
    let interest = 0;
    let deposit = 0;
    for (let m = 1; m <= 12; m++) {
      if (depositing && (timing === 'monthly' || m === 1)) {
        const d = timing === 'monthly' ? yearly / 12 : yearly;
        balance += d;
        deposit += d;
      }
      interest += (balance * rate) / 12;
    }
    balance += interest;
    invested += deposit;
    rows.push({ year: y, deposit, interest, balance });
  }
  return { invested, interest: balance - invested, maturity: balance, rows };
}

/**
 * Public Provident Fund. Deposits are made every year for `years` years (15 at minimum; the
 * account can be extended in blocks of 5 years with deposits).
 *
 * @param yearly - Yearly deposit (₹500 to ₹1,50,000).
 * @param rate - Yearly rate as a fraction.
 * @param years - Number of years with deposits (15, 20, 25 …).
 * @param timing - When deposits are made within each year.
 * @returns Totals and a year-by-year table.
 * @example ppf(150000, 0.071, 15).maturity; // 4068209 (₹40,68,209)
 */
export function ppf(yearly: number, rate: number, years = 15, timing: DepositTiming = 'yearly-start'): BuildUp {
  return monthlyInterestYearlyCredit(yearly, rate, years, years, timing);
}

/**
 * Sukanya Samriddhi Yojana. Deposits are made for 15 years from opening; the account keeps
 * earning interest until it matures 21 years after opening.
 *
 * @param yearly - Yearly deposit (₹250 to ₹1,50,000).
 * @param rate - Yearly rate as a fraction.
 * @param timing - When deposits are made within each year.
 * @returns Totals and a 21-year table.
 */
export function ssy(yearly: number, rate: number, timing: DepositTiming = 'yearly-start'): BuildUp {
  return monthlyInterestYearlyCredit(yearly, rate, 15, 21, timing);
}

/**
 * National Savings Certificate (5 years): interest compounds yearly and is paid at maturity.
 *
 * @param amount - Amount invested (₹1,000 or more).
 * @param rate - Yearly rate as a fraction.
 * @param years - Term in years (5).
 * @returns Totals and the interest added each year.
 * @example nsc(1000, 0.077).maturity; // ≈ 1449.03
 */
export function nsc(amount: number, rate: number, years = 5): BuildUp {
  const rows: YearRow[] = [];
  let balance = amount;
  for (let y = 1; y <= years; y++) {
    const interest = balance * rate;
    balance += interest;
    rows.push({ year: y, deposit: y === 1 ? amount : 0, interest, balance });
  }
  return { invested: amount, interest: balance - amount, maturity: balance, rows };
}

/**
 * Kisan Vikas Patra: the deposit doubles in the number of months stated in the rate notice.
 *
 * @param amount - Amount invested (₹1,000 or more).
 * @param months - Months to double, as notified (115 at 7.5%).
 * @returns Maturity value and term.
 */
export function kvp(amount: number, months: number): { invested: number; maturity: number; months: number } {
  return { invested: amount, maturity: amount * 2, months };
}

/**
 * The yearly rate at which money doubles in `months` months with yearly compounding, used to show
 * that the notified KVP term and rate agree.
 *
 * @param months - Months to double.
 * @returns Yearly rate as a fraction.
 */
export function impliedDoublingRate(months: number): number {
  return 2 ** (12 / months) - 1;
}

/** A scheme that pays interest out instead of compounding it. */
export interface Payout {
  invested: number;
  /** Interest paid each period (₹). */
  perPeriod: number;
  periodsPerYear: number;
  years: number;
  /** Total interest over the term. */
  totalInterest: number;
}

/**
 * Senior Citizens' Savings Scheme: interest is paid every quarter and does not compound.
 *
 * @param amount - Deposit (₹1,000 to ₹30,00,000).
 * @param rate - Yearly rate as a fraction.
 * @param years - Term (5, extendable by 3).
 * @returns Quarterly payout and total.
 * @example scss(3000000, 0.082).perPeriod; // 61500
 */
export function scss(amount: number, rate: number, years = 5): Payout {
  const perPeriod = (amount * rate) / 4;
  return { invested: amount, perPeriod, periodsPerYear: 4, years, totalInterest: perPeriod * 4 * years };
}

/**
 * Post Office Monthly Income Scheme: interest is paid every month and does not compound.
 *
 * @param amount - Deposit (₹1,000 to ₹9 lakh single, ₹15 lakh joint).
 * @param rate - Yearly rate as a fraction.
 * @param years - Term (5).
 * @returns Monthly payout and total.
 * @example mis(900000, 0.074).perPeriod; // 5550
 */
export function mis(amount: number, rate: number, years = 5): Payout {
  const perPeriod = (amount * rate) / 12;
  return { invested: amount, perPeriod, periodsPerYear: 12, years, totalInterest: perPeriod * 12 * years };
}

/**
 * Post Office Time Deposit: interest is calculated quarterly and paid out once a year.
 *
 * @param amount - Deposit (₹1,000 or more).
 * @param rate - Yearly rate for the chosen term, as a fraction.
 * @param years - Term: 1, 2, 3 or 5 years.
 * @returns Yearly payout and total.
 */
export function timeDeposit(amount: number, rate: number, years: number): Payout {
  const perPeriod = amount * ((1 + rate / 4) ** 4 - 1);
  return { invested: amount, perPeriod, periodsPerYear: 1, years, totalInterest: perPeriod * years };
}

/**
 * Post Office Recurring Deposit: a fixed deposit every month, interest compounded quarterly.
 * Each instalment earns interest from the month it is paid until maturity.
 *
 * @param monthly - Monthly deposit (₹100 or more, in multiples of ₹10).
 * @param rate - Yearly rate as a fraction.
 * @param months - Term in months (60).
 * @returns Totals and a yearly table.
 * @example rd(100, 0.067).maturity; // ≈ 7136.58
 */
export function rd(monthly: number, rate: number, months = 60): BuildUp {
  const growth = (k: number): number => (1 + rate / 4) ** (k / 3); // k months of quarterly compounding
  const value = (paidMonths: number, atMonth: number): number => {
    let v = 0;
    for (let i = 0; i < paidMonths; i++) v += monthly * growth(atMonth - i);
    return v;
  };
  const rows: YearRow[] = [];
  for (let y = 1; y * 12 <= months; y++) {
    const atMonth = y * 12;
    const balance = value(atMonth, atMonth);
    const prev = rows.length ? rows[rows.length - 1].balance : 0;
    rows.push({ year: y, deposit: monthly * 12, interest: balance - prev - monthly * 12, balance });
  }
  const maturity = value(months, months);
  const invested = monthly * months;
  return { invested, interest: maturity - invested, maturity, rows };
}

/** Deposit limits, for input validation and for the text on each page. */
export const LIMITS = {
  ppf: { min: 500, max: 150_000 },
  ssy: { min: 250, max: 150_000 },
  scss: { min: 1_000, max: 3_000_000, multiple: 1_000 },
  nsc: { min: 1_000, multiple: 100 },
  kvp: { min: 1_000, multiple: 100 },
  mis: { min: 1_000, maxSingle: 900_000, maxJoint: 1_500_000 },
  rd: { min: 100, multiple: 10 },
  td: { min: 1_000, multiple: 100 },
} as const;
