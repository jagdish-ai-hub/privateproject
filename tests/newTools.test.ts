import { describe, expect, it } from 'vitest';
import { emi, loanEligibility, principalFromEmi } from '../src/lib/loans.ts';
import { goldSip } from '../src/lib/metals.ts';
import { fuelCost, mileage } from '../src/lib/vehicle.ts';
import { isoToDay, xirrOf } from '../src/lib/xirrTool.ts';

describe('loan eligibility', () => {
  it('principalFromEmi is the EMI formula backwards', () => {
    const e = emi(5_000_000, 0.0875, 20);
    expect(principalFromEmi(e, 0.0875, 20)).toBeCloseTo(5_000_000, 4);
    expect(principalFromEmi(10_000, 0, 5)).toBe(600_000);
    expect(principalFromEmi(0, 0.09, 5)).toBe(0);
  });
  it('₹1 lakh income, 50% share, ₹10,000 existing EMIs leaves ₹40,000 for the new EMI', () => {
    const r = loanEligibility({ income: 100_000, existingEmi: 10_000, emiShare: 0.5, rate: 0.0875, years: 20 });
    expect(r.emiLimit).toBe(50_000);
    expect(r.maxEmi).toBe(40_000);
    expect(emi(r.maxLoan, 0.0875, 20)).toBeCloseTo(40_000, 4);
    expect(r.maxLoan).toBeCloseTo(4_526_300, -3);
    expect(r.totalInterest).toBeCloseTo(40_000 * 240 - r.maxLoan, 4);
  });
  it('existing EMIs above the limit mean no new loan', () => {
    const r = loanEligibility({ income: 50_000, existingEmi: 30_000, emiShare: 0.5, rate: 0.09, years: 10 });
    expect(r.maxEmi).toBe(0);
    expect(r.maxLoan).toBe(0);
    expect(r.totalInterest).toBe(0);
  });
  it('a longer tenure or a lower rate raises the amount', () => {
    const base = { income: 80_000, existingEmi: 0, emiShare: 0.4, rate: 0.09, years: 15 };
    expect(loanEligibility({ ...base, years: 25 }).maxLoan).toBeGreaterThan(loanEligibility(base).maxLoan);
    expect(loanEligibility({ ...base, rate: 0.08 }).maxLoan).toBeGreaterThan(loanEligibility(base).maxLoan);
  });
});

describe('fuel cost and mileage', () => {
  const base = { fuelPrice: 100, kmPerUnit: 20, mileageCut: 0, tripKm: 300, kmPerMonth: 1_000, people: 1 };
  it('₹100 a litre at 20 km/l is ₹5 a km', () => {
    const r = fuelCost(base);
    expect(r.perKm).toBe(5);
    expect(r.tripFuel).toBe(15);
    expect(r.tripCost).toBe(1_500);
    expect(r.perMonth).toBe(5_000);
    expect(r.perYear).toBe(60_000);
    expect(r.monthFuel).toBe(50);
  });
  it('a 20% cut in mileage raises the cost by a quarter', () => {
    const r = fuelCost({ ...base, mileageCut: 0.2 });
    expect(r.mileageUsed).toBe(16);
    expect(r.perKm).toBeCloseTo(6.25, 10);
  });
  it('the trip cost is shared equally, and zero mileage does not divide by zero', () => {
    expect(fuelCost({ ...base, people: 4 }).tripCostPerPerson).toBe(375);
    expect(fuelCost({ ...base, people: 0 }).tripCostPerPerson).toBe(1_500);
    expect(fuelCost({ ...base, kmPerUnit: 0 }).perKm).toBe(0);
  });
  it('mileage: 450 km on 30 litres is 15 km/l, 6.67 l per 100 km', () => {
    const m = mileage(450, 30, 105)!;
    expect(m.kmPerUnit).toBe(15);
    expect(m.per100Km).toBeCloseTo(6.6667, 3);
    expect(m.costPerKm).toBe(7);
    expect(mileage(0, 30, 100)).toBeNull();
    expect(mileage(100, 0, 100)).toBeNull();
  });
  it('fuel cost and mileage agree with each other', () => {
    const m = mileage(600, 40, 95)!;
    expect(fuelCost({ ...base, fuelPrice: 95, kmPerUnit: m.kmPerUnit }).perKm).toBeCloseTo(m.costPerKm, 10);
  });
});

