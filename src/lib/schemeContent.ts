/**
 * Page content for the Government savings scheme calculators (English). Hindi lives in
 * schemeContent.hi.ts with the same shape. Every number in an example is produced by the same
 * function the calculator uses (src/lib/schemes.ts), with the notified rate from
 * src/data/small-savings.ts, so text and calculator can never disagree.
 *
 * Tax lines follow the Income-tax Act, 2025 (in force from 1 April 2026), where the old Section 80C
 * deduction is Section 123. They are deliberately short; people should check their own position.
 */
import { SMALL_SAVINGS } from '../data/small-savings.ts';
import { formatRupees } from './format.ts';
import { kvp, mis, nsc, ppf, rd, scss, ssy, timeDeposit } from './schemes.ts';
import type { Faq } from './seo.ts';

export type SchemeKind = 'ppf' | 'ssy' | 'scss' | 'nsc' | 'kvp' | 'mis' | 'rd' | 'td';

/** Content of one scheme calculator page. */
export interface SchemePage {
  kind: SchemeKind;
  slug: string;
  /** Short name for lists and breadcrumbs. */
  name: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  /** How the money is calculated, one convention per line. */
  conventions: string[];
  formula: string;
  /** Rules at a glance: label and value. */
  rules: [string, string][];
  tax: string;
  example: () => string;
  faqs: Faq[];
}

const R = SMALL_SAVINGS.rates;
const pct = (v: number) => `${v}%`;
const rs = (v: number) => formatRupees(v, v < 10_000 && v % 1 !== 0 ? 2 : 0);
const TAX_NOTE = 'Tax rules are those of the Income-tax Act, 2025, in force from 1 April 2026; check your own position before relying on them.';
const DEDUCTION = 'deposits count towards the ₹1.5 lakh deduction under Section 123 of the Income-tax Act, 2025 (formerly Section 80C), only if you choose the old tax regime';

