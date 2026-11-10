/**
 * Extra questions shown on the ENGLISH calculator pages only, after the shared FAQ. They answer
 * common search questions. The Hindi pages keep the shared FAQ (same count in both languages, which
 * a test checks); these have no Hindi twin yet.
 *
 * Numbers in the answers come from the same functions the calculators use. Statements about TDS and
 * the self-declaration form are from secondary sources and are worded as "check with your bank";
 * they are listed in docs/STATUS.md under facts to confirm.
 */
import { lumpsumProjection, requiredSip, sipProjection } from './calculators.ts';
import { formatRupees } from './format.ts';
import { emi, inflation } from './loans.ts';
import type { Faq } from './seo.ts';
import type { Tool } from './tools.ts';

const rs = (n: number): string => formatRupees(Math.round(n));
const sip = (monthly: number, years: number): string => rs(sipProjection(monthly, 0.12, years).value);
const lump = (amount: number, years: number): string => rs(lumpsumProjection(amount, 0.12, years).value);
const need = (target: number, years: number): string => rs(requiredSip(target, 0.12, years));
const perLakh = (rate: number, years: number): string => rs(emi(100_000, rate, years));
const TAX_GUIDE = 'The guide to mutual fund taxation on this site has the details.';

export const EXTRA_FAQS: Partial<Record<Tool['kind'], Faq[]>> = {
  sip: [
    { question: 'How much will a SIP of ₹5,000 a month become in 10, 15 and 20 years?', answer: `At an assumed 12% a year, ${rs(5_000)} a month grows to about ${sip(5_000, 10)} in 10 years, ${sip(5_000, 15)} in 15 years and ${sip(5_000, 20)} in 20 years. The amounts you put in are ${rs(600_000)}, ${rs(900_000)} and ${rs(1_200_000)}. The 12% is an assumption, not a promise.` },
    { question: 'How much will a SIP of ₹10,000 a month become in 20 years?', answer: `About ${sip(10_000, 20)} at an assumed 12% a year, on ${rs(2_400_000)} invested. At 10% it is about ${rs(sipProjection(10_000, 0.10, 20).value)} and at 8% about ${rs(sipProjection(10_000, 0.08, 20).value)}, which shows how much the result depends on the return.` },
    { question: 'What will my SIP be worth after inflation?', answer: 'The calculator shows the amount in future rupees. To see it in today’s money, divide it by (1 + inflation) for each year, or simply enter a return that is lower by the inflation rate. For example, a 12% return with 6% inflation is roughly a 6% real return. The inflation calculator on this site does the conversion.' },
    { question: 'How are SIP gains taxed?', answer: `Each instalment is a separate purchase with its own holding period. For equity funds, gains on units held for more than 12 months are long-term, and gains on units sold earlier are short-term and taxed at a higher rate. ${TAX_GUIDE}` },
  ],
  stepup: [
    { question: 'How much more does a 10% yearly step-up give?', answer: `A lot over long periods. At an assumed 12% a year for 20 years, a flat SIP of ${rs(10_000)} grows to about ${sip(10_000, 20)}, while the same SIP raised by 10% every year grows to about ${rs(sipProjection(10_000, 0.12, 20, 0.10).value)}. You also invest more: ${rs(sipProjection(10_000, 0.12, 20, 0.10).invested)} instead of ${rs(2_400_000)}.` },
    { question: 'Is a step-up SIP the same as a top-up SIP?', answer: 'Yes. Fund houses use both names for a SIP whose instalment rises at a set interval, by a percentage or by a fixed amount.' },
  ],
  lumpsum: [
    { question: 'How much will ₹1 lakh become in 10, 15 and 20 years?', answer: `At an assumed 12% a year, ${rs(100_000)} grows to about ${lump(100_000, 10)} in 10 years, ${lump(100_000, 15)} in 15 years and ${lump(100_000, 20)} in 20 years. At 8% the figures are about ${rs(lumpsumProjection(100_000, 0.08, 10).value)}, ${rs(lumpsumProjection(100_000, 0.08, 15).value)} and ${rs(lumpsumProjection(100_000, 0.08, 20).value)}.` },
    { question: 'How much do I need to invest today to reach a target?', answer: `Divide the target by (1 + yearly return) for each year. To have ${rs(10_000_000)} in 15 years at an assumed 12% a year you need about ${rs(10_000_000 / 1.12 ** 15)} today; at 8% you need about ${rs(10_000_000 / 1.08 ** 15)}.` },
    { question: 'How is a lumpsum gain taxed?', answer: `For equity funds, a gain on units held for more than 12 months is long-term; sold earlier, it is short-term and taxed at a higher rate. ${TAX_GUIDE}` },
  ],
  goal: [
    { question: 'How much SIP do I need for ₹1 crore?', answer: `At an assumed 12% a year you need about ${need(10_000_000, 10)} a month for 10 years, ${need(10_000_000, 15)} a month for 15 years, or ${need(10_000_000, 20)} a month for 20 years. Starting five years earlier roughly halves the monthly amount.` },
    { question: 'How much SIP do I need for ₹50 lakh in 10 years?', answer: `About ${need(5_000_000, 10)} a month at an assumed 12% a year, or about ${rs(requiredSip(5_000_000, 0.10, 10))} a month at 10%.` },
  ],
  swp: [
    { question: 'Can I raise the withdrawal every year for inflation?', answer: 'This calculator keeps the withdrawal the same every month. If you plan to raise it each year, start with a lower withdrawal than the one that just lasts, because rising withdrawals use up the money faster. A simple check is to enter a return that is lower by the inflation rate.' },
    { question: 'What is a safe monthly withdrawal?', answer: 'No rate is safe in every market. A withdrawal well below what the money is expected to earn leaves room for bad years and for inflation; a withdrawal equal to or above the expected return will use up the money. Test a lower return to see how much margin you have.' },
  ],
  cagr: [
    { question: 'How do I calculate the return on a SIP or on money invested at different times?', answer: 'CAGR does not work when money goes in on several dates. Use XIRR, which takes the date of every investment into account. The XIRR calculator on this site does this.' },
    { question: 'What is the CAGR formula in Excel or Google Sheets?', answer: 'Type =(end/start)^(1/years)-1 with your own cell references, and format the cell as a percentage. The function =RRI(years, start, end) gives the same answer.' },
  ],
  rentbuy: [
    { question: 'What is the price-to-rent ratio?', answer: 'It is the price of a home divided by one year’s rent for the same home. A flat that costs ₹1 crore and rents for ₹25,000 a month has a ratio of about 33. It is the rental yield turned upside down: a ratio of 33 is a yield of 3%. The higher the ratio, the more buying costs compared with renting.' },
    { question: 'How long do I need to stay for buying to make sense?', answer: 'Long enough to spread the one-time costs of buying and selling over many years. The calculator shows the first year in which the buyer is ahead and stays ahead; if you expect to move before that year, renting comes out better on your figures.' },
  ],
  car: [
    { question: 'How do I work out the fuel cost of one trip?', answer: 'Divide the distance by your mileage to get the litres, and multiply by the price per litre. The fuel cost calculator on this site does this and can split the cost between people.' },
    { question: 'Why is my real mileage lower than the company figure?', answer: 'The certified figure comes from a standard test. Traffic, air conditioning, load and driving style usually give a lower figure on the road. Measure your own over two or three tanks with the mileage calculator.' },
  ],
  evpetrol: [
    { question: 'After how many kilometres does an electric car break even?', answer: 'Divide the extra price of the electric car by the saving per kilometre. The calculator shows this as the payback distance and time for your figures. The more you drive each month, the sooner it arrives.' },
    { question: 'Is home charging cheaper than public charging?', answer: 'Usually yes, because a unit of electricity at home generally costs less than at a public fast charger. Enter both prices and the share you expect to charge in public to see the effect on the cost per km.' },
  ],
  jewellery: [
    { question: 'How many grams is one tola of gold?', answer: 'One tola is about 11.66 grams (11.6638 g). Some jewellers use "tola" loosely for 10 grams, so ask which they mean. Multiply the tolas by 11.66 and enter the weight in grams.' },
    { question: 'What is wastage on gold jewellery?', answer: 'Some jewellers add a "wastage" percentage for metal lost while making the piece, separately from making charges. It works like a making charge: add the two percentages together and enter the total as the making charge here.' },
    { question: 'What is hallmark and does it change the price?', answer: 'A hallmark is the Bureau of Indian Standards mark that certifies the purity of the piece. It does not change how the price is worked out, but it tells you the purity you are paying for is the purity you get. A small hallmarking fee per piece may be added to the bill.' },
  ],
  metalreturn: [
    { question: 'How do I calculate the return on gold bought every month?', answer: 'This calculator is for one purchase and one sale. For a monthly investment use the gold SIP calculator, and for irregular purchases enter each one with its date in the XIRR calculator.' },
  ],
  homeloan: [
    { question: 'How much home loan can I get on my salary?', answer: 'Lenders usually cap all your EMIs at a share of your monthly income. The home loan eligibility calculator on this site estimates the amount from your income, existing EMIs, rate and tenure.' },
    { question: 'What is the home loan EMI per ₹1 lakh?', answer: `For every ${rs(100_000)} borrowed for 20 years, the EMI is ${perLakh(0.08, 20)} at 8%, ${perLakh(0.085, 20)} at 8.5% and ${perLakh(0.09, 20)} at 9%. Multiply by the number of lakhs: a ${rs(5_000_000)} loan at 8.5% is 50 times ${perLakh(0.085, 20)}.` },
    { question: 'Is there a tax benefit on a home loan?', answer: 'Under the old tax regime, interest on a loan for a home you live in can be deducted up to a yearly limit (₹2 lakh), and the principal repaid counts towards the ₹1.5 lakh deduction under Section 123 (formerly 80C). The new tax regime does not allow the interest deduction for a self-occupied home. The limits and conditions change, so check your own position.' },
    { question: 'What is a home loan balance transfer?', answer: 'It means moving the outstanding loan to another lender that offers a lower rate. Compare the interest saved over the remaining years with the costs of moving, such as the new lender’s processing fee and legal charges. Enter the outstanding amount, the new rate and the remaining tenure here to see the new EMI.' },
  ],
  carloan: [
    { question: 'Is the loan given on the on-road price or the ex-showroom price?', answer: 'It depends on the lender. The on-road price is the ex-showroom price plus road tax, registration and insurance. Lenders finance a share of one or the other and you pay the rest as down payment. Enter only the amount you actually borrow.' },
    { question: 'How much down payment should I make?', answer: 'A larger down payment means a smaller loan, a lower EMI and less interest. A car loses value as it ages, so borrowing less also lowers the chance of owing more than the car is worth.' },
    { question: 'What is the car loan EMI per ₹1 lakh?', answer: `For every ${rs(100_000)} borrowed, the EMI is ${perLakh(0.09, 5)} at 9% for 5 years and ${perLakh(0.09, 7)} at 9% for 7 years.` },
  ],
  personalloan: [
    { question: 'What is a processing fee on a personal loan?', answer: 'A one-time charge, usually a percentage of the loan, that the lender deducts when the loan is paid out. You receive less than the loan amount but repay the full amount with interest, so the fee raises the real cost. Enter it under "Prepayment and fees" to see the total.' },
    { question: 'Can I close a personal loan early?', answer: 'Usually yes, but many lenders charge a foreclosure fee on fixed-rate personal loans and some do not allow it in the first months. Compare the fee with the interest you would save; the calculator shows the saving from a one-time prepayment.' },
    { question: 'What is the personal loan EMI per ₹1 lakh?', answer: `For every ${rs(100_000)} borrowed for 3 years, the EMI is ${perLakh(0.11, 3)} at 11%, ${perLakh(0.14, 3)} at 14% and ${perLakh(0.18, 3)} at 18%.` },
  ],
  fd: [
    { question: 'What is TDS on FD interest?', answer: 'Banks deduct tax at source (TDS) when the interest they pay you in a financial year crosses a limit. Since April 2025 the limit has been reported as ₹50,000 for most depositors and ₹1 lakh for senior citizens, with tax deducted at 10% (20% if the bank does not have your PAN). TDS is not the final tax: the interest is still added to your income and taxed at your slab rate, and the TDS is adjusted when you file your return. Confirm the current limit with your bank.' },
    { question: 'How can I avoid TDS if my income is below the taxable limit?', answer: 'If your tax for the year will be nil, you can give the bank a self-declaration so that it does not deduct TDS. This was Form 15G (Form 15H for senior citizens) under the earlier law; under the Income-tax Act, 2025 it is reported to be a single form, Form 121. Ask your bank which form it accepts, and give it at the start of each financial year.' },
    { question: 'Should I choose a cumulative FD or a payout FD?', answer: 'A cumulative FD adds the interest to the deposit and pays everything at maturity, so it earns interest on interest; this calculator shows that case. A payout FD pays the interest every month or quarter, which suits people who need income, but the total earned is lower because the interest is not reinvested.' },
    { question: 'Is my money in a bank FD insured?', answer: 'Deposits in a bank are insured by DICGC, a subsidiary of RBI, up to ₹5 lakh per depositor per bank, covering principal and interest together. Amounts above that are not covered if the bank fails.' },
  ],
  inflation: [
    { question: 'What will ₹1 lakh be worth in 10, 20 and 30 years?', answer: `At 6% inflation a year, ${rs(100_000)} will buy what about ${rs(inflation(100_000, 0.06, 10).buyingPower)} buys today after 10 years, ${rs(inflation(100_000, 0.06, 20).buyingPower)} after 20 years and ${rs(inflation(100_000, 0.06, 30).buyingPower)} after 30 years.` },
    { question: 'What will ₹1 crore be worth after 20 years?', answer: `At 6% inflation a year, ${rs(10_000_000)} in 20 years will buy what about ${rs(inflation(10_000_000, 0.06, 20).buyingPower)} buys today. Put the other way, something that costs ${rs(10_000_000)} today will cost about ${rs(inflation(10_000_000, 0.06, 20).futureCost)} then.` },
    { question: 'How much will my monthly expenses be at retirement?', answer: `Multiply today’s expenses by (1 + inflation) for each year until you retire. Expenses of ${rs(50_000)} a month today become about ${rs(inflation(50_000, 0.06, 20).futureCost)} a month in 20 years and ${rs(inflation(50_000, 0.06, 30).futureCost)} in 30 years at 6% inflation.` },
  ],
};

/** The FAQ of an English calculator page: the shared questions, then the English-only extras. */
export function toolFaqs(tool: Tool): Faq[] {
  return [...tool.faqs, ...(EXTRA_FAQS[tool.kind] ?? [])];
}
