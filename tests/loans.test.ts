import { describe, expect, it } from 'vitest';
import { deposit, emi, flatEmi, inflation, loan, rateFromEmi } from '../src/lib/loans.ts';

const base = { amount: 5_000_000, rate: 0.0875, years: 20 };

describe('loan', () => {
  it('no prepayment: interest = EMI × months − amount, and the balance reaches zero', () => {
    const r = loan(base);
    expect(r.months).toBe(240);
    expect(r.totalInterest).toBeCloseTo(emi(base.amount, base.rate, base.years) * 240 - base.amount, 0);
    expect(r.years[r.years.length - 1].balance).toBe(0);
    expect(r.years).toHaveLength(20);
    expect(r.years.reduce((s, y) => s + y.principalPaid, 0)).toBeCloseTo(base.amount, 4);
    expect(r.years.reduce((s, y) => s + y.interestPaid, 0)).toBeCloseTo(r.totalInterest, 4);
    expect(r.interestSaved).toBeCloseTo(0, 6);
    expect(r.monthsSaved).toBe(0);
  });
  it('matches a known figure: ₹50 lakh at 8.75% for 20 years has an EMI of about ₹44,186 and ₹56 lakh interest', () => {
    const r = loan(base);
    expect(r.emi).toBeCloseTo(44_186, -1);
    expect(r.totalInterest).toBeCloseTo(5_604_700, -3);
  });
  it('first-year interest is mostly interest: month 1 interest = amount × rate ÷ 12', () => {
    const r = loan({ ...base, years: 1 });
    expect(r.years[0].interestPaid).toBeGreaterThan(0);
    const one = loan({ amount: 1_200_000, rate: 0.12, years: 1 });
    expect(one.emi).toBeCloseTo(106_618.55, 1);
  });
  it('an extra monthly payment shortens the loan and saves interest, and the books still balance', () => {
    const r = loan({ ...base, extraMonthly: 5_000 });
    expect(r.months).toBeLessThan(240);
    expect(r.monthsSaved).toBe(240 - r.months);
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.interestSaved).toBeCloseTo(r.plain.totalInterest - r.totalInterest, 6);
    expect(r.years.reduce((s, y) => s + y.principalPaid, 0)).toBeCloseTo(base.amount, 4);
  });
  it('a lump sum prepayment saves interest, more the earlier it is paid', () => {
    const early = loan({ ...base, lump: 500_000, lumpMonth: 12 });
    const late = loan({ ...base, lump: 500_000, lumpMonth: 120 });
    expect(early.interestSaved).toBeGreaterThan(late.interestSaved);
    expect(late.interestSaved).toBeGreaterThan(0);
  });
  it('a prepayment larger than the balance clears the loan without going negative', () => {
    const r = loan({ ...base, lump: 99_000_000, lumpMonth: 6 });
    expect(r.months).toBe(6);
    expect(r.years[r.years.length - 1].balance).toBe(0);
  });
  it('processing fee is added to the total but not to the EMI', () => {
    const a = loan(base);
    const b = loan({ ...base, feePct: 0.01 });
    expect(b.emi).toBeCloseTo(a.emi, 8);
    expect(b.processingFee).toBeCloseTo(50_000, 6);
    expect(b.totalPaid).toBeCloseTo(a.totalPaid + 50_000, 4);
  });
  it('zero rate: EMI is a plain division and interest is zero', () => {
    const r = loan({ amount: 120_000, rate: 0, years: 1 });
    expect(r.emi).toBeCloseTo(10_000, 8);
    expect(r.totalInterest).toBeCloseTo(0, 8);
  });
});

describe('flat rate', () => {
  it('EMI = (amount + amount × flat × years) ÷ months', () => {
    expect(flatEmi(100_000, 0.1, 2)).toBeCloseTo((100_000 + 20_000) / 24, 8);
  });
  it('the reducing-balance rate it is equivalent to is about 1.8 times the flat rate, and reproduces the EMI', () => {
    const e = flatEmi(300_000, 0.08, 3);
    const eff = rateFromEmi(300_000, e, 3)!;
    expect(eff).toBeGreaterThan(0.08 * 1.7);
    expect(eff).toBeLessThan(0.08 * 2);
    expect(emi(300_000, eff, 3)).toBeCloseTo(e, 4);
  });
  it('an EMI that cannot repay the amount has no rate', () => {
    expect(rateFromEmi(100_000, 1_000, 2)).toBeNull();
  });
});

describe('deposit', () => {
  const p = { amount: 100_000, rate: 0.07, years: 5, perYear: 4 as const, taxRate: 0.3, inflation: 0.05 };
  it('quarterly compounding: amount × (1 + r/4)^(4 × years)', () => {
    expect(deposit(p).maturity).toBeCloseTo(100_000 * (1 + 0.07 / 4) ** 20, 6);
    expect(deposit({ ...p, perYear: 1 }).maturity).toBeCloseTo(100_000 * 1.07 ** 5, 6);
  });
  it('more frequent compounding earns slightly more', () => {
    expect(deposit({ ...p, perYear: 12 }).maturity).toBeGreaterThan(deposit(p).maturity);
    expect(deposit(p).maturity).toBeGreaterThan(deposit({ ...p, perYear: 1 }).maturity);
  });
  it('tax is the rate on all the interest; after-tax and real rates fall in order', () => {
    const d = deposit(p);
    expect(d.tax).toBeCloseTo(d.interest * 0.3, 8);
    expect(d.maturityAfterTax).toBeCloseTo(d.maturity - d.tax, 8);
    expect(d.effectiveRate).toBeGreaterThan(0.07);
    expect(d.afterTaxRate).toBeLessThan(d.effectiveRate);
    expect(d.realRate).toBeLessThan(d.afterTaxRate);
    expect(d.maturityInTodaysMoney).toBeCloseTo(d.maturityAfterTax / 1.05 ** 5, 6);
  });
  it('a high tax rate and inflation can make the real return negative', () => {
    expect(deposit({ ...p, taxRate: 0.3, inflation: 0.08 }).realRate).toBeLessThan(0);
  });
  it('reports a row per year, ending at the maturity', () => {
    const d = deposit(p);
    expect(d.years).toHaveLength(5);
    expect(d.years[4].value).toBeCloseTo(d.maturity, 6);
  });
});

describe('inflation', () => {
  it('₹1,00,000 at 6% for 10 years costs ₹1,79,085 and buys what ₹55,839 buys today', () => {
    const r = inflation(100_000, 0.06, 10);
    expect(r.futureCost).toBeCloseTo(179_084.77, 1);
    expect(r.buyingPower).toBeCloseTo(55_839.48, 1);
    expect(r.lostShare).toBeCloseTo(1 - 55_839.48 / 100_000, 5);
  });
});
