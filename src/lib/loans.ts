/**
 * Loan EMI, prepayment and fixed deposit maths. Pure functions: no DOM, no network, no data feed.
 * Every rate, amount and fee is typed in by the visitor; the defaults on the pages are examples.
 *
 * Conventions (also shown on the calculator pages):
 * - Loans use the reducing-balance method: each month interest = balance × yearly rate ÷ 12, then the EMI
 *   is paid, and what is left of the EMI after interest reduces the balance.
 * - EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1), with i = yearly rate ÷ 12 and n = number of months.
 * - A flat rate charges interest on the full original amount for the whole term:
 *   EMI = (P + P × flat rate × years) ÷ months. It is converted to the reducing-balance rate that gives
 *   the same EMI, which is the rate that can be compared with other loans.
 * - Prepayment keeps the EMI the same and shortens the loan. An extra monthly amount is paid with every
 *   EMI; a lump sum is paid at the end of the month you choose.
 * - The processing fee is a percentage of the loan paid once at the start. It is added to the total
 *   cost but does not change the EMI or the schedule.
 * - Fixed deposit: interest compounds `perYear` times a year; tax is the visitor's rate applied to all
 *   the interest earned; real return takes off inflation.
 */

import { emi } from './rentVsBuy.ts';

export { emi };

export interface LoanYear {
  /** 1-based year. */
  year: number;
  principalPaid: number;
  interestPaid: number;
  /** Balance still owed at the end of the year. */
  balance: number;
}

export interface LoanInput {
  amount: number;
  /** Reducing-balance yearly rate as a fraction. */
  rate: number;
  years: number;
  /** Extra rupees paid every month on top of the EMI. */
  extraMonthly?: number;
  /** One-time prepayment, paid at the end of `lumpMonth`. */
  lump?: number;
  lumpMonth?: number;
  /** Processing fee as a fraction of the loan, paid once. */
  feePct?: number;
}

export interface LoanResult {
  emi: number;
  /** Months actually taken to repay, after any prepayment. */
  months: number;
  totalInterest: number;
  processingFee: number;
  /** Everything paid: principal + interest + fee. */
  totalPaid: number;
  /** Interest as a fraction of the amount borrowed. */
  interestShare: number;
  years: LoanYear[];
  /** Same loan without any prepayment, for comparison. */
  plain: { months: number; totalInterest: number };
  interestSaved: number;
  monthsSaved: number;
}

function run(input: LoanInput, prepay: boolean): { emi: number; months: number; interest: number; years: LoanYear[] } {
  const n = Math.round(input.years * 12);
  const payment = emi(input.amount, input.rate, input.years);
  const i = input.rate / 12;
  const extra = prepay ? (input.extraMonthly ?? 0) : 0;
  const lump = prepay ? (input.lump ?? 0) : 0;
  const lumpMonth = input.lumpMonth ?? 0;
  let balance = input.amount;
  let interest = 0;
  let months = 0;
  const years: LoanYear[] = [];
  let yp = 0;
  let yi = 0;
  const cap = n + 1;
  while (balance > 0.005 && months < cap) {
    months++;
    const monthInterest = balance * i;
    let principal = Math.min(balance, payment - monthInterest + extra);
    if (principal < 0) principal = 0;
    balance -= principal;
    if (lump > 0 && months === lumpMonth && balance > 0) { const l = Math.min(balance, lump); principal += l; balance -= l; }
    interest += monthInterest;
    yp += principal;
    yi += monthInterest;
    if (months % 12 === 0 || balance <= 0.005) { years.push({ year: Math.ceil(months / 12), principalPaid: yp, interestPaid: yi, balance: balance <= 0.005 ? 0 : balance }); yp = 0; yi = 0; }
  }
  return { emi: payment, months, interest, years };
}

/**
 * EMI, total interest and a year-by-year schedule for a reducing-balance loan, with optional prepayment.
 *
 * @param input - Amount, yearly rate (fraction), years, optional prepayments and processing fee.
 * @returns The EMI, totals, the schedule and what prepayment saves.
 */
