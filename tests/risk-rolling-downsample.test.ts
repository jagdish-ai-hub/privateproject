import { describe, expect, it } from 'vitest';
import { downsample, maxDrawdown, riskStats, rollingReturns } from '../src/lib/calc/index.ts';
import { daily, series } from './helpers.ts';

describe('maxDrawdown', () => {
  it('100,120,90,110 -> -25%', () => {
    expect(maxDrawdown([100, 120, 90, 110])).toBeCloseTo(-0.25, 12);
  });
  it('is 0 for a monotonically rising NAV', () => {
    expect(maxDrawdown([1, 2, 3])).toBe(0);
  });
});

describe('riskStats', () => {
  // 93 daily points 2026-07-01..2026-10-01 -> a 3-month window has exactly 92 returns,
  // alternating +1% / -1% (46 each), so mean = 0 and sample std = 0.01*sqrt(92/91).
  const alt = daily('2026-07-01', 93, (i) => {
    let v = 1;
    for (let k = 1; k <= i; k++) v *= k % 2 === 1 ? 1.01 : 0.99;
    return v;
  });
  const r = riskStats(alt, 3);
  it('volatility = 0.01*sqrt(92/91)*sqrt(252) = 0.1596', () => {
    expect(r?.volatility).toBeCloseTo(0.1596, 4);
  });
  it('sharpe = -rf/vol when the mean return is zero = -0.4072', () => {
    expect(r?.sharpe).toBeCloseTo(-0.4072, 3);
  });
  it('max drawdown = 0.9999^46/1.01 - 1 = -0.01445', () => {
    expect(r?.maxDrawdown).toBeCloseTo(-0.01445, 4);
  });
  it('flat NAV has zero volatility and zero (not NaN) Sharpe', () => {
    const flat = riskStats(daily('2026-01-01', 400, () => 10), 3);
    expect(flat?.volatility).toBe(0);
    expect(flat?.sharpe).toBe(0);
  });
  it('is null when the fund does not reach back through the window', () => {
    expect(riskStats(daily('2026-09-01', 31, () => 10), 36)).toBeNull();
  });
});

describe('rollingReturns', () => {
  it('hand case: 100 -> 110 -> 99 yearly points give two 1Y windows', () => {
    const s = series([['2024-01-01', 100], ['2025-01-01', 110], ['2026-01-01', 99]]);
    const r = rollingReturns(s, 12);
    expect(r?.count).toBe(2);
    expect(r?.min).toBeCloseTo(-0.1, 10);
    expect(r?.max).toBeCloseTo(0.0997, 3); // 1.1^(365/366) - 1 (2024 is a leap year)
    expect(r?.pctPositive).toBe(0.5);
  });
  it('is null when no full window exists', () => {
    expect(rollingReturns(series([['2026-01-01', 100], ['2026-06-01', 110]]), 12)).toBeNull();
  });
});

describe('downsample', () => {
  const big = daily('2020-01-01', 1000, (i) => 100 + i * 0.1 + (i === 500 ? 80 : 0));
  const out = downsample(big, 100);
  it('returns the requested number of points', () => {
    expect(out.days.length).toBe(100);
    expect(out.navs.length).toBe(100);
  });
  it('keeps the first and last points (so range % change is unchanged)', () => {
    expect(out.days[0]).toBe(big.days[0]);
    expect(out.navs[99]).toBe(big.navs[999]);
  });
  it('stays strictly ascending and keeps the spike', () => {
    for (let i = 1; i < out.days.length; i++) expect(out.days[i]).toBeGreaterThan(out.days[i - 1]);
    expect(Math.max(...out.navs)).toBe(Math.max(...big.navs));
  });
  it('returns small series unchanged', () => {
    const small = daily('2026-01-01', 10, (i) => i + 1);
    expect(downsample(small, 100)).toBe(small);
  });
});
