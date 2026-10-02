import { describe, expect, it } from 'vitest';
import { sipReturn, xirr } from '../src/lib/calc/index.ts';
import { daily, iso, series } from './helpers.ts';

describe('xirr', () => {
  it('single investment grows 10% in 365 days', () => {
    expect(xirr([{ day: 0, amount: -100 }, { day: 365, amount: 110 }])).toBeCloseTo(0.1, 8);
  });
  it('1210 after two years from 1000 is 10%', () => {
    expect(xirr([{ day: 0, amount: -1000 }, { day: 730, amount: 1210 }])).toBeCloseTo(0.1, 8);
  });
  it('hand-built multi-flow case: -100, -100 a year later, +231 a year after that is 10%', () => {
    expect(xirr([
      { day: 0, amount: -100 }, { day: 365, amount: -100 }, { day: 730, amount: 231 },
    ])).toBeCloseTo(0.1, 8);
  });
  it('handles negative returns', () => {
    expect(xirr([{ day: 0, amount: -100 }, { day: 365, amount: 90 }])).toBeCloseTo(-0.1, 8);
  });
  it('is null without both an outflow and an inflow', () => {
    expect(xirr([{ day: 0, amount: -100 }])).toBeNull();
    expect(xirr([{ day: 0, amount: 100 }, { day: 10, amount: 50 }])).toBeNull();
  });
});

describe('sipReturn', () => {
  it('flat NAV gives ~0% and value equals invested', () => {
    const s = daily('2025-01-01', 800, () => 10);
    const r = sipReturn(s, 12, 1000);
    expect(r?.xirr).toBeCloseTo(0, 6);
    expect(r?.invested).toBe(12000);
    expect(r?.value).toBeCloseTo(12000, 6);
    expect(r?.instalments).toBe(12);
  });
  it('hand case: 3 instalments at NAV 10, end NAV 11 -> value 3300 on 3000 invested; XIRR zeroes the NPV', () => {
    const s = series([
      ['2026-07-01', 10], ['2026-08-01', 10], ['2026-09-01', 10], ['2026-10-01', 11],
    ]);
    const r = sipReturn(s, 3, 1000);
    expect(r?.invested).toBe(3000);
    expect(r?.value).toBeCloseTo(3300, 8);
    const rate = r?.xirr as number;
    const d0 = iso('2026-07-01');
    const npv =
      -1000 - 1000 / Math.pow(1 + rate, (iso('2026-08-01') - d0) / 365) -
      1000 / Math.pow(1 + rate, (iso('2026-09-01') - d0) / 365) +
      3300 / Math.pow(1 + rate, (iso('2026-10-01') - d0) / 365);
    expect(Math.abs(npv)).toBeLessThan(1e-6);
    expect(rate).toBeGreaterThan(0);
  });
  it('is null when the fund is younger than the SIP', () => {
    const s = daily('2026-06-01', 120, () => 10);
    expect(sipReturn(s, 12)).toBeNull();
  });
  it('is null when NAV data has a gap larger than 7 days at an instalment date', () => {
    const s = series([['2026-07-01', 10], ['2026-09-20', 10], ['2026-10-01', 11]]);
    expect(sipReturn(s, 3)).toBeNull();
  });
});
