/**
 * Rent vs buy a home. Pure functions: no DOM, no network.
 *
 * The question it answers: after N years, who is richer, the person who bought or the person who
 * rented and invested the difference? Both people spend exactly the same money every month, so the
 * comparison is fair:
 *
 * - Month 0: the buyer pays the down payment and the stamp duty and registration. The renter
 *   invests that same amount.
 * - Every month the buyer pays the EMI plus maintenance and property tax, and the renter pays rent.
 *   Whoever pays less invests the difference, so both always spend the same total.
 * - At the end the buyer sells (after selling costs and tax on the gain, and repays any loan left).
 *   The renter cashes in the investments (after tax on the gain).
 *
 * Conventions (also shown on the calculator page):
 * - The EMI uses the standard Indian formula with the yearly loan rate divided by 12.
 * - Property value and investments grow at yearly effective rates (a monthly rate of (1 + r)^(1/12) - 1).
 * - Rent rises once a year, at the start of each year, by the rent increase.
 * - Maintenance and property tax are a percentage of the property's current value, charged monthly.
 * - Tax on gains is one rate applied to both the property gain (sale price less selling cost, less
 *   purchase price and stamp duty) and the investment gain. Home loan interest deductions are NOT
 *   included, so the buyer's result is slightly pessimistic for people who can claim them.
 * - If the horizon is longer than the loan, the EMI stops when the loan ends.
 * - Everything is a projection from the assumptions entered, not a forecast.
 */

export interface RentVsBuyInput {
  /** Purchase price of the home, in rupees. */
  price: number;
  /** Down payment as a fraction of the price (0.2 = 20%). */
  downPaymentPct: number;
  /** Stamp duty and registration as a fraction of the price. */
  stampDutyPct: number;
  /** Yearly home loan interest rate as a fraction. */
  loanRate: number;
  /** Loan tenure in years. */
  loanYears: number;
  /** Monthly rent today for a comparable home, in rupees. */
  monthlyRent: number;
  /** Yearly rent increase as a fraction. */
  rentGrowth: number;
  /** Yearly price growth of the home as a fraction. */
  appreciation: number;
  /** Yearly return on money invested instead, as a fraction. */
  investReturn: number;
  /** Maintenance and property tax per year, as a fraction of the home's current value. */
  holdingCostPct: number;
  /** Brokerage and other costs when selling, as a fraction of the sale price. */
  sellingCostPct: number;
  /** Tax rate on gains (property and investments), as a fraction. */
  gainsTaxPct: number;
  /** How many years until the buyer would sell. */
  horizonYears: number;
}

export interface RentVsBuyYear {
  /** 1-based year. */
  year: number;
  /** Net worth of the buyer if they sold at the end of this year. */
  buyer: number;
  /** Net worth of the renter at the end of this year. */
  renter: number;
}

export interface RentVsBuyResult {
  emi: number;
  /** Money needed on day one: down payment plus stamp duty and registration. */
  upfront: number;
  loanAmount: number;
  /** Net worth of the buyer at the end of the horizon, after selling. */
  buyerNetWorth: number;
  /** Net worth of the renter at the end of the horizon. */
  renterNetWorth: number;
  /** `buyerNetWorth - renterNetWorth`: positive means buying came out ahead. */
  difference: number;
  winner: 'buy' | 'rent' | 'tie';
  /** Home price at the end of the horizon. */
  finalPropertyValue: number;
  /** Loan still owed at the end of the horizon (repaid out of the sale). */
  loanOutstanding: number;
  /** First year in which buying is ahead and stays ahead to the end, or null. */
  breakEvenYear: number | null;
  /** Yearly rent as a percentage of the price: the "rental yield". */
  grossYield: number;
  years: RentVsBuyYear[];
}

/** Standard EMI. A zero rate is a plain division. */
export function emi(loan: number, yearlyRate: number, years: number): number {
  const n = Math.round(years * 12);
  if (loan <= 0 || n <= 0) return 0;
  const i = yearlyRate / 12;
  if (i === 0) return loan / n;
  const f = (1 + i) ** n;
  return (loan * i * f) / (f - 1);
}

const monthlyGrowth = (yearly: number): number => (1 + yearly) ** (1 / 12) - 1;

/**
 * Compares buying with renting and investing the difference.
 *
 * @param p - All assumptions; fractions, not percentages.
 */
