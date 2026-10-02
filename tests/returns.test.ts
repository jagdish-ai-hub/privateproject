import { describe, expect, it } from 'vitest';
import { cagr, navOnOrBefore, periodReturn, sinceInception } from '../src/lib/calc/index.ts';
import { iso, series } from './helpers.ts';

describe('cagr', () => {
  it('10% a year over two years', () => {
    expect(cagr(100, 121, 730)).toBeCloseTo(0.1, 10);
  });
  it('rejects invalid input', () => {
    expect(cagr(0, 10, 365)).toBeNull();
    expect(cagr(10, 10, 0)).toBeNull();
  });
});

describe('navOnOrBefore', () => {
  const s = series([['2026-01-02', 10], ['2026-01-20', 11]]);
  it('uses the previous NAV across a weekend/holiday gap', () => {
    expect(navOnOrBefore(s, iso('2026-01-05'))?.nav).toBe(10);
  });
  it('returns null when the nearest NAV is more than 7 days old', () => {
    expect(navOnOrBefore(s, iso('2026-01-12'))).toBeNull();
  });
  it('returns null before the first NAV', () => {
    expect(navOnOrBefore(s, iso('2025-12-31'))).toBeNull();
  });
});

describe('periodReturn', () => {
  it('1Y exact: 100 -> 110 over 365 days is 10.00% CAGR', () => {
    const s = series([['2025-10-01', 100], ['2026-10-01', 110]]);
    const r = periodReturn(s, 12);
    expect(r?.value).toBeCloseTo(0.1, 10);
    expect(r?.annualised).toBe(true);
  });
  it('uses actual days when the start falls on a holiday (hand-calc 0.09943)', () => {
    // target 2025-10-01 missing, NAV on 2025-09-29 is used: 367 days. 1.1^(365/367) - 1
    const s = series([['2025-09-29', 100], ['2026-10-01', 110]]);
    expect(periodReturn(s, 12)?.value).toBeCloseTo(0.09943, 4);
  });
  it('is null when the start NAV is stale (> 7 days before the target)', () => {
    const s = series([['2025-09-20', 100], ['2026-10-01', 110]]);
    expect(periodReturn(s, 12)).toBeNull();
  });
  it('is null for a fund younger than the period, never a partial figure', () => {
    const s = series([['2026-03-01', 100], ['2026-10-01', 130]]);
    expect(periodReturn(s, 12)).toBeNull();
    expect(periodReturn(s, 36)).toBeNull();
  });
  it('under 12 months is an absolute return', () => {
    const s = series([['2026-07-01', 100], ['2026-10-01', 105]]);
    const r = periodReturn(s, 3);
    expect(r?.value).toBeCloseTo(0.05, 12);
    expect(r?.annualised).toBe(false);
  });
  it('leap day: 29 Feb 2024 looks back to 28 Feb 2023 (366 days)', () => {
    const s = series([['2023-02-28', 100], ['2024-02-29', 110]]);
    expect(periodReturn(s, 12)?.value).toBeCloseTo(0.0997, 3);
  });
  it('needs at least two points', () => {
    expect(periodReturn(series([['2026-10-01', 100]]), 12)).toBeNull();
  });
});

describe('sinceInception', () => {
  it('is absolute under a year and CAGR from a year', () => {
    const young = series([['2026-04-01', 100], ['2026-10-01', 110]]);
    expect(sinceInception(young)).toMatchObject({ annualised: false });
    expect(sinceInception(young)?.value).toBeCloseTo(0.1, 12);
    const old = series([['2024-10-01', 100], ['2026-10-01', 121]]);
    expect(sinceInception(old)?.value).toBeCloseTo(0.1, 3);
  });
});
