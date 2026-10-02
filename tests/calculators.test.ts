import { describe, expect, it } from 'vitest';
import { cagrBetween, lumpsumProjection, monthlyRate, requiredSip, sipProjection, swpProjection } from '../src/lib/calculators.ts';
import { sipReturn, xirr } from '../src/lib/calc/index.ts';
import { daily } from './helpers.ts';

describe('monthlyRate (market convention: annual / 12)', () => {
  it('12% a year is 1% a month, which compounds to 12.68% effective over a year', () => {
    expect(monthlyRate(0.12)).toBe(0.01);
    expect(Math.pow(1 + monthlyRate(0.12), 12)).toBeCloseTo(1.126825, 6);
    expect(monthlyRate(0)).toBe(0);
  });
});

describe('sipProjection', () => {
  it('0% return: value equals invested, and the breakdown has one row per year', () => {
    const r = sipProjection(5000, 0, 3);
    expect(r.invested).toBe(180_000);
    expect(r.value).toBeCloseTo(180_000, 6);
    expect(r.years.map((y) => y.year)).toEqual([1, 2, 3]);
    expect(r.years[1].invested).toBe(120_000);
  });
  it('hand calc: 1,000 a month for 1 year at 12%: 1000 x ((1.01^12 - 1) / 0.01) x 1.01 = 12,809.33', () => {
    // 1.01^12 = 1.12682503; (1.12682503 - 1) / 0.01 = 12.682503; x 1.01 = 12.809328
    expect(sipProjection(1000, 0.12, 1).value).toBeCloseTo(12_809.33, 1);
  });
  it('10,000 a month for 10 years at 12% is about 23.23 lakh, the figure other Indian SIP calculators show', () => {
    const i = 0.01;
    const closed = 10_000 * ((Math.pow(1 + i, 120) - 1) / i) * (1 + i);
    expect(sipProjection(10_000, 0.12, 10).value).toBeCloseTo(closed, 4);
    expect(sipProjection(10_000, 0.12, 10).value).toBeGreaterThan(2_300_000);
    expect(sipProjection(10_000, 0.12, 10).value).toBeLessThan(2_340_000);
  });
  it('step-up: instalment grows each year; invested total is the geometric sum', () => {
    const r = sipProjection(1000, 0.1, 3, 0.1);
    expect(r.invested).toBeCloseTo(12 * (1000 + 1100 + 1210), 6);
    expect(r.value).toBeGreaterThan(sipProjection(1000, 0.1, 3).value);
  });
  it('is consistent with the XIRR engine: XIRR of the cash flows is the effective annual rate, 1.01^12 - 1 = 12.68%', () => {
    // Build the same cash flows (start of each month) and let xirr() recover the rate.
    const flows = [] as { day: number; amount: number }[];
    const proj = sipProjection(1000, 0.12, 2);
    for (let m = 0; m < 24; m++) flows.push({ day: Math.round(m * 365 / 12), amount: -1000 });
    flows.push({ day: Math.round(24 * 365 / 12), amount: proj.value });
    expect(xirr(flows)).toBeCloseTo(0.126825, 3);
  });
  it('matches the SIP-return calculation used for funds when the NAV grows at the same rate', () => {
    // A NAV compounding at exactly 12%/yr: a 36-month historical SIP has XIRR of about 12%.
    const nav = daily('2022-01-01', 1600, (i) => 10 * Math.pow(1.12, i / 365));
    expect(sipReturn(nav, 36)?.xirr).toBeCloseTo(0.12, 2);
  });
});

describe('lumpsumProjection', () => {
  it('100,000 at 10% for 2 years is 121,000', () => {
    const r = lumpsumProjection(100_000, 0.1, 2);
    expect(r.value).toBeCloseTo(121_000, 6);
    expect(r.gain).toBeCloseTo(21_000, 6);
    expect(r.years.map((y) => Math.round(y.value))).toEqual([110_000, 121_000]);
  });
  it('fractional years compound exactly', () => {
    expect(lumpsumProjection(1000, 0.1, 0.5).value).toBeCloseTo(1000 * Math.sqrt(1.1), 8);
  });
});

describe('requiredSip', () => {
  it('feeding the answer back into sipProjection reaches the target', () => {
    const sip = requiredSip(5_000_000, 0.12, 15);
    expect(sipProjection(sip, 0.12, 15).value).toBeCloseTo(5_000_000, 3);
  });
  it('0% return needs target / months', () => {
    expect(requiredSip(120_000, 0, 1)).toBeCloseTo(10_000, 8);
  });
});

describe('swpProjection', () => {
  it('0% return: 12 lakh corpus, 10,000 a month lasts exactly 10 years', () => {
    const r = swpProjection(1_200_000, 10_000, 0, 10);
    expect(r.totalWithdrawn).toBeCloseTo(1_200_000, 6);
    expect(r.finalBalance).toBeCloseTo(0, 6);
    expect(r.lastedFullTerm).toBe(true);
  });
  it('runs out: 1 lakh, 10,000/month, 0% return, asked for 2 years -> 10 payments, then stops', () => {
    const r = swpProjection(100_000, 10_000, 0, 2);
    expect(r.totalWithdrawn).toBeCloseTo(100_000, 6);
    expect(r.monthsLasted).toBe(10);
    expect(r.lastedFullTerm).toBe(false);
    expect(r.years[1].balance).toBe(0);
  });
  it('withdrawing only the monthly growth keeps the corpus intact', () => {
    const corpus = 1_000_000;
    const growth = corpus * monthlyRate(0.12);
    const r = swpProjection(corpus, growth, 0.12, 5);
    expect(r.finalBalance).toBeCloseTo(corpus, 4);
  });
  it('a high return outlasts the term and leaves a balance', () => {
    const r = swpProjection(1_000_000, 5_000, 0.1, 10);
    expect(r.lastedFullTerm).toBe(true);
    expect(r.finalBalance).toBeGreaterThan(1_000_000);
  });
});

describe('cagrBetween', () => {
  it('100 -> 200 in 5 years is 14.87%', () => {
    expect(cagrBetween(100, 200, 5)).toBeCloseTo(0.14870, 4);
  });
  it('rejects invalid input; allows a total loss', () => {
    expect(cagrBetween(0, 10, 5)).toBeNull();
    expect(cagrBetween(10, 20, 0)).toBeNull();
    expect(cagrBetween(10, 0, 5)).toBe(-1);
  });
});
