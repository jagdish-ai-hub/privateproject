import { describe, expect, it } from 'vitest';
import { defaultWindow, rebase } from '../src/lib/compare.ts';
import { periodReturn } from '../src/lib/calc/index.ts';
import { daily, iso, series } from './helpers.ts';

const fund = (code: number, s: ReturnType<typeof series>) => ({ code, ...s });

describe('rebase', () => {
  const a = fund(1, series([['2025-10-01', 100], ['2026-04-01', 110], ['2026-10-01', 120]]));
  const b = fund(2, series([['2025-10-01', 50], ['2026-04-01', 45], ['2026-10-01', 60]]));

  it('starts every line at exactly 100 on the same day', () => {
    const r = rebase([a, b], 12);
    expect(r?.startDay).toBe(iso('2025-10-01'));
    expect(r?.lines.map((l) => l.values[0])).toEqual([100, 100]);
    expect(r?.lines.map((l) => l.days[0])).toEqual([iso('2025-10-01'), iso('2025-10-01')]);
  });
  it('hand-calculated values: A 110/100 -> 110, B 45/50 -> 90, end 120 and 120', () => {
    const r = rebase([a, b], 12);
    expect(r?.lines[0].values[0]).toBe(100);
    expect(r?.lines[0].values[1]).toBeCloseTo(110, 10);
    expect(r?.lines[0].values[2]).toBeCloseTo(120, 10);
    expect(r?.lines[1].values[1]).toBeCloseTo(90, 10);
    expect(r?.lines[1].values[2]).toBeCloseTo(120, 10);
    expect(r?.lines[0].change).toBeCloseTo(0.2, 10);
  });
  it('the chart change for a fund equals the absolute-return maths for the same window', () => {
    const r = rebase([a, b], 12);
    // 12-month absolute change from the same NAVs: 120/100 - 1. periodReturn gives CAGR over 365 days = same here.
    expect(r?.lines[0].change).toBeCloseTo(periodReturn(a, 12)?.value as number, 10);
  });
  it('cuts all lines at the earliest latest-NAV date so a fund that updated later does not look better', () => {
    // a (daily) has a NAV on 2026-10-01; `lagging` stops on 2026-09-30.
    const dailyA = fund(1, daily('2026-01-01', 275, (i) => 100 + i)); // 2026-01-01 .. 2026-10-02
    const lagging = fund(3, daily('2026-01-01', 272, (i) => 10 + i * 0.1)); // .. 2026-09-29
    const r = rebase([dailyA, lagging], 6);
    expect(r?.endDay).toBe(lagging.days[lagging.days.length - 1]);
    const lastA = r?.lines[0].days[(r?.lines[0].days.length ?? 1) - 1];
    expect(lastA).toBe(r?.endDay);
  });
  it('is null when any fund is too young for the window (no partial comparison)', () => {
    const young = fund(4, daily('2026-06-01', 120, (i) => 10 + i * 0.01));
    expect(rebase([a, young], 36)).toBeNull();
    expect(rebase([a, young], 12)).toBeNull();
  });
  it('Max uses the longest window all funds share (latest first date)', () => {
    const young = fund(4, daily('2026-06-01', 122, (i) => 10 + i * 0.01));
    const full = fund(1, daily('2025-01-01', 640, (i) => 100 + i * 0.1));
    const r = rebase([full, young], 0);
    expect(r?.startDay).toBe(iso('2026-06-01'));
    expect(r?.lines.every((l) => l.values[0] === 100)).toBe(true);
  });
  it('uses the last NAV on or before the start day when the start is a holiday', () => {
    const c = fund(5, series([['2025-09-29', 200], ['2026-10-01', 220]]));
    const r = rebase([c, { code: 6, ...series([['2025-10-01', 5], ['2026-10-01', 6]]) }], 12);
    expect(r?.lines[0].values[0]).toBe(100);
    expect(r?.lines[0].values[1]).toBeCloseTo(110, 10);
  });
  it('is null for empty or single-point input', () => {
    expect(rebase([], 12)).toBeNull();
    expect(rebase([fund(1, series([['2026-10-01', 1]]))], 12)).toBeNull();
  });
});

describe('defaultWindow', () => {
  it('picks the longest window every fund supports', () => {
    const old = fund(1, daily('2016-01-01', 3800, (i) => 10 + i * 0.01));
    const mid = fund(2, daily('2023-03-01', 1300, (i) => 10 + i * 0.01));
    expect(defaultWindow([old, mid])).toBe(36);
    expect(defaultWindow([old, old])).toBe(60);
  });
});