export function rentVsBuy(p: RentVsBuyInput): RentVsBuyResult {
  const months = Math.round(p.horizonYears * 12);
  const loanMonths = Math.round(p.loanYears * 12);
  const down = p.price * p.downPaymentPct;
  const stamp = p.price * p.stampDutyPct;
  const loanAmount = p.price - down;
  const payment = emi(loanAmount, p.loanRate, p.loanYears);
  const upfront = down + stamp;
  const gProp = monthlyGrowth(p.appreciation);
  const gInv = monthlyGrowth(p.investReturn);
  const i = p.loanRate / 12;

  let value = p.price;
  let loan = loanAmount;
  // Each person's pot of invested money, and what they put into it (for the tax on the gain).
  let buyerPot = 0;
  let buyerPaidIn = 0;
  let renterPot = upfront;
  let renterPaidIn = upfront;
  const years: RentVsBuyYear[] = [];

  const buyerWorth = (): number => {
    const sale = value * (1 - p.sellingCostPct);
    const propertyGain = sale - p.price - stamp;
    const propertyAfterTax = sale - Math.max(0, propertyGain) * p.gainsTaxPct;
    const pot = buyerPot - Math.max(0, buyerPot - buyerPaidIn) * p.gainsTaxPct;
    return propertyAfterTax - loan + pot;
  };
  const renterWorth = (): number => renterPot - Math.max(0, renterPot - renterPaidIn) * p.gainsTaxPct;

  for (let m = 1; m <= months; m++) {
    const rent = p.monthlyRent * (1 + p.rentGrowth) ** Math.floor((m - 1) / 12);
    const holding = (value * p.holdingCostPct) / 12;
    let emiPaid = 0;
    if (m <= loanMonths && loan > 0) {
      emiPaid = payment;
      loan = Math.max(0, loan * (1 + i) - payment);
    }
    const ownerCost = emiPaid + holding;
    // Grow existing pots for the month, then add the month's saving to whoever spent less.
    buyerPot *= 1 + gInv;
    renterPot *= 1 + gInv;
    value *= 1 + gProp;
    const diff = ownerCost - rent;
    if (diff > 0) { renterPot += diff; renterPaidIn += diff; } else { buyerPot -= diff; buyerPaidIn -= diff; }
    if (m % 12 === 0) years.push({ year: m / 12, buyer: buyerWorth(), renter: renterWorth() });
  }

  const buyerNetWorth = buyerWorth();
  const renterNetWorth = renterWorth();
  const difference = buyerNetWorth - renterNetWorth;
  let breakEvenYear: number | null = null;
  for (let k = years.length - 1; k >= 0 && years[k].buyer >= years[k].renter; k--) breakEvenYear = years[k].year;
  return {
    emi: payment,
    upfront,
    loanAmount,
    buyerNetWorth,
    renterNetWorth,
    difference,
    winner: Math.abs(difference) < 1 ? 'tie' : difference > 0 ? 'buy' : 'rent',
    finalPropertyValue: value,
    loanOutstanding: loan,
    breakEvenYear,
    grossYield: p.price > 0 ? (p.monthlyRent * 12) / p.price : 0,
    years,
  };
}

/**
 * The monthly rent today at which buying and renting end up equal, for the same other assumptions.
 * Renting a home that costs more than this is a reason to buy; less is a reason to keep renting.
 * Returns null when no rent up to 2% of the price a month makes buying come out even.
 */
export function breakEvenRent(p: RentVsBuyInput): number | null {
  let lo = 0;
  let hi = p.price * 0.02;
  if (rentVsBuy({ ...p, monthlyRent: hi }).difference < 0) return null;
  if (rentVsBuy({ ...p, monthlyRent: lo }).difference >= 0) return 0;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (rentVsBuy({ ...p, monthlyRent: mid }).difference >= 0) hi = mid; else lo = mid;
  }
  return hi;
}

/** Starting values for the calculator. These are assumptions to change, not predictions. */
export const RENT_VS_BUY_DEFAULTS: RentVsBuyInput = {
  price: 10_000_000,
  downPaymentPct: 0.2,
  stampDutyPct: 0.06,
  loanRate: 0.0875,
  loanYears: 20,
  monthlyRent: 25_000,
  rentGrowth: 0.05,
  appreciation: 0.06,
  investReturn: 0.1,
  holdingCostPct: 0.005,
  sellingCostPct: 0.01,
  gainsTaxPct: 0.125,
  horizonYears: 15,
};
