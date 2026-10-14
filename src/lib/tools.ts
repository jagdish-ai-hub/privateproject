import { cagrBetween, lumpsumProjection, requiredSip, sipProjection, swpProjection } from './calculators.ts';
import { formatPct, formatRupees } from './format.ts';
import { RENT_VS_BUY_DEFAULTS, rentVsBuy } from './rentVsBuy.ts';
import { deposit, flatEmi, inflation, loan, rateFromEmi } from './loans.ts';
import { jewelleryPrice, metalReturn } from './metals.ts';
import { EV_DEFAULT, PETROL_DEFAULT, compareCars, runningCost } from './vehicle.ts';
import type { Faq } from './seo.ts';

/** Content and metadata of one calculator page. */
export interface Tool {
  slug: string;
  kind: 'sip' | 'stepup' | 'lumpsum' | 'goal' | 'swp' | 'cagr' | 'rentbuy' | 'car' | 'evpetrol' | 'jewellery' | 'metalreturn' | 'homeloan' | 'carloan' | 'personalloan' | 'fd' | 'inflation';
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
  {
    slug: 'car-running-cost-calculator', kind: 'car', name: 'Car running cost calculator',
    title: 'Car Running Cost Calculator: Cost per km for Petrol, Diesel, CNG and EV',
    h1: 'Car running cost calculator',
    description: 'Free car running cost calculator for India. Enter the fuel price, mileage and kilometres driven to get the cost per km, per month and per year for petrol, diesel, CNG and electric cars.',
    intro: 'What does your car really cost to run? Pick the fuel, enter the price, the mileage and how far you drive each month, and see the cost per kilometre, per month and per year. For an electric car, enter the battery size, the range and what you pay for a unit of electricity.',
    formula: 'Petrol, diesel, CNG: cost per km = price per litre (or kg) ÷ km per litre (or kg) + maintenance per km.   Electric: cost per km = (battery kWh ÷ range km) ÷ (1 − charging loss) × price per unit + maintenance per km',
    how: [
      'For a petrol, diesel or CNG car the fuel cost per kilometre is the price divided by the mileage. At ₹100 a litre and 15 km a litre, each kilometre costs about ₹6.67 in fuel. Use the mileage you actually get, not the figure on the brochure.',
      'For an electric car the energy used per kilometre is the battery size divided by the real-world range. A 30 kWh battery that gives 200 km uses 0.15 kWh a km. Some energy is lost as heat while charging, so the energy drawn from the socket is a little higher. The price per unit is a mix of your home tariff and public charger price, weighted by how much of your charging happens in public.',
      'Maintenance is a rupee amount per km that you can change: service, tyres and wear. Electric cars usually have fewer moving parts and lower servicing costs, but check your own garage’s quote.',
      'Prices and mileage are not looked up for you: they differ by city and change often, so every value starts as an example. Insurance, road tax, parking, tolls, loan interest, resale value and battery replacement are not included. The EV vs petrol calculator lets you add insurance and compare the purchase price too.',
    ],
    example: () => {
      const p = runningCost(PETROL_DEFAULT, 1000);
      const e = runningCost(EV_DEFAULT, 1000);
      return `A petrol car at ${formatRupees(PETROL_DEFAULT.fuelPrice)} a litre and ${PETROL_DEFAULT.kmPerUnit} km a litre, with ${formatRupees(PETROL_DEFAULT.maintenancePerKm, 2)} a km for maintenance, costs about ${formatRupees(p.perKm, 2)} a km, or ${formatRupees(Math.round(p.perMonth))} a month at 1,000 km. An electric car with a ${EV_DEFAULT.batteryKwh} kWh battery and ${EV_DEFAULT.rangeKm} km of range, charging mostly at home at ${formatRupees(EV_DEFAULT.homeRate)} a unit, costs about ${formatRupees(e.perKm, 2)} a km, or ${formatRupees(Math.round(e.perMonth))} a month.`;
    },
    faqs: [
      { question: 'How do I calculate the running cost per km of my car?', answer: 'Divide the fuel price by your real mileage, then add maintenance per km. For an electric car, divide the battery size by the real range to get units per km, allow for charging loss, and multiply by the price per unit. The calculator does this for you and shows the formula on this page.' },
      { question: 'Which mileage should I enter?', answer: 'The one you actually get. Fill the tank, note the kilometres on the trip meter, and divide by the litres it takes to fill up again. City driving, air-conditioning and speed lower the figure shown in the brochure.' },
      { question: 'How much does it cost to charge an electric car?', answer: 'It depends on the tariff and where you charge. Home charging at your household tariff is usually the cheapest. Public fast chargers usually cost more per unit. Enter both prices and the share of charging you do in public, and the calculator blends them.' },
      { question: 'Why is charging loss included?', answer: 'Not all the energy drawn from the socket reaches the battery; some is lost as heat in the charger and the battery. Allowing for it makes the cost per km realistic. The default is 10%, which you can change.' },
      { question: 'What does this not include?', answer: 'Insurance, road tax, parking, tolls, loan interest, depreciation and battery replacement. These can be a large part of owning a car, so treat this as the running cost only, not the cost of ownership.' },
    ],
  },
  {
    slug: 'ev-vs-petrol-running-cost-calculator', kind: 'evpetrol', name: 'EV vs petrol car cost calculator',
    title: 'EV vs Petrol Car Cost Calculator India: Running Cost and Payback',
    h1: 'EV vs petrol car cost calculator',
    description: 'Free EV vs petrol (or diesel, CNG) calculator for India. Compare running cost per km, monthly saving, how long the higher price of an electric car takes to pay back, and the total cost over the years you keep it.',
    intro: 'Is an electric car cheaper than a petrol, diesel or CNG car? Enter how far you drive, the fuel and electricity prices, and the price of each car. The calculator shows the running cost of each, the monthly saving, how long the extra price of the electric car takes to pay back, and the total cost over the years you keep it.',
    formula: 'Monthly saving = fuel car cost per month − electric car cost per month.   Payback (months) = (price of electric car − subsidy − price of fuel car) ÷ monthly saving.   Total cost = price + running cost × years + other yearly costs × years',
    how: [
      'Each car’s running cost is worked out per kilometre the same way as in the car running cost calculator: fuel price over mileage for a fuel car, and battery size over range, with charging loss and a mix of home and public charging, for an electric car. Maintenance per km is added to both.',
      'The monthly saving is the difference between the two monthly costs at the distance you drive. If the electric car costs more to buy, the payback is how many months of that saving it takes to cover the extra price, after any subsidy or discount. The distance you drive matters a great deal: the more you drive, the faster the saving builds up.',
      'The total cost over the years you keep the car adds the purchase price, the running cost and the other yearly costs you enter, such as insurance. Resale value, loan interest, road tax, parking and battery replacement are not included, so the real gap can be larger or smaller.',
      'Every price and mileage is an example to replace with your own. Fuel and electricity prices differ by city and change over time, and the result changes with them.',
    ],
    example: () => {
      const c = compareCars(PETROL_DEFAULT, EV_DEFAULT, 1000, 5, 1_000_000, 1_400_000, 0, 25_000, 35_000);
      return `Driving 1,000 km a month, the petrol car costs about ${formatRupees(Math.round(c.a.perMonth))} a month to run and the electric car about ${formatRupees(Math.round(c.b.perMonth))}, a saving of ${formatRupees(Math.round(c.monthlySaving))} a month. With the electric car costing ${formatRupees(c.extraUpfront)} more, that extra price is paid back after about ${Math.ceil(c.paybackMonths ?? 0)} months. Over 5 years the petrol car costs about ${formatRupees(Math.round(c.totalA))} in total and the electric car about ${formatRupees(Math.round(c.totalB))}.`;
    },
    faqs: [
      { question: 'Is an electric car cheaper than a petrol car in India?', answer: 'To run, usually yes, because a unit of electricity moves the car further than the same money spent on fuel. To buy, an electric car often costs more, so whether it is cheaper overall depends on how far you drive, how long you keep it and the prices where you live. Enter your own numbers.' },
      { question: 'How long does an electric car take to pay for itself?', answer: 'The payback is the extra price divided by the monthly running-cost saving. A person who drives a lot saves more each month and pays it back sooner. The calculator shows the months and the kilometres driven by then.' },
      { question: 'Does the calculator include subsidies?', answer: 'You can enter a subsidy or discount on the electric car, and it is taken off the price. Schemes and amounts change and differ by state, so check what applies to the car you are buying.' },
      { question: 'What about the battery?', answer: 'Battery replacement is not included. Warranties differ between makers; check the battery warranty and what a replacement would cost before deciding.' },
      { question: 'Why do the results change so much with the kilometres I drive?', answer: 'Running costs scale with distance but the price difference is fixed. A person who drives few kilometres takes much longer to recover a higher purchase price from running-cost savings.' },
    ],
  },
  {
    slug: 'gold-jewellery-price-calculator', kind: 'jewellery', name: 'Gold and silver jewellery price calculator',
    title: 'Gold Jewellery Price Calculator India: Making Charges and GST',
    h1: 'Gold and silver jewellery price calculator',
    description: 'Free gold and silver jewellery price calculator for India. Enter the rate, weight and purity to see the metal value, making charges, GST and the total, plus what you would get back if you sold it.',
    intro: 'The price on a jewellery bill is more than the weight times the rate. Enter today’s rate, the weight and the purity, then the making charges and GST, to see the total you pay, and how much of it you would not get back if you sold the piece.',
    formula: 'Metal value = rate per gram × weight × purity.   Total = (metal value + making charges) × (1 + GST).   Making charges = % of metal value, or ₹ per gram × weight',
    how: [
      'The rate you enter is for 24 carat gold (99.9% pure) or 999 silver. Other purities are priced in proportion: 22 carat is 22 ÷ 24 of the 24 carat price, 18 carat is 18 ÷ 24, and 925 sterling silver is 925 ÷ 999 of the 999 price.',
      'Jewellers add making charges for the work, either as a percentage of the metal value or as a rupee amount per gram. They vary by jeweller and by design, and they can often be negotiated. GST is then charged on the metal value plus the making charges; the default is 3%, which you can change.',
      'If you sell the piece back, you generally get the value of the metal at that day’s rate, sometimes after a deduction. The making charges and GST you paid are usually not returned. The calculator shows how much that is, and how far the price per gram must rise before selling it back returns what you paid.',
      'The rate is not looked up for you, because it changes through the day and differs by city. Enter the rate from your jeweller or a trusted rate board. Hallmarked gold jewellery carries a BIS hallmark and a six-character HUID code that you can check, and it is worth looking for.',
    ],
    example: () => {
      const j = jewelleryPrice({ ratePerGram: 10_000, weightGrams: 10, purity: 22 / 24, makingType: 'percent', making: 0.1, gst: 0.03, buybackDeduction: 0 });
      return `At an example rate of ${formatRupees(10_000)} a gram for 24 carat gold, 10 grams of 22 carat jewellery has a metal value of ${formatRupees(Math.round(j.metalValue))}. With 10% making charges (${formatRupees(Math.round(j.makingCharges))}) and 3% GST (${formatRupees(Math.round(j.gst))}) the bill is ${formatRupees(Math.round(j.total))}. Sold back at the same rate, it fetches the metal value of ${formatRupees(Math.round(j.sellBackValue))}, so about ${formatRupees(Math.round(j.lostOnSelling))} is not recovered.`;
    },
    faqs: [
      { question: 'How is the price of gold jewellery calculated?', answer: 'Weight × the rate for the purity gives the metal value. The jeweller adds making charges, then GST on the total. The calculator does each step and shows the amounts separately.' },
      { question: 'What is the GST on gold jewellery?', answer: 'GST on gold and gold jewellery has been 3%, charged on the metal value plus making charges. Rates can change, so check your bill; you can change the percentage in the calculator.' },
      { question: 'What are making charges?', answer: 'They pay for the design and the work. They are shown as a percentage of the metal value or a rupee amount per gram, and they differ widely between jewellers and between plain and detailed designs. They are often negotiable.' },
      { question: 'Do I get the making charges back if I sell?', answer: 'Usually not. Jewellers generally buy back at the value of the metal, sometimes after a deduction, so the making charges and GST are a cost. This is why jewellery is a poorer way to hold gold as an investment than coins, bars or gold funds.' },
      { question: 'What is the difference between 24 carat and 22 carat gold?', answer: '24 carat gold is about 99.9% pure. 22 carat gold is 22 parts gold in 24, about 91.6% pure, mixed with other metals to make it harder for jewellery. A 22 carat piece is therefore priced at about 22/24 of the 24 carat rate.' },
    ],
  },
  {
    slug: 'gold-silver-return-calculator', kind: 'metalreturn', name: 'Gold and silver return calculator',
    title: 'Gold and Silver Return Calculator: Your Return After Costs',
    h1: 'Gold and silver return calculator',
    description: 'Free gold and silver return calculator. Enter the buying and selling price per gram, the years held and your costs to see how much you really earn per year, and the price you need just to get your money back.',
    intro: 'The price of gold or silver rising is not the same as you making money. GST, making charges, brokerage and holding costs all take a share. Enter what you paid, what it is worth now (or what you expect), the years held and your costs, to see the return you actually earn.',
    formula: 'Grams = amount × (1 − buying cost) ÷ buying price.   Final value = grams × selling price × (1 − selling cost) − holding cost.   Net return per year = (final value ÷ amount)^(1 ÷ years) − 1',
    how: [
      'Of the money you invest, the buying cost (GST, making charges, brokerage) comes off first, so you get fewer grams than the amount divided by the price. When you sell, the selling cost (such as a buy-back deduction) comes off the sale value. A yearly holding cost, such as a locker or a fund’s expenses, is added up over the years you hold.',
      'The price growth per year is the compound rate at which the price per gram rose, before any cost. The net return per year is the rate your own money grew at after all the costs. The gap between the two is what the costs took.',
      'The break-even price is the price per gram you need on the day you sell just to get back what you invested. With meaningful costs it is above the price you paid, which shows how much the price must rise first.',
      'Prices are not looked up for you. Enter the actual price you paid and the price at which you sold, or a price you expect. Past price rises do not predict future ones. Any tax on the gain is not included.',
    ],
    example: () => {
      const r = metalReturn({ amount: 100_000, buyPrice: 6_000, sellPrice: 7_500, years: 5, buyCost: 0.03, sellCost: 0, holdingCostPerYear: 0 });
      return `Investing ${formatRupees(100_000)} when gold is ${formatRupees(6_000)} a gram and selling at ${formatRupees(7_500)} five years later is a price rise of about ${formatPct(r.priceCagr)} a year. With 3% costs on buying, you get ${r.grams.toFixed(2)} grams, end with ${formatRupees(Math.round(r.finalValue))}, and your own return is about ${formatPct(r.netCagr)} a year. The price must reach ${formatRupees(Math.round(r.breakEvenPrice ?? 0))} a gram just to return your ${formatRupees(100_000)}.`;
    },
    faqs: [
      { question: 'How do I calculate my return on gold?', answer: 'Work out the grams you bought after costs, multiply by the selling price after selling costs, subtract any holding costs, and compare with what you put in. The yearly return is that ratio raised to one divided by the years, minus one. The calculator does this.' },
      { question: 'Why is my return lower than the rise in the gold price?', answer: 'Because costs take a share: GST and making charges when buying, a deduction when selling, and any locker or fund expenses. The calculator shows the price growth and your return after costs side by side.' },
      { question: 'Does this include tax?', answer: 'No. Tax on the gain depends on how long you hold and the form you hold it in, and the rules change. Check the current rules before relying on the result.' },
      { question: 'Can I use it for silver?', answer: 'Yes. Choose silver and enter the silver price per gram; the maths is the same.' },
      { question: 'Do past gold returns predict future returns?', answer: 'No. Gold and silver prices rise and fall, sometimes for years. Use real prices you paid or want to test, and try a few scenarios, including a fall.' },
    ],
  },
  {
    slug: 'home-loan-emi-calculator', kind: 'homeloan', name: 'Home loan EMI calculator',
    title: 'Home Loan EMI Calculator India: EMI, Interest and Prepayment',
    h1: 'Home loan EMI calculator',
    description: 'Free home loan EMI calculator for India. Enter the loan amount, interest rate and tenure to see the EMI, total interest, a year-by-year schedule, and how prepaying saves interest and time.',
    intro: 'Enter the loan amount, the interest rate your lender quotes and the tenure, and see the monthly EMI, the total interest you will pay and how the loan is repaid year by year. Then try an extra monthly payment or a one-time prepayment to see how much interest and time it saves.',
    formula: 'EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1)    where P = loan amount, i = yearly rate ÷ 12, n = number of months.   Each month: interest = balance × i; principal repaid = EMI − interest',
    how: [
      'Each month the interest is worked out on the balance still owed, at one-twelfth of the yearly rate. Whatever is left of the EMI after paying that interest reduces the loan. In the early years most of the EMI is interest; over time the share that repays the loan grows. This is called the reducing-balance method and it is how home loans in India are normally calculated.',
      'The total interest is the EMI times the number of months, less the amount you borrowed. A long tenure lowers the EMI but raises the total interest a lot, because the balance stays high for longer.',
      'Prepayment here keeps your EMI the same and shortens the loan. An extra amount paid every month goes straight to the balance, and a one-time lump sum is paid at the end of the month you choose. The earlier you prepay, the more interest you save, because the balance falls while it is still large.',
      'Many home loans have a floating rate, which can change when the lender’s benchmark changes, and then the EMI or the tenure changes too. The calculator assumes one rate for the whole loan. The processing fee you enter is added to the total cost but not to the EMI. Tax deductions on home loan interest and principal are not included.',
    ],
    example: () => {
      const r = loan({ amount: 5_000_000, rate: 0.0875, years: 20, feePct: 0.005 });
      const p = loan({ amount: 5_000_000, rate: 0.0875, years: 20, extraMonthly: 5_000 });
      return `A ${formatRupees(5_000_000)} loan at 8.75% for 20 years has an EMI of about ${formatRupees(Math.round(r.emi))}. Over 240 months you pay about ${formatRupees(Math.round(r.totalInterest))} in interest, ${formatPct(r.interestShare)} of the loan. Paying an extra ${formatRupees(5_000)} every month ends the loan about ${Math.floor(p.monthsSaved / 12)} years ${p.monthsSaved % 12} months earlier and saves about ${formatRupees(Math.round(p.interestSaved))} in interest.`;
    },
    faqs: [
      { question: 'How is a home loan EMI calculated?', answer: 'EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1), where P is the loan amount, i is the yearly interest rate divided by 12 and n is the number of months. The calculator shows this formula on the page and applies it for you.' },
      { question: 'Why is so much of my early EMI interest?', answer: 'Interest is charged on the balance you still owe, and the balance is highest at the start. So the first EMIs are mostly interest and repay little of the loan. As the balance falls, the interest part shrinks and the principal part grows.' },
      { question: 'Is it better to prepay or to invest the money?', answer: 'Prepaying earns you a certain saving equal to the loan’s interest rate, with no risk. Investing may earn more or less and is not guaranteed. The right choice depends on your loan rate, your tax position, your other debts and how much risk you are comfortable with.' },
      { question: 'Does prepaying a home loan cost a penalty?', answer: 'It depends on the loan. Rules in India have generally not allowed prepayment charges on floating-rate loans taken by individuals, but fixed-rate loans and other cases can differ, and rules change. Check your loan agreement and ask your lender before prepaying.' },
      { question: 'Does the calculator include the effect of rate changes?', answer: 'No. It assumes one interest rate for the whole tenure. If your loan is floating and the rate changes, your EMI or tenure will change; enter the new rate and the balance left to see the effect from that point.' },
    ],
  },
  {
    slug: 'car-loan-emi-calculator', kind: 'carloan', name: 'Car loan EMI calculator',
    title: 'Car Loan EMI Calculator India: EMI, Interest and Flat Rate',
    h1: 'Car loan EMI calculator',
    description: 'Free car loan EMI calculator for India. Enter the loan amount, rate and tenure to see the EMI, total interest and fee, and convert a flat rate into the real reducing-balance rate.',
    intro: 'Work out the EMI of a car loan from the amount, the interest rate and the number of years. If your lender quotes a flat rate, switch the rate type to see the real yearly rate you are paying and compare it with other offers.',
    formula: 'EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1)    where P = loan amount, i = yearly rate ÷ 12, n = months.   Flat rate: EMI = (P + P × flat rate × years) ÷ months',
    how: [
      'A car loan on the reducing-balance method works like any other loan: interest each month is charged on what you still owe, so it falls as you repay. The EMI is fixed, and the calculator shows how much of each year’s payments is interest and how much repays the loan.',
      'Some lenders quote a flat rate. A flat rate charges interest on the full original amount for the whole term, even though you repay part of it every month. The EMI is the amount plus all that interest, divided by the number of months. A flat rate therefore costs much more than the same number quoted on a reducing balance, roughly 1.8 times as much. Switch to Flat rate to see the equivalent reducing-balance rate that you can compare with other loans.',
      'The processing fee is paid once and added to the total cost. Insurance, registration, other charges and any down payment are not included. Enter the loan amount after your down payment.',
    ],
    example: () => {
      const r = loan({ amount: 800_000, rate: 0.09, years: 5, feePct: 0.01 });
      const e = flatEmi(800_000, 0.08, 5);
      const eff = rateFromEmi(800_000, e, 5) ?? 0;
      return `A ${formatRupees(800_000)} car loan at 9% on a reducing balance for 5 years has an EMI of about ${formatRupees(Math.round(r.emi))} and costs about ${formatRupees(Math.round(r.totalInterest))} in interest. The same loan quoted at an 8% flat rate has an EMI of ${formatRupees(Math.round(e))}, which is really a ${formatPct(eff)} yearly rate on a reducing balance.`;
    },
    faqs: [
      { question: 'How do I calculate a car loan EMI?', answer: 'Use EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1), where P is the loan, i is the yearly rate divided by 12 and n is the number of months. The calculator does this and shows each year’s breakdown.' },
      { question: 'What is the difference between a flat rate and a reducing-balance rate?', answer: 'A flat rate charges interest on the full original loan for the whole tenure. A reducing-balance rate charges interest only on what you still owe. A flat rate of 8% is much more expensive than 8% reducing, and equals roughly 14% to 15% on a reducing balance for a typical 5-year loan.' },
      { question: 'Should I take a longer tenure to lower the EMI?', answer: 'A longer tenure lowers the EMI but raises the total interest, and you owe money for longer on a car that loses value each year. Compare the total interest at different tenures before deciding.' },
      { question: 'What does the calculator leave out?', answer: 'Down payment, insurance, registration, other charges and any change in rate. Enter the loan amount you will actually borrow.' },
    ],
  },
  {
    slug: 'personal-loan-emi-calculator', kind: 'personalloan', name: 'Personal loan EMI calculator',
    title: 'Personal Loan EMI Calculator India: EMI, Interest and Total Cost',
    h1: 'Personal loan EMI calculator',
    description: 'Free personal loan EMI calculator for India. Enter the amount, interest rate, tenure and processing fee to see the EMI, total interest and the full cost, with a year-by-year schedule.',
    intro: 'Personal loans are unsecured and usually carry a higher interest rate and a processing fee. Enter the amount, the rate, the tenure and the fee to see what the loan will really cost, and what prepaying would save.',
    formula: 'EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1)    where P = loan amount, i = yearly rate ÷ 12, n = months.   Total cost = EMI × n + processing fee',
    how: [
      'The EMI is worked out on the reducing-balance method: each month interest is charged on the balance you still owe and the rest of the EMI repays the loan. The calculator shows the EMI, the total interest and a year-by-year schedule.',
      'Because personal loan rates are higher, the interest is a big share of what you repay, especially over a long tenure. Try a shorter tenure to see how much interest it saves, and check whether you can afford the higher EMI.',
      'The processing fee, usually a percentage of the loan, is paid once and added to the total you pay. Taxes on the fee, insurance if you take it, and late fees are not included. If your lender quotes a flat rate, switch the rate type to see the true yearly rate.',
      'Prepaying part of a personal loan can save a lot of interest. Rules on prepayment charges vary by lender and loan, so check your agreement first.',
    ],
    example: () => {
      const r = loan({ amount: 300_000, rate: 0.14, years: 3, feePct: 0.02 });
      return `A ${formatRupees(300_000)} personal loan at 14% for 3 years has an EMI of about ${formatRupees(Math.round(r.emi))}. You pay about ${formatRupees(Math.round(r.totalInterest))} in interest and ${formatRupees(Math.round(r.processingFee))} as a 2% processing fee, so the loan costs about ${formatRupees(Math.round(r.totalPaid))} in all.`;
    },
    faqs: [
      { question: 'How is a personal loan EMI calculated?', answer: 'EMI = P × i × (1 + i)ⁿ ÷ ((1 + i)ⁿ − 1), where P is the amount, i is the yearly rate divided by 12 and n is the number of months. The formula is shown on this page.' },
      { question: 'Why are personal loan rates higher?', answer: 'Personal loans are usually unsecured, with nothing pledged against them, so lenders charge more for the higher risk. Your rate depends on your credit record, income and the lender.' },
      { question: 'How can I reduce the interest on a personal loan?', answer: 'Choose the shortest tenure you can afford, compare lenders on the true yearly rate and fees, and prepay when you have spare money. The calculator shows what a shorter tenure and prepayment save.' },
      { question: 'Is the interest on a personal loan tax deductible?', answer: 'Generally not, unless the money is used for something the tax rules allow a deduction for. This calculator does not include any tax effect; check the current rules for your case.' },
    ],
  },
  {
    slug: 'fd-calculator', kind: 'fd', name: 'FD calculator with tax and inflation',
    title: 'FD Calculator: Fixed Deposit Maturity After Tax and Inflation',
    h1: 'FD calculator with tax and inflation',
    description: 'Free fixed deposit calculator for India. See the maturity amount, then what you actually keep after tax on the interest and what it is worth after inflation.',
    intro: 'A fixed deposit’s headline rate is not what you earn. Interest is taxed, and prices keep rising. Enter the amount, rate and term, your tax rate and expected inflation to see the maturity amount and your real return after both.',
    formula: 'Maturity = P × (1 + r ÷ n)^(n × t)    where r = yearly rate, n = times interest is added a year, t = years.   After tax: interest × (1 − tax rate).   Real return = (1 + after-tax return) ÷ (1 + inflation) − 1',
    how: [
      'Banks usually add interest to a cumulative fixed deposit every quarter, which is why the yearly yield is a little higher than the quoted rate. Choose how often interest is added to match your deposit.',
      'The interest is added to your income and taxed at your slab rate. The calculator takes your tax rate off all the interest earned. If your income is low enough that you pay no tax, set the tax rate to zero. Banks may also deduct tax at source when interest crosses a limit, which is not the same as the tax you finally owe.',
      'Inflation lowers what the money will buy. The real return is how fast your buying power grows after tax and inflation; when it is below zero, the money buys less at the end than at the start even though the amount is bigger. The calculator shows the maturity amount after tax in today’s money so you can see this.',
      'The rate, tax rate and inflation are all assumptions you enter. Early withdrawal penalties and changes in rates are not included.',
    ],
    example: () => {
      const d = deposit({ amount: 100_000, rate: 0.07, years: 5, perYear: 4, taxRate: 0.3, inflation: 0.05 });
      return `${formatRupees(100_000)} in a 5-year deposit at 7%, with interest added quarterly, grows to about ${formatRupees(Math.round(d.maturity))}. Taxed at 30%, you keep ${formatRupees(Math.round(d.interestAfterTax))} of the ${formatRupees(Math.round(d.interest))} interest, a return of about ${formatPct(d.afterTaxRate)} a year. With 5% inflation, the real return is about ${formatPct(d.realRate)} a year, and the ${formatRupees(Math.round(d.maturityAfterTax))} you end up with is worth about ${formatRupees(Math.round(d.maturityInTodaysMoney))} in today’s money.`;
    },
    faqs: [
      { question: 'How is the maturity value of a fixed deposit calculated?', answer: 'Maturity = P × (1 + r ÷ n)^(n × t), where P is the amount, r the yearly rate, n how many times interest is added in a year and t the years. Banks commonly add interest quarterly.' },
      { question: 'Is FD interest taxable?', answer: 'Yes. The interest is added to your income and taxed at your slab rate. Banks may deduct tax at source if the interest is above a limit, but what you owe depends on your total income. The calculator takes the tax rate you enter off all the interest.' },
      { question: 'What is the real return on an FD?', answer: 'It is the return after tax and after inflation. If inflation is higher than your after-tax return, your money loses buying power even though the rupee amount grows.' },
      { question: 'Why is the effective yield higher than the quoted rate?', answer: 'Because interest is added several times a year and then earns interest itself. A 7% rate with quarterly compounding gives an effective yearly yield of about 7.19%.' },
    ],
  },
  {
    slug: 'inflation-calculator', kind: 'inflation', name: 'Inflation calculator',
    title: 'Inflation Calculator India: Future Cost and Buying Power',
    h1: 'Inflation calculator',
    description: 'Free inflation calculator. See what something that costs ₹1 lakh today will cost after a number of years, and how much less your money will buy, at an inflation rate you enter.',
    intro: 'Prices rise, so the same money buys less each year. Enter an amount, a yearly inflation rate and a number of years to see what it will cost to buy the same things later, and how much of your money’s buying power is lost.',
    formula: 'Future cost = amount × (1 + inflation)^years.   Buying power of the same amount = amount ÷ (1 + inflation)^years',
    how: [
      'Inflation compounds, like interest in reverse. At 6% a year, prices roughly double in 12 years. The calculator multiplies the amount by (1 + inflation) for every year to get the future cost, and divides by the same number to get what today’s amount will be worth then.',
      'Use it to set a goal in future money. If a course costs ₹10 lakh today and fees rise 8% a year, it will cost much more when your child is ready for it. Use the future cost as the target in the goal SIP calculator.',
      'The rate is an assumption you enter. Inflation differs for different things: education and medical costs have often risen faster than the general level of prices. Past inflation does not predict future inflation.',
    ],
    example: () => {
      const r = inflation(100_000, 0.06, 10);
      return `At 6% a year, something that costs ${formatRupees(100_000)} today will cost about ${formatRupees(Math.round(r.futureCost))} in 10 years. In the same time, ${formatRupees(100_000)} will only buy what about ${formatRupees(Math.round(r.buyingPower))} buys today, a loss of ${formatPct(r.lostShare)} of its buying power.`;
    },
    faqs: [
      { question: 'How is the future cost of something calculated?', answer: 'Multiply today’s cost by (1 + inflation rate) for each year. At 6% for 10 years the multiplier is 1.06 to the power 10, about 1.79.' },
      { question: 'What inflation rate should I use?', answer: 'There is no single right number. Use a cautious figure and try a few. Costs such as education and healthcare can rise faster than the general price level, so use a higher rate for those goals.' },
      { question: 'Why does the buying power of my money fall?', answer: 'Because prices rise while the amount stays the same. After 10 years at 6% inflation, the same rupee amount buys only about 56% of what it does today.' },
      { question: 'How do I use this for a financial goal?', answer: 'Work out the goal’s cost in today’s money, use this calculator to find what it will cost in the year you need it, and then use the goal SIP calculator to find the monthly amount to save.' },
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
