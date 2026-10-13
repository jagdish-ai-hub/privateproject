import { cagrBetween, lumpsumProjection, requiredSip, sipProjection, swpProjection } from './calculators.ts';
import { formatPct, formatRupees } from './format.ts';
import { RENT_VS_BUY_DEFAULTS, rentVsBuy } from './rentVsBuy.ts';
import type { Faq } from './seo.ts';

/** Content and metadata of one calculator page. */
export interface Tool {
  slug: string;
  kind: 'sip' | 'stepup' | 'lumpsum' | 'goal' | 'swp' | 'cagr' | 'rentbuy';
  /** Short name, used in lists and breadcrumbs. */
  name: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  /** Formula shown on the page. */
  formula: string;
  /** Explanation paragraphs under "How it works". */
  how: string[];
  /** Builds a worked example from the same maths the calculator uses. */
  example: () => string;
  faqs: Faq[];
}

const ASSUMPTION = 'The expected return is an assumption, not a promise. Equity mutual fund returns change from year to year and can be negative; use the screener to see what specific funds have actually delivered.';

export const TOOLS: Tool[] = [
  {
    slug: 'sip-calculator', kind: 'sip', name: 'SIP calculator',
    title: 'SIP Calculator: Mutual Fund SIP Returns Calculator',
    h1: 'SIP calculator',
    description: 'Free SIP calculator. Enter a monthly amount, expected return and time period to see the invested amount, estimated returns and total value, with a year-by-year table.',
    intro: 'See what a monthly SIP (Systematic Investment Plan) could grow to over time. Change the amount, the expected yearly return and the number of years to see the invested amount, the estimated gain and the final value.',
    formula: 'Future value = P × [ ((1 + i)ⁿ − 1) ÷ i ] × (1 + i)    where P = monthly amount, i = yearly return ÷ 12, n = number of months',
    how: [
      'Each month you invest a fixed amount at the start of the month. The money then grows at one-twelfth of the yearly return per month, compounded monthly. This is the standard way Indian SIP calculators work, so the result can be compared with other calculators.',
      'The gain is the difference between the final value and the total you put in. The longer you stay invested, the more of the final value comes from compounding rather than from your own contributions.',
      ASSUMPTION,
    ],
    example: () => { const p = sipProjection(10_000, 0.12, 10); return `A SIP of ${formatRupees(10_000)} a month for 10 years at an assumed 12% a year puts in ${formatRupees(p.invested)} and grows to about ${formatRupees(p.value)}, an estimated gain of ${formatRupees(p.gain)}.`; },
    faqs: [
      { question: 'What is a SIP?', answer: 'A SIP (Systematic Investment Plan) is a way to invest a fixed amount in a mutual fund at regular intervals, usually every month. Each instalment buys units at that day’s NAV, so you buy more units when the NAV is low and fewer when it is high.' },
      { question: 'How is the SIP return calculated here?', answer: 'The calculator treats each instalment as invested at the start of the month and applies the yearly return divided by 12 every month, compounding monthly. The formula is shown on this page. Real fund returns will differ because market returns are not constant.' },
      { question: 'Which expected return should I enter?', answer: 'There is no single right number. Returns depend on the fund type and the period, and past returns do not predict future returns. A conservative assumption is safer for planning. To see what real funds have delivered over 3 and 5 years, use the screener.' },
      { question: 'Is the SIP result guaranteed?', answer: 'No. Mutual fund returns are subject to market risk. The result only shows what would happen if the fund grew at exactly the rate you entered every month.' },
      { question: 'What is the difference between SIP and lumpsum?', answer: 'A lumpsum invests the whole amount at once. A SIP spreads the money over time, so each instalment is invested for a different length of time. Use the lumpsum calculator to compare the two for the same assumptions.' },
    ],
  },
  {
    slug: 'step-up-sip-calculator', kind: 'stepup', name: 'Step-up SIP calculator',
    title: 'Step-up SIP Calculator: SIP with Yearly Increase',
    h1: 'Step-up SIP calculator',
    description: 'Free step-up SIP calculator. See how increasing your monthly SIP by a fixed percentage every year changes the final value.',
    intro: 'A step-up SIP raises your monthly instalment by a fixed percentage every year, for example when your income grows. Enter the starting amount and the yearly increase to see the effect.',
    formula: 'Year y instalment = P × (1 + step-up)^(y − 1);  value is built month by month: balance = (balance + instalment) × (1 + i),  i = yearly return ÷ 12',
    how: [
      'The calculator runs month by month. In each year the instalment is the starting amount multiplied by (1 + step-up) once for every completed year. Every instalment is invested at the start of its month and grows at the yearly return divided by 12, compounded monthly.',
      'Even a small yearly step-up raises the total invested noticeably over a long period, which is why the final value is higher than for a flat SIP with the same starting amount.',
      ASSUMPTION,
    ],
    example: () => { const f = sipProjection(10_000, 0.12, 10); const s = sipProjection(10_000, 0.12, 10, 0.1); return `Starting at ${formatRupees(10_000)} a month and raising it 10% every year for 10 years at an assumed 12% puts in ${formatRupees(s.invested)} and grows to about ${formatRupees(s.value)}. A flat SIP of the same starting amount would give about ${formatRupees(f.value)}.`; },
    faqs: [
      { question: 'What is a step-up SIP?', answer: 'It is a SIP whose monthly amount increases by a set percentage or amount at fixed intervals, usually once a year. Many fund houses and platforms offer it as a built-in option.' },
      { question: 'How much should I step up each year?', answer: 'It depends on how much your income and budget can grow. Many people choose a step-up in line with their expected pay rise. Try a few values in the calculator to see the effect.' },
      { question: 'Does the step-up apply every month or every year?', answer: 'Every year. The instalment stays the same for 12 months and then rises by the step-up percentage.' },
      { question: 'Are the results guaranteed?', answer: 'No. They assume the same return every month. Actual mutual fund returns vary and carry market risk.' },
    ],
  },
  {
    slug: 'lumpsum-calculator', kind: 'lumpsum', name: 'Lumpsum calculator',
    title: 'Lumpsum Calculator: One-time Mutual Fund Investment',
    h1: 'Lumpsum calculator',
    description: 'Free lumpsum calculator. See what a one-time mutual fund investment could grow to for a given expected return and time period.',
    intro: 'Enter a one-time investment amount, an expected yearly return and a time period to see its estimated future value.',
    formula: 'Future value = Amount × (1 + r)^t    where r = yearly return and t = years',
    how: [
      'A lumpsum grows by compounding once a year in this calculator: each year the value is multiplied by (1 + the yearly return). Fractional years are handled exactly.',
      'Because the whole amount is invested from day one, a lumpsum has more time to compound than the same total invested through a SIP, but it also takes the full market risk on day one.',
      ASSUMPTION,
    ],
    example: () => { const p = lumpsumProjection(100_000, 0.12, 10); return `${formatRupees(100_000)} invested once for 10 years at an assumed 12% a year grows to about ${formatRupees(p.value)}, an estimated gain of ${formatRupees(p.gain)}.`; },
    faqs: [
      { question: 'What is a lumpsum investment?', answer: 'It means investing the full amount in one go instead of in instalments, for example putting ₹1,00,000 into a fund on a single day.' },
      { question: 'How is the lumpsum value calculated?', answer: 'The amount is multiplied by (1 + yearly return) for each year. For 3 years at 10%, ₹1,00,000 becomes ₹1,00,000 × 1.10 × 1.10 × 1.10 = ₹1,33,100.' },
      { question: 'Lumpsum or SIP, which is better?', answer: 'Neither is better in every case. A lumpsum works best if the market rises after you invest, a SIP smooths the price you pay over time. The right choice depends on when you have the money and how much risk you can take.' },
      { question: 'Does this include tax or expense ratio?', answer: 'No. The result is before tax. If you assume a return, make it a return after fund expenses, because a fund’s published returns are already after its expense ratio.' },
    ],
  },
  {
    slug: 'goal-sip-calculator', kind: 'goal', name: 'Goal SIP calculator',
    title: 'Goal SIP Calculator: Monthly SIP Needed for a Target',
    h1: 'Goal SIP calculator',
    description: 'Free goal calculator. Find the monthly SIP needed to reach a target amount in a given number of years at an expected return.',
    intro: 'Start from the goal. Enter the amount you want, how many years you have and the return you expect, and the calculator tells you the monthly SIP required.',
    formula: 'SIP = Target ÷ { [ ((1 + i)ⁿ − 1) ÷ i ] × (1 + i) }    where i = yearly return ÷ 12 and n = number of months',
    how: [
      'This is the SIP formula solved for the monthly amount instead of the final value. The factor in the denominator is how much one rupee invested every month grows to over the period.',
      'The shorter the time and the lower the return you assume, the larger the monthly amount you need. Try a more conservative return to see how much extra margin you would need.',
      ASSUMPTION,
    ],
    example: () => { const sip = requiredSip(5_000_000, 0.12, 15); return `To build ${formatRupees(5_000_000)} in 15 years at an assumed 12% a year you would need a SIP of about ${formatRupees(Math.ceil(sip))} a month.`; },
    faqs: [
      { question: 'How do I plan a SIP for a financial goal?', answer: 'Decide the target amount in today’s money, adjust it for inflation, choose how many years you have, and enter a return you consider realistic. The calculator then gives the monthly SIP needed.' },
      { question: 'Should I include inflation?', answer: 'The calculator does not adjust for inflation by itself. For a goal that is many years away, enter a larger future target that already allows for inflation.' },
      { question: 'What if I cannot afford the SIP amount shown?', answer: 'You can extend the time, lower the target, or use a step-up SIP that starts smaller and grows each year. The step-up SIP calculator shows that option.' },
      { question: 'Is reaching the goal guaranteed?', answer: 'No. The calculation assumes the same return every month. If actual returns are lower, you will fall short of the target.' },
    ],
  },
  {
    slug: 'swp-calculator', kind: 'swp', name: 'SWP calculator',
    title: 'SWP Calculator: Systematic Withdrawal Plan Calculator',
    h1: 'SWP calculator',
    description: 'Free SWP calculator. See how long a corpus lasts when you withdraw a fixed amount every month, and what balance is left.',
    intro: 'A Systematic Withdrawal Plan (SWP) takes a fixed amount out of a mutual fund every month. Enter your corpus, the monthly withdrawal and an expected return to see how long the money lasts.',
    formula: 'Each month: balance = balance × (1 + i), then withdraw the monthly amount;  i = yearly return ÷ 12',
    how: [
      'The balance first grows for the month at the yearly return divided by 12, and then the withdrawal is taken at the end of the month. If the balance cannot cover a full withdrawal, the remaining amount is paid out and the plan ends.',
      'A withdrawal larger than the monthly growth slowly eats into the corpus. A withdrawal equal to the monthly growth keeps the corpus unchanged.',
      'This calculator does not include tax on the gains in each withdrawal, exit loads or changes in the amount over time.',
      ASSUMPTION,
    ],
    example: () => { const p = swpProjection(5_000_000, 30_000, 0.08, 20); return `Withdrawing ${formatRupees(30_000)} a month from ${formatRupees(5_000_000)} at an assumed 8% a year for 20 years pays out ${formatRupees(p.totalWithdrawn)} and leaves about ${formatRupees(p.finalBalance)}.`; },
    faqs: [
      { question: 'What is an SWP?', answer: 'A Systematic Withdrawal Plan lets you redeem a fixed amount from a mutual fund at regular intervals, for example every month, while the remaining money stays invested.' },
      { question: 'How long will my money last?', answer: 'It depends on the corpus, the withdrawal and the return. If the withdrawal is more than the monthly growth, the balance falls. The calculator shows the month in which the money runs out, if it does.' },
      { question: 'Are withdrawals taxed?', answer: 'Each withdrawal is a redemption, so the gain portion can be taxed according to the fund type and holding period. This calculator does not model tax. Check the current rules or ask a tax professional.' },
      { question: 'What return should I assume?', answer: 'Use a cautious number. If actual returns are lower than assumed, the corpus will run out sooner than the calculator shows.' },
    ],
  },
  {
    slug: 'cagr-calculator', kind: 'cagr', name: 'CAGR calculator',
    title: 'CAGR Calculator: Compound Annual Growth Rate',
    h1: 'CAGR calculator',
    description: 'Free CAGR calculator. Find the compound annual growth rate between a starting and an ending value over a number of years.',
    intro: 'CAGR is the steady yearly rate at which an investment would have grown from its starting value to its ending value. Enter the two values and the number of years.',
    formula: 'CAGR = (Ending value ÷ Starting value)^(1 ÷ years) − 1',
    how: [
      'CAGR smooths out the ups and downs and gives one yearly rate, which makes investments held for different lengths of time comparable. It is the same measure used for the 1, 3, 5 and 10-year returns in the screener.',
      'CAGR assumes one lump sum invested at the start. For regular investments such as a SIP, the right measure is XIRR, which accounts for the date of every instalment.',
    ],
    example: () => `An investment that grows from ${formatRupees(100_000)} to ${formatRupees(250_000)} in 7 years has a CAGR of ${formatPct(cagrBetween(100_000, 250_000, 7))}.`,
    faqs: [
      { question: 'What is CAGR?', answer: 'Compound Annual Growth Rate is the constant yearly rate at which a value would have to grow to get from its starting amount to its ending amount over a period of time.' },
      { question: 'What is the difference between CAGR and absolute return?', answer: 'Absolute return is the total percentage change over the whole period, with no regard for how long it took. CAGR converts that to a yearly rate, so a 100% gain over 3 years and over 10 years can be compared fairly.' },
      { question: 'When should I use XIRR instead of CAGR?', answer: 'Use CAGR for a single investment with one start and one end value. Use XIRR when money goes in or out at different dates, for example a monthly SIP.' },
      { question: 'Can CAGR be negative?', answer: 'Yes. If the ending value is lower than the starting value, the CAGR is negative.' },
    ],
  },
  {
    slug: 'rent-vs-buy-calculator', kind: 'rentbuy', name: 'Rent vs buy calculator',
    title: 'Rent vs Buy Calculator India: Should You Buy a House?',
    h1: 'Rent vs buy calculator',
    description: 'Free rent vs buy calculator for India. Compare buying a home with a loan against renting and investing the difference, with EMI, stamp duty, rent growth, tax and the rent at which buying breaks even.',
    intro: 'Is it cheaper to buy a home or to keep renting and invest the money? Enter the home price, your loan and the rent you pay today. The calculator compares what you would own after the years you choose, and shows the rent at which buying would break even.',
    formula: 'Buyer = home value × (1 − selling cost) − loan left − tax on gain + savings;  Renter = investments − tax on gain.  Each month, whoever pays less (EMI + upkeep, or rent) invests the difference.',
    how: [
      'The comparison is fair because both people spend exactly the same money. On day one the buyer pays the down payment and the stamp duty and registration, and the renter invests that same amount. Every month the buyer pays the EMI plus maintenance and property tax, and the renter pays rent. Whoever pays less invests the difference, so the total spent is always equal.',
      'At the end the buyer sells the home, pays the selling costs and the tax on the gain, and repays any loan still left. The renter cashes in the investments and pays the tax on their gain. The two final amounts are what each person owns, and the difference is the answer.',
      'The EMI uses the standard formula with the yearly loan rate divided by 12. The home price and the investments grow at yearly rates, and rent rises once a year. If you stay longer than the loan tenure, the EMI stops when the loan ends. Interest deductions on a home loan are not included, so the result is a little pessimistic for a buyer who can claim them.',
      'Rent at which buying breaks even is found by re-running the comparison with different starting rents until the two results are level. If the rent you pay is above it, buying comes out ahead on these assumptions; below it, renting does. Yearly rent as a percentage of the price (the rental yield) is the number that moves this answer most.',
      'Everything depends on the assumptions. Change the home price growth, the investment return and the number of years to see how sensitive the result is. It is a projection from the numbers you enter, not a forecast, and it cannot value things like stability, freedom to move, or the risk of having most of your money in one property.',
    ],
    example: () => {
      const d = RENT_VS_BUY_DEFAULTS;
      const r = rentVsBuy(d);
      const who = r.winner === 'buy' ? 'buying' : 'renting';
      return `A ${formatRupees(d.price)} home with ${d.downPaymentPct * 100}% down and a ${d.loanYears}-year loan at ${(d.loanRate * 100).toFixed(2)}% has an EMI of about ${formatRupees(Math.round(r.emi))}. A similar home rents for ${formatRupees(d.monthlyRent)} a month (a ${(r.grossYield * 100).toFixed(0)}% yearly yield), rising ${d.rentGrowth * 100}% a year. If prices grow ${d.appreciation * 100}% a year and investments return ${d.investReturn * 100}%, then after ${d.horizonYears} years the buyer owns about ${formatRupees(Math.round(r.buyerNetWorth))} and the renter about ${formatRupees(Math.round(r.renterNetWorth))}, so ${who} comes out ahead on these assumptions.`;
    },
    faqs: [
      { question: 'Is it better to rent or buy a house in India?', answer: 'There is no answer that fits everyone. Buying tends to win when rent is high compared with the price, when the home’s price grows faster than your investments would, and when you stay for many years. Renting tends to win when the rent is a small share of the price, as it often is in Indian cities, and when you would invest the saved money well. Enter your own numbers to see which side your situation falls on.' },
      { question: 'What is rental yield and why does it matter?', answer: 'Rental yield is the yearly rent divided by the price of the home. A low yield means you pay a lot to own a home compared with what it would cost to rent, so buying needs strong price growth to catch up. The calculator shows your yield and the monthly rent at which buying would break even.' },
      { question: 'Why do you add the money the renter saves to investments?', answer: 'Because a fair comparison needs both people to spend the same. A buyer usually pays more each month in EMI and upkeep than a tenant pays in rent, and also puts money down on day one. The tenant can invest that money. Ignoring it makes buying look better than it is.' },
      { question: 'Does this include the tax benefit on a home loan?', answer: 'No. Deductions on home loan interest and principal depend on your tax regime, the limits that apply and whether the home is let out, so they are left out. They would improve the buyer’s result somewhat if you can claim them.' },
      { question: 'What tax rate should I enter on gains?', answer: 'The default of 12.5% is the long-term capital gains rate that applied to property and listed equity funds when this page was written. Exemptions, the rules for homes bought long ago and changes to the law are not modelled, so check the current rules, or set the rate to 0 to see the result before tax.' },
      { question: 'What home price growth and investment return should I assume?', answer: 'Use cautious numbers and test a few. Home prices in your area, not the country as a whole, are what matter, and past growth does not guarantee future growth. Investment returns are not guaranteed either; equity returns vary from year to year and can be negative. The default values are only examples.' },
      { question: 'What does this calculator not include?', answer: 'Home loan interest deductions, the equity gains tax exemption, rent that you receive if you let the home out, a loan prepayment plan, changes in your income, brokerage when you rent, and non-money factors such as security, freedom to move and having your money in a single property. Treat the result as one input to the decision.' },
    ],
  },
];

/**
 * Look up a calculator by its URL slug.
 *
 * @param slug - e.g. "sip-calculator".
 * @returns The tool, or `undefined`.
 */
export function toolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