export function loan(input: LoanInput): LoanResult {
  const base = run(input, false);
  const r = run(input, true);
  const processingFee = input.amount * (input.feePct ?? 0);
  return {
    emi: r.emi,
    months: r.months,
    totalInterest: r.interest,
    processingFee,
    totalPaid: input.amount + r.interest + processingFee,
    interestShare: input.amount > 0 ? r.interest / input.amount : 0,
    years: r.years,
    plain: { months: base.months, totalInterest: base.interest },
    interestSaved: base.interest - r.interest,
    monthsSaved: base.months - r.months,
  };
}

/**
 * EMI of a loan quoted at a flat rate.
 *
 * @param amount - Loan amount.
 * @param flatRate - Flat yearly rate as a fraction.
 * @param years - Tenure in years.
 */
export function flatEmi(amount: number, flatRate: number, years: number): number {
  const n = Math.round(years * 12);
  return n > 0 ? (amount + amount * flatRate * years) / n : 0;
}

/**
 * The reducing-balance yearly rate that gives a stated EMI, found by bisection.
 *
 * @returns The rate as a fraction, or null if the EMI cannot repay the amount.
 */
export function rateFromEmi(amount: number, payment: number, years: number): number | null {
  const n = Math.round(years * 12);
  if (amount <= 0 || n <= 0 || payment * n < amount) return null;
  if (Math.abs(payment * n - amount) < 1e-9) return 0;
  let lo = 0;
  let hi = 5;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (emi(amount, mid, years) < payment) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface DepositInput {
  amount: number;
  /** Yearly interest rate as a fraction. */
  rate: number;
  years: number;
  /** Times a year interest is added: 12 monthly, 4 quarterly, 2 half-yearly, 1 yearly. */
  perYear: 1 | 2 | 4 | 12;
  /** Tax rate on the interest as a fraction. */
  taxRate: number;
  /** Yearly inflation as a fraction. */
  inflation: number;
}

export interface DepositResult {
  maturity: number;
  interest: number;
  tax: number;
  /** Interest left after tax. */
  interestAfterTax: number;
  /** Maturity amount after tax. */
  maturityAfterTax: number;
  /** Yearly rate actually earned with compounding, before tax. */
  effectiveRate: number;
  /** Yearly rate earned after tax. */
  afterTaxRate: number;
  /** Yearly rate after tax and inflation: how fast buying power grows. */
  realRate: number;
  /** What the maturity amount (after tax) is worth in today's money. */
  maturityInTodaysMoney: number;
  years: { year: number; value: number }[];
}

/**
 * Fixed deposit maturity with tax and inflation.
 *
 * @param p - Amount, yearly rate, years, compounding, tax rate and inflation, all as fractions.
 */
export function deposit(p: DepositInput): DepositResult {
  const growth = (t: number): number => p.amount * (1 + p.rate / p.perYear) ** (p.perYear * t);
  const maturity = growth(p.years);
  const interest = maturity - p.amount;
  const tax = interest * p.taxRate;
  const maturityAfterTax = maturity - tax;
  const rateOf = (end: number): number => (p.amount > 0 && end > 0 && p.years > 0 ? (end / p.amount) ** (1 / p.years) - 1 : 0);
  const afterTaxRate = rateOf(maturityAfterTax);
  const years: { year: number; value: number }[] = [];
  for (let y = 1; y <= Math.ceil(p.years); y++) years.push({ year: y, value: growth(Math.min(y, p.years)) });
  return {
    maturity,
    interest,
    tax,
    interestAfterTax: interest - tax,
    maturityAfterTax,
    effectiveRate: (1 + p.rate / p.perYear) ** p.perYear - 1,
    afterTaxRate,
    realRate: (1 + afterTaxRate) / (1 + p.inflation) - 1,
    maturityInTodaysMoney: maturityAfterTax / (1 + p.inflation) ** p.years,
    years,
  };
}

/**
 * Inflation: what costs more later, and what money is worth later.
 *
 * @param amount - Amount today.
 * @param rate - Yearly inflation as a fraction.
 * @param years - Number of years.
 * @returns The same thing's cost in future, and the buying power of the same amount in future.
 */
export function inflation(amount: number, rate: number, years: number): { futureCost: number; buyingPower: number; lostShare: number } {
  const f = (1 + rate) ** years;
  return { futureCost: amount * f, buyingPower: amount / f, lostShare: 1 - 1 / f };
}
