/**
 * Plain-language explanations for the (i) buttons. One place, so the fund page, compare page and
 * screener say the same thing. Wording rules: say what the number is, how to read it, and what it
 * does not tell you; never tell the reader what to buy.
 */
import type { SortKey } from './screener/types.ts';

/** One explainer. */
export interface Term {
  /** Heading of the popover. */
  title: string;
  /** What the number is, in one or two sentences. */
  what: string;
  /** How to read it, ideally with a small example. */
  read: string;
  /** Optional guide for more depth. */
  learn?: { href: string; label: string };
}

export type TermKey =
  | 'nav' | 'ter' | 'aum' | 'planAum' | 'age' | 'cagr' | 'absolute' | 'sip' | 'volatility' | 'drawdown'
  | 'sharpe' | 'sortino' | 'rollingPositive' | 'rollingAvg' | 'rollingMin' | 'rank' | 'plan' | 'ber' | 'levies' | 'dropChart';

export const GLOSSARY: Record<TermKey, Term> = {
  nav: {
    title: 'NAV (Net Asset Value)',
    what: 'The price of one unit of the fund. Each business day the fund adds up everything it owns, subtracts its costs, and divides by the number of units.',
    read: 'A higher NAV does not mean a more expensive or better fund. A fund with NAV ₹20 and one with NAV ₹500 can grow at the same rate; what matters is how the NAV changes over time.',
    learn: { href: '/learn/what-is-nav-in-mutual-funds/', label: 'What is NAV?' },
  },
  ter: {
    title: 'TER (Total Expense Ratio)',
    what: 'The yearly cost of running the fund, as a percentage of its assets. It is taken out of the fund every day, so the NAV and every return shown here is already after this cost.',
    read: 'At 1% the fund costs ₹1,000 a year for every ₹1 lakh invested. Direct plans have a lower TER than Regular plans because they carry no distributor commission. A lower TER is a smaller drag, but it says nothing about how good the fund is. Funds that trade derivatives (for example arbitrage funds) show a higher total because it includes statutory levies such as STT.',
    learn: { href: '/learn/expense-ratio-and-exit-load/', label: 'Expense ratio explained' },
  },
  aum: {
    title: 'AUM (Assets Under Management)',
    what: 'The total money invested in the fund, in ₹ crore (1 crore = 10 million). We show the whole scheme: every plan and option (Direct, Regular, Growth, IDCW) added up, which is the fund size other sites quote. It is the average for the latest quarter AMFI has published.',
    read: 'A very small fund can be new, unpopular or be closed to new money; a very large one can find it harder to buy and sell. Neither is good or bad by itself.',
    learn: { href: '/methodology/', label: 'How we measure it' },
  },
  planAum: {
    title: 'AUM of this plan alone',
    what: 'The assets held in this one plan and option, for example Direct Growth only. AMFI reports one figure per plan and option.',
    read: 'The fund size (all plans) is the sum of these, so this number is always the same or smaller.',
  },
  age: {
    title: 'Fund age',
    what: 'Years since the fund published its first NAV.',
    read: 'A short history means 5-year and 10-year figures are not available, and the returns so far may only cover one kind of market.',
  },
  cagr: {
    title: 'CAGR (compound annual growth rate)',
    what: 'The steady yearly rate that would turn the starting NAV into the ending NAV. We show CAGR for periods of a year or more.',
    read: 'A 3-year CAGR of 12% means the fund grew as if it had earned 12% each year for 3 years (about 40.5% in total). Real years are bumpier than that.',
    learn: { href: '/learn/cagr-xirr-absolute-return/', label: 'CAGR, XIRR and absolute return' },
  },
  absolute: {
    title: 'Absolute return',
    what: 'The plain percentage change in NAV over a period shorter than a year, not converted to a yearly rate.',
    read: 'A 6-month absolute return of 5% means the NAV rose 5% over those six months.',
    learn: { href: '/learn/cagr-xirr-absolute-return/', label: 'CAGR, XIRR and absolute return' },
  },
  sip: {
    title: 'SIP return (XIRR)',
    what: 'The yearly return of putting in the same amount every month, counting that each instalment stayed invested for a different length of time.',
    read: 'It is not the same as the fund\'s return over the period, because money put in later had less time to grow. A SIP can be negative while an earlier lump sum is positive, and the other way round.',
    learn: { href: '/learn/what-is-sip/', label: 'What is a SIP?' },
  },
  volatility: {
    title: 'Volatility',
    what: 'How much the fund\'s daily returns swing, converted to a yearly figure (the standard deviation of daily returns). Last 3 years.',
    read: 'Higher means a bumpier ride. At 18% the fund\'s value has typically moved about 18% above or below its average yearly path; at 9% the ride has been about half as rough. It does not say whether the swings were up or down.',
    learn: { href: '/learn/mutual-fund-risk-measures/', label: 'Risk measures explained' },
  },
  drawdown: {
    title: 'Maximum drawdown',
    what: 'The biggest fall from a high point to a later low point in the period.',
    read: 'A max drawdown of −26% means that at its worst, an investor who bought at the peak saw the fund 26% below that peak before it recovered (or while it still had not). It shows the worst stretch, not a typical one.',
    learn: { href: '/learn/mutual-fund-risk-measures/', label: 'Risk measures explained' },
  },
  sharpe: {
    title: 'Sharpe ratio',
    what: 'Return above a safe 6.5% a year, divided by volatility. Last 3 years.',
    read: 'Higher means more return for each unit of ups and downs. It is only useful for comparing similar funds over the same period; a negative value means the fund earned less than the safe rate.',
    learn: { href: '/learn/mutual-fund-risk-measures/', label: 'Risk measures explained' },
  },
  sortino: {
    title: 'Sortino ratio',
    what: 'Like the Sharpe ratio, but it only counts the swings downwards as risk.',
    read: 'Higher means more return for each unit of downside. Compare it between similar funds over the same period.',
    learn: { href: '/learn/mutual-fund-risk-measures/', label: 'Risk measures explained' },
  },
  rollingPositive: {
    title: 'Rolling 1-year returns: share positive',
    what: 'Take every possible 1-year period in the fund\'s history, starting on every day. This is the share of those periods that ended with a gain.',
    read: '90% means that in 9 out of 10 possible 1-year periods the fund was up. It shows how consistent returns were, rather than one lucky or unlucky start date.',
    learn: { href: '/learn/rolling-returns-explained/', label: 'Rolling returns explained' },
  },
  rollingAvg: {
    title: 'Rolling returns: average',
    what: 'The average return across every possible start date for the window (1 year or 3 years).',
    read: 'It smooths out the luck of one start date. Read it together with the worst rolling return to see the range.',
    learn: { href: '/learn/rolling-returns-explained/', label: 'Rolling returns explained' },
  },
  rollingMin: {
    title: 'Rolling returns: worst',
    what: 'The lowest return across every possible start date for the window (1 year or 3 years).',
    read: 'It is the outcome of the worst possible entry day in the fund\'s history, which shows how bad a bad start has been.',
    learn: { href: '/learn/rolling-returns-explained/', label: 'Rolling returns explained' },
  },
  rank: {
    title: 'Rank in peers',
    what: 'The fund\'s position among funds in the same category, plan and option for that period, ranked by return.',
    read: '#3 of 40 means two funds in the group returned more over that period. A rank looks backwards; it is not a forecast.',
  },
  plan: {
    title: 'Direct vs Regular plan',
    what: 'Every fund sells the same portfolio through two plans. Regular plans pay a distributor commission out of the fund; Direct plans do not.',
    read: 'So a Direct plan has a lower TER and, other things equal, a slightly higher NAV and return over time. The gap shown is Regular minus Direct, in percentage points a year.',
    learn: { href: '/learn/direct-vs-regular-mutual-funds/', label: 'Direct vs Regular' },
  },
  ber: {
    title: 'Base expense ratio',
    what: 'The part of the TER the fund house sets for managing the fund, before brokerage, transaction costs and statutory levies.',
    read: 'It is the best like-for-like number when comparing the running cost of funds that trade very differently.',
    learn: { href: '/learn/expense-ratio-and-exit-load/', label: 'Expense ratio explained' },
  },
  levies: {
    title: 'Statutory levies',
    what: 'Taxes and charges the fund pays on its trades and fees, such as GST and STT. Since April 2026 they are included in the disclosed TER.',
    read: 'They depend on how much the fund trades, not on the fund house\'s pricing. Funds that trade derivatives a lot, such as arbitrage funds, show high levies.',
    learn: { href: '/learn/expense-ratio-and-exit-load/', label: 'Expense ratio explained' },
  },
  dropChart: {
    title: 'Drop from peak',
    what: 'At each date, how far the NAV was below its highest point so far in the chosen period. 0% means the fund was at a new high.',
    read: 'The deeper and longer the shaded area, the harder and longer the fall. It is the maximum drawdown drawn as a chart.',
    learn: { href: '/learn/mutual-fund-risk-measures/', label: 'Risk measures explained' },
  },
};

/** Which explainer belongs to each screener / compare column (columns without one have no (i)). */
export const COLUMN_TERM: Partial<Record<SortKey, TermKey>> = {
  nav: 'nav', ter: 'ter', aum: 'aum', age: 'age',
  r1m: 'absolute', r3m: 'absolute', r6m: 'absolute', r1y: 'cagr', r3y: 'cagr', r5y: 'cagr', r10y: 'cagr', rInc: 'cagr',
  sip1y: 'sip', sip3y: 'sip', sip5y: 'sip',
  vol3y: 'volatility', sharpe3y: 'sharpe', sortino3y: 'sortino', mdd3y: 'drawdown',
  roll1yPos: 'rollingPositive', roll1yAvg: 'rollingAvg', roll1yMin: 'rollingMin', roll3yAvg: 'rollingAvg', roll3yMin: 'rollingMin',
};
