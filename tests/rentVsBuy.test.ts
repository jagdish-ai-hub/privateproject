import { describe, expect, it } from 'vitest';
import { RENT_VS_BUY_DEFAULTS as D, breakEvenRent, emi, rentVsBuy, type RentVsBuyInput } from '../src/lib/rentVsBuy.ts';

const plain: RentVsBuyInput = { ...D, downPaymentPct: 1, stampDutyPct: 0, monthlyRent: 0, rentGrowth: 0, holdingCostPct: 0, sellingCostPct: 0, gainsTaxPct: 0, horizonYears: 10 };
const mg = (y: number): number => (1 + y) ** (1 / 12) - 1;

describe('emi', () => {
  it('matches the standard formula for 80 lakh at 8.75% over 20 years', () => {
    expect(emi(8_000_000, 0.0875, 20)).toBeCloseTo(70_701, -1);
  });
  it('is a plain division at a zero rate and zero without a loan', () => {
    expect(emi(1_200_000, 0, 10)).toBeCloseTo(10_000, 6);
    expect(emi(0, 0.09, 10)).toBe(0);
  });
});

describe('rentVsBuy', () => {
  it('with no loan, no rent and no costs: the buyer holds a home growing at the appreciation rate, the renter an investment at the return', () => {
    const r = rentVsBuy(plain);
    expect(r.buyerNetWorth).toBeCloseTo(plain.price * (1 + plain.appreciation) ** 10, 0);
    expect(r.renterNetWorth).toBeCloseTo(plain.price * (1 + plain.investReturn) ** 10, 0);
    expect(r.winner).toBe('rent');
  });
  it('a buyer with spare cash invests it: flat rent paid by nobody else means the saving builds a pot', () => {
    const r = rentVsBuy({ ...plain, monthlyRent: 20_000 });
    const g = mg(plain.investReturn);
    const months = 120;
    const pot = (20_000 * ((1 + g) ** months - 1)) / g;
    expect(r.buyerNetWorth).toBeCloseTo(plain.price * (1 + plain.appreciation) ** 10 + pot, 0);
    expect(r.renterNetWorth).toBeCloseTo(plain.price * (1 + plain.investReturn) ** 10, 0);
  });
  it('the loan is fully repaid when the horizon equals the tenure', () => {
    const r = rentVsBuy({ ...D, horizonYears: D.loanYears });
    expect(r.loanOutstanding).toBeLessThan(1);
  });
  it('the loan is still owed, and subtracted, when the horizon is shorter than the tenure', () => {
    const r = rentVsBuy({ ...D, horizonYears: 5 });
    expect(r.loanOutstanding).toBeGreaterThan(0.8 * r.loanAmount);
    expect(r.loanOutstanding).toBeLessThan(r.loanAmount);
  });
  it('upfront money is the down payment plus stamp duty', () => {
    expect(rentVsBuy(D).upfront).toBeCloseTo(D.price * (D.downPaymentPct + D.stampDutyPct), 6);
  });
  it('higher rent, faster appreciation or lower returns favour buying', () => {
    const base = rentVsBuy(D).difference;
    expect(rentVsBuy({ ...D, monthlyRent: D.monthlyRent * 1.5 }).difference).toBeGreaterThan(base);
    expect(rentVsBuy({ ...D, appreciation: D.appreciation + 0.02 }).difference).toBeGreaterThan(base);
    expect(rentVsBuy({ ...D, investReturn: D.investReturn - 0.03 }).difference).toBeGreaterThan(base);
    expect(rentVsBuy({ ...D, loanRate: D.loanRate + 0.02 }).difference).toBeLessThan(base);
  });
  it('tax and selling costs only reduce what each side ends up with', () => {
    const free = rentVsBuy({ ...D, gainsTaxPct: 0, sellingCostPct: 0 });
    const costly = rentVsBuy(D);
    expect(costly.buyerNetWorth).toBeLessThan(free.buyerNetWorth);
    expect(costly.renterNetWorth).toBeLessThan(free.renterNetWorth);
  });
  it('reports one row per year and the last row equals the headline result', () => {
    const r = rentVsBuy(D);
    expect(r.years).toHaveLength(D.horizonYears);
    expect(r.years[r.years.length - 1].buyer).toBeCloseTo(r.buyerNetWorth, 6);
    expect(r.years[r.years.length - 1].renter).toBeCloseTo(r.renterNetWorth, 6);
  });
  it('break-even year is the start of the final stretch where buying leads', () => {
    const r = rentVsBuy({ ...D, monthlyRent: 45_000 });
    if (r.breakEvenYear !== null) {
      for (const y of r.years) if (y.year >= r.breakEvenYear) expect(y.buyer).toBeGreaterThanOrEqual(y.renter);
      const before = r.years.find((y) => y.year === r.breakEvenYear! - 1);
      if (before) expect(before.buyer).toBeLessThan(before.renter);
    }
    expect(rentVsBuy({ ...D, monthlyRent: 1_000 }).breakEvenYear).toBeNull();
  });
  it('gross yield is yearly rent over price', () => {
    expect(rentVsBuy(D).grossYield).toBeCloseTo(0.03, 10);
  });
});

describe('breakEvenRent', () => {
  it('is the rent at which the two sides end level, and sits between a clear rent win and a clear buy win', () => {
    const be = breakEvenRent(D)!;
    expect(be).toBeGreaterThan(0);
    expect(Math.abs(rentVsBuy({ ...D, monthlyRent: be }).difference)).toBeLessThan(10);
    expect(rentVsBuy({ ...D, monthlyRent: be * 0.8 }).winner).toBe('rent');
    expect(rentVsBuy({ ...D, monthlyRent: be * 1.2 }).winner).toBe('buy');
  });
  it('is null when even a 2%-of-price rent cannot make buying win', () => {
    expect(breakEvenRent({ ...D, stampDutyPct: 0.5, horizonYears: 1 })).toBeNull();
  });
});