export const SCHEMES_EN: SchemePage[] = [
  {
    kind: 'ppf', slug: 'ppf-calculator', name: 'PPF calculator',
    title: `PPF Calculator ${new Date(SMALL_SAVINGS.period.from).getFullYear()}: Public Provident Fund at ${pct(R.ppf)}`,
    h1: 'PPF calculator',
    description: `Free PPF calculator at the current ${pct(R.ppf)} rate. See the maturity value, interest earned and a year-by-year table for yearly or monthly deposits, with the rate notice and formula shown.`,
    intro: 'Work out what your Public Provident Fund (PPF) account will be worth. Enter how much you deposit each year and for how long. The calculator uses the rate notified by the Finance Ministry and shows exactly how the interest is worked out.',
    conventions: [
      'Interest is calculated every month on the lowest balance between the 5th and the end of that month, at the yearly rate ÷ 12.',
      'The month’s interest is not added to the balance straight away: the year’s interest is credited once, at the end of the financial year (31 March).',
      'A deposit made by 5 April earns interest for the whole year. "Every month" spreads the yearly amount into 12 deposits made by the 5th of each month, which earns a little less.',
      'The account matures after 15 full financial years and can be extended in blocks of 5 years. The rate is assumed to stay the same for every year, although the government can change it every quarter.',
    ],
    formula: 'Each year: interest = Σ (balance after the month’s deposit × rate ÷ 12) over 12 months;  closing balance = opening balance + deposits + interest',
    rules: [
      ['Deposit per year', '₹500 to ₹1,50,000'],
      ['Term', '15 years, extendable in blocks of 5 years'],
      ['Interest', `${pct(R.ppf)} a year, credited yearly`],
      ['Who can open', 'Resident individuals; one account per person'],
    ],
    tax: `PPF is fully tax-free: ${DEDUCTION}, and the interest and the maturity amount are not taxed. ${TAX_NOTE}`,
    example: () => { const x = ppf(150_000, R.ppf / 100, 15); return `Depositing ${rs(150_000)} every year by 5 April for 15 years at ${pct(R.ppf)} puts in ${rs(x.invested)} and grows to ${rs(x.maturity)}, of which ${rs(x.interest)} is interest.`; },
    faqs: [
      { question: 'What is the current PPF interest rate?', answer: `${pct(R.ppf)} a year for ${SMALL_SAVINGS.period.label}, as notified by the Ministry of Finance on ${SMALL_SAVINGS.notice.date.split('-').reverse().join('.')}. The rate is reviewed every quarter.` },
      { question: 'Why does depositing before 5 April matter?', answer: 'PPF interest for a month is calculated on the lowest balance between the 5th and the last day of the month. Money deposited by 5 April therefore earns interest for all 12 months of the financial year.' },
      { question: 'Is PPF interest taxable?', answer: 'No. PPF interest and the maturity amount are tax-free. The yearly deposit can also be deducted from taxable income under Section 123 (formerly 80C), but only under the old tax regime.' },
      { question: 'Can I continue PPF after 15 years?', answer: 'Yes. You can extend the account in blocks of 5 years, with or without fresh deposits. Set the term above to 20, 25 or more years to see the effect of continuing deposits.' },
    ],
  },
  {
    kind: 'ssy', slug: 'sukanya-samriddhi-calculator', name: 'Sukanya Samriddhi calculator',
    title: `Sukanya Samriddhi Yojana Calculator (SSY) at ${pct(R.ssy)}`,
    h1: 'Sukanya Samriddhi Yojana (SSY) calculator',
    description: `Free Sukanya Samriddhi Yojana calculator at the current ${pct(R.ssy)} rate. See the maturity value after 21 years, interest earned and a year-by-year table.`,
    intro: 'Sukanya Samriddhi Yojana (SSY) is a savings scheme for a girl child. You deposit for 15 years, and the account keeps earning interest until it matures 21 years after it was opened. Enter the yearly deposit and the girl’s age to see the maturity value.',
    conventions: [
      'Deposits are made for 15 years from opening; no deposits are needed in years 16 to 21, but the balance keeps earning interest.',
      'Interest is calculated every month on the lowest balance between the 5th and the end of the month, at the yearly rate ÷ 12, and credited once a year at the end of the financial year.',
      'A deposit made by 5 April earns interest for the whole year; "every month" spreads the yearly amount into 12 deposits made by the 5th.',
      'The rate is assumed to stay the same for all 21 years, although the government can change it every quarter.',
    ],
    formula: 'Years 1–15: deposit + interest; years 16–21: interest only.  Each year: interest = Σ (balance × rate ÷ 12) over 12 months, credited at year end',
    rules: [
      ['Deposit per year', '₹250 to ₹1,50,000'],
      ['Deposit period', '15 years from opening'],
      ['Maturity', '21 years from opening'],
      ['Who can open', 'A parent or guardian, for a girl below 10 years; up to two accounts per family'],
    ],
    tax: `SSY is fully tax-free: ${DEDUCTION}, and the interest and the maturity amount are not taxed. ${TAX_NOTE}`,
    example: () => { const x = ssy(150_000, R.ssy / 100); return `Depositing ${rs(150_000)} every year by 5 April for 15 years at ${pct(R.ssy)} puts in ${rs(x.invested)}. At maturity after 21 years the account is worth ${rs(x.maturity)}, of which ${rs(x.interest)} is interest.`; },
    faqs: [
      { question: 'What is the current Sukanya Samriddhi interest rate?', answer: `${pct(R.ssy)} a year for ${SMALL_SAVINGS.period.label}, as notified by the Ministry of Finance. The rate is reviewed every quarter.` },
      { question: 'For how many years do I have to deposit?', answer: 'For 15 years from the date the account is opened. After that the account keeps earning interest until it matures 21 years from opening.' },
      { question: 'When can the money be withdrawn?', answer: 'The account matures 21 years after opening. Up to 50% of the balance can be withdrawn for the girl’s education after she turns 18, and the account can be closed for her marriage after 18.' },
      { question: 'Is SSY interest taxable?', answer: 'No. The interest and the maturity amount are tax-free, and deposits can be deducted under Section 123 (formerly 80C) under the old tax regime.' },
    ],
  },
  {
    kind: 'scss', slug: 'scss-calculator', name: 'SCSS calculator',
    title: `Senior Citizen Savings Scheme Calculator (SCSS) at ${pct(R.scss)}`,
    h1: 'Senior Citizens’ Savings Scheme (SCSS) calculator',
    description: `Free SCSS calculator at the current ${pct(R.scss)} rate. See the quarterly interest payout and the total interest over 5 years.`,
    intro: 'The Senior Citizens’ Savings Scheme (SCSS) pays interest every quarter on a lump sum. Enter the amount to see how much you receive each quarter and in total.',
    conventions: [
      'Interest is paid every quarter, on the first working day of April, July, October and January.',
      'It is simple interest: the payout is not added back to the deposit, so it does not compound.',
      'The rate is fixed for the whole term at the rate in force when you open the account.',
    ],
    formula: 'Quarterly payout = deposit × rate ÷ 4;  total interest = quarterly payout × 4 × years',
    rules: [
      ['Deposit', '₹1,000 to ₹30,00,000, in multiples of ₹1,000'],
      ['Term', '5 years, extendable once by 3 years'],
      ['Interest', `${pct(R.scss)} a year, paid quarterly`],
      ['Who can open', 'Individuals aged 60 or more (some retirees from 55)'],
    ],
    tax: `${DEDUCTION.charAt(0).toUpperCase() + DEDUCTION.slice(1)}. The interest is taxable, and tax may be deducted at source above a limit. ${TAX_NOTE}`,
    example: () => { const x = scss(1_500_000, R.scss / 100); return `A deposit of ${rs(1_500_000)} at ${pct(R.scss)} pays ${rs(x.perPeriod)} every quarter, or ${rs(x.totalInterest)} over 5 years. The deposit itself is returned at maturity.`; },
    faqs: [
      { question: 'What is the current SCSS interest rate?', answer: `${pct(R.scss)} a year for accounts opened in ${SMALL_SAVINGS.period.label}. The rate stays fixed for the account’s whole term.` },
      { question: 'How often is SCSS interest paid?', answer: 'Every quarter, on the first working day of April, July, October and January.' },
      { question: 'What is the maximum SCSS deposit?', answer: '₹30 lakh per person across all SCSS accounts.' },
      { question: 'Is SCSS interest taxable?', answer: 'Yes, the interest is taxable. The deposit can be deducted under Section 123 (formerly 80C), but only under the old tax regime.' },
    ],
  },
  {
    kind: 'nsc', slug: 'nsc-calculator', name: 'NSC calculator',
    title: `NSC Calculator: National Savings Certificate at ${pct(R.nsc)}`,
    h1: 'National Savings Certificate (NSC) calculator',
    description: `Free NSC calculator at the current ${pct(R.nsc)} rate. See the maturity value after 5 years and the interest added each year.`,
    intro: 'The National Savings Certificate (NSC) is a 5-year Post Office deposit. Interest is added every year and paid with the deposit at maturity. Enter the amount to see what you get back.',
    conventions: [
      'Interest compounds once a year and is paid together with the deposit at the end of 5 years.',
      'The rate is fixed for the whole 5 years at the rate in force when you buy the certificate.',
    ],
    formula: 'Maturity value = amount × (1 + rate)^5;  interest for year y = balance at the start of year y × rate',
    rules: [
      ['Investment', '₹1,000 or more, in multiples of ₹100; no upper limit'],
      ['Term', '5 years'],
      ['Interest', `${pct(R.nsc)} a year, compounded yearly, paid at maturity`],
    ],
    tax: `${DEDUCTION.charAt(0).toUpperCase() + DEDUCTION.slice(1)}. The interest is taxable; the interest of the first four years is treated as reinvested and also counts towards the deduction under the old regime. ${TAX_NOTE}`,
    example: () => { const x = nsc(100_000, R.nsc / 100); return `${rs(100_000)} invested in NSC at ${pct(R.nsc)} grows to ${rs(x.maturity)} after 5 years, of which ${rs(x.interest)} is interest.`; },
    faqs: [
      { question: 'What is the current NSC interest rate?', answer: `${pct(R.nsc)} a year for certificates bought in ${SMALL_SAVINGS.period.label}. The rate is fixed for the 5-year term.` },
      { question: 'Is NSC interest paid every year?', answer: 'No. It is added to the certificate every year (compounded) and paid together with the deposit after 5 years.' },
      { question: 'Is NSC interest taxable?', answer: 'Yes. The interest is taxable each year, although the yearly interest of the first four years counts as reinvested for the Section 123 (formerly 80C) deduction under the old regime.' },
    ],
  },
  {
    kind: 'kvp', slug: 'kvp-calculator', name: 'KVP calculator',
    title: `KVP Calculator: Kisan Vikas Patra Doubles in ${SMALL_SAVINGS.kvpMonths} Months`,
    h1: 'Kisan Vikas Patra (KVP) calculator',
    description: `Free Kisan Vikas Patra calculator. At the current ${pct(R.kvp)} rate, money invested in KVP doubles in ${SMALL_SAVINGS.kvpMonths} months.`,
    intro: `Kisan Vikas Patra (KVP) doubles your money over a fixed period. At the current rate of ${pct(R.kvp)} the period is ${SMALL_SAVINGS.kvpMonths} months. Enter the amount to see the maturity value and date.`,
    conventions: [
      `The amount doubles in the number of months stated in the rate notice: ${SMALL_SAVINGS.kvpMonths} months at ${pct(R.kvp)} a year, compounded yearly.`,
      'The term and rate are fixed when you buy the certificate.',
    ],
    formula: `Maturity value = amount × 2, after ${SMALL_SAVINGS.kvpMonths} months  (2^(12/${SMALL_SAVINGS.kvpMonths}) − 1 ≈ ${pct(R.kvp)} a year)`,
    rules: [
      ['Investment', '₹1,000 or more, in multiples of ₹100; no upper limit'],
      ['Term', `${SMALL_SAVINGS.kvpMonths} months (${Math.floor(SMALL_SAVINGS.kvpMonths / 12)} years ${SMALL_SAVINGS.kvpMonths % 12} months)`],
      ['Interest', `${pct(R.kvp)} a year, compounded yearly`],
    ],
    tax: `There is no deduction for KVP, and the interest is taxable. ${TAX_NOTE}`,
    example: () => { const x = kvp(100_000, SMALL_SAVINGS.kvpMonths); return `${rs(100_000)} in KVP becomes ${rs(x.maturity)} after ${x.months} months.`; },
    faqs: [
      { question: 'In how many months does KVP double?', answer: `${SMALL_SAVINGS.kvpMonths} months for certificates bought in ${SMALL_SAVINGS.period.label}, at ${pct(R.kvp)} a year.` },
      { question: 'Is KVP interest taxable?', answer: 'Yes. KVP gives no tax deduction, and the interest is taxable.' },
    ],
  },
  {
    kind: 'mis', slug: 'post-office-mis-calculator', name: 'Post Office MIS calculator',
    title: `Post Office MIS Calculator: Monthly Income Scheme at ${pct(R.mis)}`,
    h1: 'Post Office Monthly Income Scheme (MIS) calculator',
    description: `Free Post Office MIS calculator at the current ${pct(R.mis)} rate. See the monthly income and the total interest over 5 years.`,
    intro: 'The Post Office Monthly Income Scheme (MIS) pays interest every month on a lump sum for 5 years. Enter the amount to see your monthly income.',
    conventions: [
      'Interest is paid every month and does not compound: the payout is not added back to the deposit.',
      'The rate is fixed for 5 years at the rate in force when you open the account. The deposit is returned at maturity.',
    ],
    formula: 'Monthly income = deposit × rate ÷ 12;  total interest = monthly income × 60',
    rules: [
      ['Deposit', '₹1,000 up to ₹9 lakh (single) or ₹15 lakh (joint)'],
      ['Term', '5 years'],
      ['Interest', `${pct(R.mis)} a year, paid monthly`],
    ],
    tax: `There is no deduction for MIS, and the interest is taxable. ${TAX_NOTE}`,
    example: () => { const x = mis(900_000, R.mis / 100); return `${rs(900_000)} in a single MIS account at ${pct(R.mis)} pays ${rs(x.perPeriod)} every month, or ${rs(x.totalInterest)} over 5 years.`; },
    faqs: [
      { question: 'What is the maximum MIS deposit?', answer: '₹9 lakh in a single account and ₹15 lakh in a joint account.' },
      { question: 'What is the current MIS interest rate?', answer: `${pct(R.mis)} a year for accounts opened in ${SMALL_SAVINGS.period.label}, paid every month.` },
      { question: 'Is MIS interest taxable?', answer: 'Yes. There is no tax deduction for MIS, and the monthly interest is taxable.' },
    ],
  },
  {
    kind: 'rd', slug: 'post-office-rd-calculator', name: 'Post Office RD calculator',
    title: `Post Office RD Calculator: Recurring Deposit at ${pct(R.rd5)}`,
    h1: 'Post Office Recurring Deposit (RD) calculator',
    description: `Free Post Office RD calculator at the current ${pct(R.rd5)} rate. See the maturity value of a monthly deposit after 5 years, with a yearly table.`,
    intro: 'A Post Office Recurring Deposit (RD) is a fixed amount saved every month for 5 years. Enter the monthly amount to see the maturity value.',
    conventions: [
      'Interest compounds every quarter. Each monthly instalment earns interest from the month it is paid until maturity.',
      'The rate is fixed for 5 years at the rate in force when you open the account.',
    ],
    formula: 'Maturity = Σ over 60 instalments of P × (1 + rate ÷ 4)^(months remaining ÷ 3)',
    rules: [
      ['Monthly deposit', '₹100 or more, in multiples of ₹10'],
      ['Term', '5 years'],
      ['Interest', `${pct(R.rd5)} a year, compounded quarterly`],
    ],
    tax: `There is no deduction for the RD, and the interest is taxable. ${TAX_NOTE}`,
    example: () => { const x = rd(100, R.rd5 / 100); const y = rd(5_000, R.rd5 / 100); return `₹100 a month for 5 years at ${pct(R.rd5)} grows to ${rs(x.maturity)}. ${rs(5_000)} a month grows to ${rs(y.maturity)}, of which ${rs(y.interest)} is interest.`; },
    faqs: [
      { question: 'What is the current Post Office RD rate?', answer: `${pct(R.rd5)} a year, compounded quarterly, for accounts opened in ${SMALL_SAVINGS.period.label}.` },
      { question: 'How much does ₹100 a month give after 5 years?', answer: `${rs(rd(100, R.rd5 / 100).maturity)} at ${pct(R.rd5)}.` },
      { question: 'Is RD interest taxable?', answer: 'Yes. There is no tax deduction for the RD, and the interest is taxable.' },
    ],
  },
  {
    kind: 'td', slug: 'post-office-fd-calculator', name: 'Post Office FD (Time Deposit) calculator',
    title: `Post Office FD Calculator: Time Deposit Rates up to ${pct(R.td5)}`,
    h1: 'Post Office Time Deposit (FD) calculator',
    description: `Free Post Office FD calculator for 1, 2, 3 and 5-year Time Deposits (${pct(R.td1)} to ${pct(R.td5)}). See the yearly interest and the total.`,
    intro: 'A Post Office Time Deposit (TD), often called a Post Office FD, is a lump sum deposited for 1, 2, 3 or 5 years. Choose the term to see the interest.',
    conventions: [
      'Interest is calculated quarterly and paid out once a year; the payout does not compound.',
      `The rate depends on the term: 1 year ${pct(R.td1)}, 2 years ${pct(R.td2)}, 3 years ${pct(R.td3)}, 5 years ${pct(R.td5)}.`,
    ],
    formula: 'Yearly interest = deposit × [ (1 + rate ÷ 4)^4 − 1 ];  total interest = yearly interest × years',
    rules: [
      ['Deposit', '₹1,000 or more, in multiples of ₹100; no upper limit'],
      ['Term', '1, 2, 3 or 5 years'],
      ['Interest', `${pct(R.td1)} to ${pct(R.td5)} a year, paid yearly`],
    ],
    tax: `Only the 5-year deposit counts towards the Section 123 (formerly 80C) deduction, under the old tax regime. Interest on all terms is taxable. ${TAX_NOTE}`,
    example: () => { const x = timeDeposit(100_000, R.td5 / 100, 5); return `${rs(100_000)} in a 5-year Time Deposit at ${pct(R.td5)} pays ${rs(x.perPeriod)} a year, or ${rs(x.totalInterest)} over 5 years.`; },
    faqs: [
      { question: 'What are the current Post Office FD rates?', answer: `1 year ${pct(R.td1)}, 2 years ${pct(R.td2)}, 3 years ${pct(R.td3)} and 5 years ${pct(R.td5)}, for deposits made in ${SMALL_SAVINGS.period.label}.` },
      { question: 'Is the interest paid every year?', answer: 'Yes. Interest is calculated quarterly and paid out once a year.' },
      { question: 'Which Post Office FD saves tax?', answer: 'Only the 5-year Time Deposit qualifies for the Section 123 (formerly 80C) deduction, and only under the old tax regime.' },
    ],
  },
];

/** Hub-page row per scheme: compounding and term in a few words. */
export const SCHEME_SUMMARY_EN: Record<SchemeKind, { rate: string; how: string; term: string }> = {
  ppf: { rate: pct(R.ppf), how: 'Credited yearly', term: '15 years' },
  ssy: { rate: pct(R.ssy), how: 'Credited yearly', term: '21 years (deposits 15)' },
  scss: { rate: pct(R.scss), how: 'Paid quarterly', term: '5 years' },
  nsc: { rate: pct(R.nsc), how: 'Compounded yearly, paid at maturity', term: '5 years' },
  kvp: { rate: pct(R.kvp), how: `Doubles in ${SMALL_SAVINGS.kvpMonths} months`, term: `${SMALL_SAVINGS.kvpMonths} months` },
  mis: { rate: pct(R.mis), how: 'Paid monthly', term: '5 years' },
  rd: { rate: pct(R.rd5), how: 'Compounded quarterly', term: '5 years' },
  td: { rate: `${pct(R.td1)}–${pct(R.td5)}`, how: 'Paid yearly', term: '1, 2, 3 or 5 years' },
};
