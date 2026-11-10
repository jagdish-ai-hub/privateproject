/**
 * Extra questions shown on the ENGLISH Government scheme pages only, after the shared FAQ.
 *
 * Rules on early closure, extension, loans and withdrawals are from India Post's "Post Office Savings
 * Schemes" booklet (version 2.0, dated 7 October 2024, indiapost.gov.in) and, for NSC, the National
 * Savings Certificates (VIII Issue) Scheme rules on nsiindia.gov.in. Rules can change; each answer
 * tells the reader to confirm at the post office. Numbers come from the calculators' own functions.
 */
import { SMALL_SAVINGS } from '../data/small-savings.ts';
import { formatRupees } from './format.ts';
import type { SchemeKind } from './schemeContent.ts';
import { mis, nsc, ppf, rd, scss, ssy, timeDeposit } from './schemes.ts';
import type { Faq } from './seo.ts';

const R = SMALL_SAVINGS.rates;
const rs = (n: number): string => formatRupees(Math.round(n));
const pct = (v: number): string => `${v}%`;
const CONFIRM = 'Rules can change, so confirm at your post office or bank before acting.';

export const SCHEME_EXTRA_FAQS: Record<SchemeKind, Faq[]> = {
  ppf: [
    { question: 'How much will ₹1.5 lakh a year in PPF become in 15 years?', answer: `At the current ${pct(R.ppf)}, depositing ${rs(150_000)} at the start of every year for 15 years gives about ${rs(ppf(150_000, R.ppf / 100).maturity)}, of which ${rs(ppf(150_000, R.ppf / 100).interest)} is interest. ${rs(50_000)} a year gives about ${rs(ppf(50_000, R.ppf / 100).maturity)}. The rate is reviewed every quarter, so the real figure will differ.` },
    { question: 'Can I withdraw from PPF before 15 years?', answer: `Partly. India Post states that a loan can be taken against the balance from the 3rd financial year and partial withdrawals are allowed from the 7th year. The full balance is paid at maturity after 15 years. ${CONFIRM}` },
    { question: 'What happens if I miss a year’s PPF deposit?', answer: `The account becomes inactive if the minimum ₹500 is not deposited in a year. India Post states it can be revived by paying ₹50 for each missed year along with the missed minimum deposits. Loans and withdrawals are not allowed while the account is inactive. ${CONFIRM}` },
  ],
  ssy: [
    { question: 'How much will ₹1.5 lakh a year in Sukanya Samriddhi become?', answer: `At the current ${pct(R.ssy)}, depositing ${rs(150_000)} at the start of every year for 15 years grows to about ${rs(ssy(150_000, R.ssy / 100).maturity)} when the account matures after 21 years. ${rs(50_000)} a year grows to about ${rs(ssy(50_000, R.ssy / 100).maturity)}, and ${rs(12_000)} a year (₹1,000 a month) to about ${rs(ssy(12_000, R.ssy / 100).maturity)}. The rate is reviewed every quarter.` },
    { question: 'Can I deposit every month instead of once a year?', answer: 'Yes. You can deposit in instalments through the year, as long as the total is between ₹250 and ₹1,50,000 in a financial year. Deposits made by the 5th of a month earn interest for that month.' },
  ],
  scss: [
    { question: 'How much interest does SCSS pay on ₹15 lakh and ₹30 lakh?', answer: `At ${pct(R.scss)}, a deposit of ${rs(1_500_000)} pays ${rs(scss(1_500_000, R.scss / 100).perPeriod)} every quarter and ${rs(3_000_000)} pays ${rs(scss(3_000_000, R.scss / 100).perPeriod)} every quarter, which is about ${rs(scss(3_000_000, R.scss / 100).perPeriod / 3)} a month. Each ${rs(100_000)} pays ${rs(scss(100_000, R.scss / 100).perPeriod)} a quarter.` },
    { question: 'Can I close an SCSS account before 5 years?', answer: `Yes, with a deduction. India Post states: if closed before 1 year, no interest is paid and interest already paid is recovered from the deposit; after 1 year but before 2 years, 1.5% of the deposit is deducted; after 2 years but before 5 years, 1% is deducted. ${CONFIRM}` },
    { question: 'Can SCSS be extended after 5 years?', answer: `Yes. India Post states the account can be renewed for further terms of 3 years each, at the rate in force on the maturity date. If an extended account is closed within one year of the extension, 1% of the deposit is deducted. ${CONFIRM}` },
    { question: 'Is TDS deducted on SCSS interest?', answer: 'Yes, when your total SCSS interest in a financial year is above the limit set in the tax law for senior citizens, which has been reported as ₹1 lakh from April 2025 (₹50,000 before). If your tax for the year is nil you can give a self-declaration so that tax is not deducted. Ask your post office or bank for the current limit and form.' },
  ],
  nsc: [
    { question: 'How much will ₹1,000, ₹10,000 and ₹1 lakh in NSC become after 5 years?', answer: `At the current ${pct(R.nsc)}, ${rs(1_000)} becomes ${formatRupees(nsc(1_000, R.nsc / 100).maturity, 2)}, ${rs(10_000)} becomes ${rs(nsc(10_000, R.nsc / 100).maturity)}, ${rs(100_000)} becomes ${rs(nsc(100_000, R.nsc / 100).maturity)} and ${rs(500_000)} becomes ${rs(nsc(500_000, R.nsc / 100).maturity)}.` },
    { question: 'Can NSC be encashed before 5 years?', answer: `Generally no. The scheme rules allow closure before maturity only on the death of the holder, on forfeiture by a pledgee, or on a court order. Plan to leave the money for the full 5 years. ${CONFIRM}` },
    { question: 'Is there a maximum limit on NSC?', answer: 'No. The minimum is ₹1,000 and there is no upper limit, but only ₹1.5 lakh a year counts towards the tax deduction, and only under the old tax regime.' },
  ],
  kvp: [
    { question: 'Can KVP be encashed before maturity?', answer: `Yes, but only after 2 years and 6 months from the date of purchase, according to India Post. Early encashment pays less than double. ${CONFIRM}` },
    { question: 'How much will ₹1 lakh in KVP become?', answer: `It doubles. ${rs(100_000)} becomes ${rs(200_000)} after ${SMALL_SAVINGS.kvpMonths} months (${Math.floor(SMALL_SAVINGS.kvpMonths / 12)} years ${SMALL_SAVINGS.kvpMonths % 12} months) for certificates bought at the current ${pct(R.kvp)}.` },
  ],
  mis: [
    { question: 'How much monthly income does Post Office MIS pay per ₹1 lakh?', answer: `At ${pct(R.mis)}, every ${rs(100_000)} pays ${rs(mis(100_000, R.mis / 100).perPeriod)} a month. ${rs(500_000)} pays ${rs(mis(500_000, R.mis / 100).perPeriod)}, the single-account maximum of ${rs(900_000)} pays ${rs(mis(900_000, R.mis / 100).perPeriod)}, and the joint-account maximum of ${rs(1_500_000)} pays ${rs(mis(1_500_000, R.mis / 100).perPeriod)} a month.` },
    { question: 'Can I close a Post Office MIS account before 5 years?', answer: `Early closure is allowed after the first year, with a deduction. India Post states: if closed after 1 year but before 3 years, 2% of the deposit is deducted; after 3 years but before 5 years, 1% is deducted. ${CONFIRM}` },
    { question: 'Is the MIS interest compounded?', answer: 'No. The interest is paid out every month and the deposit stays the same. To earn interest on the interest you would have to reinvest the monthly payout yourself, for example in a recurring deposit.' },
  ],
  rd: [
    { question: 'How much will ₹1,000, ₹5,000 and ₹10,000 a month in Post Office RD become?', answer: `At ${pct(R.rd5)} over 5 years, ${rs(1_000)} a month becomes ${rs(rd(1_000, R.rd5 / 100).maturity)}, ${rs(5_000)} a month becomes ${rs(rd(5_000, R.rd5 / 100).maturity)} and ${rs(10_000)} a month becomes ${rs(rd(10_000, R.rd5 / 100).maturity)}.` },
    { question: 'Can I close a Post Office RD early?', answer: `Yes, after 3 years from the date of opening, according to India Post. Ask what interest is paid on early closure, because it can be lower than the RD rate. ${CONFIRM}` },
    { question: 'Can I take a loan against a Post Office RD?', answer: `Yes. India Post states that after 12 instalments, with the account continued for a year, you can borrow up to 50% of the balance. ${CONFIRM}` },
    { question: 'Can the RD be continued after 5 years?', answer: `Yes. India Post states the account can be extended for a further 5 years on application, at the interest rate at which it was originally opened. ${CONFIRM}` },
  ],
  td: [
    { question: 'How much will ₹1 lakh in a 5-year Post Office FD earn?', answer: `At ${pct(R.td5)}, ${rs(100_000)} pays ${rs(timeDeposit(100_000, R.td5 / 100, 5).perPeriod)} in interest every year, ${rs(timeDeposit(100_000, R.td5 / 100, 5).totalInterest)} over 5 years. A 1-year deposit at ${pct(R.td1)} pays ${rs(timeDeposit(100_000, R.td1 / 100, 1).perPeriod)}.` },
    { question: 'Can a Post Office FD be closed before maturity?', answer: `Not in the first 6 months. India Post states: closed after 6 months but before 1 year, it earns only the Post Office savings account rate; a 2-year or 3-year deposit closed after 1 year earns 2 percentage points less than the deposit rate; a 5-year deposit can be closed after 4 years and then earns only the savings account rate. ${CONFIRM}` },
    { question: 'Post Office FD or bank FD: which is better?', answer: 'Compare the rate for the same term, and what you need from the deposit. Post Office deposits are backed by the Government of India, with rates set every quarter; bank deposits are insured up to ₹5 lakh per bank and their rates differ by bank. Interest on both is taxable.' },
  ],
};

/** The FAQ of an English scheme page: the shared questions, then the English-only extras. */
export function schemeFaqs(kind: SchemeKind, faqs: Faq[]): Faq[] {
  return [...faqs, ...SCHEME_EXTRA_FAQS[kind]];
}