describe('gold SIP', () => {
  const base = { monthly: 5_000, pricePerGram: 10_000, growth: 0, years: 10, buyCost: 0 };
  it('no growth and no cost: the value equals the money put in', () => {
    const r = goldSip(base);
    expect(r.invested).toBe(600_000);
    expect(r.grams).toBeCloseTo(60, 9);
    expect(r.value).toBeCloseTo(600_000, 6);
    expect(r.gain).toBeCloseTo(0, 6);
    expect(r.averageCost).toBeCloseTo(10_000, 6);
    expect(r.years).toHaveLength(10);
  });
  it('a 3% cost on every purchase buys 1/1.03 of the gold', () => {
    const r = goldSip({ ...base, buyCost: 0.03 });
    expect(r.grams).toBeCloseTo(60 / 1.03, 9);
    expect(r.value).toBeLessThan(r.invested);
  });
  it('with growth, each instalment grows from its own month: matches the sum done by hand', () => {
    const r = goldSip({ ...base, growth: 0.08, years: 1 });
    let expected = 0;
    for (let m = 0; m < 12; m++) expected += 5_000 * 1.08 ** ((12 - m) / 12);
    expect(r.value).toBeCloseTo(expected, 6);
    expect(r.finalPrice).toBeCloseTo(10_800, 6);
    expect(r.gain).toBeGreaterThan(0);
  });
  it('yearly rows end at the totals and grams never fall', () => {
    const r = goldSip({ ...base, growth: 0.07, years: 15, buyCost: 0.03 });
    const last = r.years[r.years.length - 1];
    expect(last.invested).toBe(r.invested);
    expect(last.value).toBeCloseTo(r.value, 6);
    for (let i = 1; i < r.years.length; i++) expect(r.years[i].grams).toBeGreaterThan(r.years[i - 1].grams);
  });
});

describe('XIRR from typed rows', () => {
  it('reads ISO dates and rejects impossible ones', () => {
    expect(isoToDay('1970-01-02')).toBe(1);
    expect(isoToDay('2024-02-29')).not.toBeNull();
    expect(isoToDay('2023-02-29')).toBeNull();
    expect(isoToDay('2023-13-01')).toBeNull();
    expect(isoToDay('01-01-2023')).toBeNull();
  });
  it('one investment that grows 10% in 365 days has an XIRR of 10%', () => {
    const r = xirrOf([{ date: '2023-01-01', amount: 100_000, kind: 'in' }], 110_000, '2024-01-01');
    expect(r.rate).toBeCloseTo(0.1, 6);
    expect(r.invested).toBe(100_000);
    expect(r.gain).toBe(10_000);
    expect(r.days).toBe(365);
    expect(r.problem).toBeNull();
  });
  it('several investments: the rate makes the present value of all flows zero', () => {
    const rows = [
      { date: '2022-01-10', amount: 50_000, kind: 'in' as const },
      { date: '2023-01-10', amount: 50_000, kind: 'in' as const },
      { date: '2024-01-10', amount: 50_000, kind: 'in' as const },
    ];
    const r = xirrOf(rows, 200_000, '2025-01-10');
    const rate = r.rate!;
    const d0 = isoToDay('2022-01-10')!;
    const pv = rows.reduce((s, x) => s - x.amount / (1 + rate) ** ((isoToDay(x.date)! - d0) / 365), 0) + 200_000 / (1 + rate) ** ((isoToDay('2025-01-10')! - d0) / 365);
    expect(pv).toBeCloseTo(0, 3);
    expect(rate).toBeGreaterThan(0.1);
  });
  it('a withdrawal counts as money received', () => {
    const r = xirrOf([{ date: '2023-01-01', amount: 100_000, kind: 'in' }, { date: '2023-07-01', amount: 20_000, kind: 'out' }], 90_000, '2024-01-01');
    expect(r.received).toBe(110_000);
    expect(r.rate).toBeGreaterThan(0.1);
  });
  it('a loss gives a negative rate', () => {
    expect(xirrOf([{ date: '2023-01-01', amount: 100_000, kind: 'in' }], 90_000, '2024-01-01').rate).toBeCloseTo(-0.1, 6);
  });
  it('says why there is no answer', () => {
    expect(xirrOf([{ date: '2023-01-01', amount: 100_000, kind: 'in' }], 110_000, '2022-01-01').problem).toBe('order');
    expect(xirrOf([{ date: '2023-01-01', amount: 100_000, kind: 'in' }], 110_000, '2023-01-01').problem).toBe('order');
    expect(xirrOf([{ date: 'nope', amount: 100_000, kind: 'in' }], 110_000, '2024-01-01').problem).toBe('date');
    expect(xirrOf([], 110_000, '2024-01-01').problem).toBe('empty');
    expect(xirrOf([{ date: '2023-01-01', amount: 100_000, kind: 'in' }], 0, '2024-01-01').problem).toBe('empty');
  });
  it('rows with a zero amount are ignored', () => {
    const a = xirrOf([{ date: '2023-01-01', amount: 100_000, kind: 'in' }, { date: 'bad', amount: 0, kind: 'in' }], 110_000, '2024-01-01');
    expect(a.rate).toBeCloseTo(0.1, 6);
  });
});
