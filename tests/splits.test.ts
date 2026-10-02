import { describe, expect, it } from 'vitest';
import { adjustForSplits, periodReturn, removeSpikes } from '../src/lib/calc/index.ts';
import { daily, iso, series } from './helpers.ts';

describe('adjustForSplits', () => {
  it('leaves an ordinary series untouched (same object)', () => {
    const s = daily('2026-01-01', 50, (i) => 10 + i * 0.1);
    const r = adjustForSplits(s);
    expect(r.series).toBe(s);
    expect(r.splits).toEqual([]);
    expect(r.breaks).toEqual([]);
    expect(r.trimmed).toBe(false);
  });

  it('10-for-1 split with a +0.5% market move: older NAVs divided by exactly 10', () => {
    const s = series([['2026-07-29', 1000], ['2026-07-30', 1000], ['2026-07-31', 100.5], ['2026-08-01', 101]]);
    const r = adjustForSplits(s);
    expect(r.splits).toEqual([{ day: iso('2026-07-31'), factor: 10 }]);
    expect(r.series.navs).toEqual([100, 100, 100.5, 101]);
    expect(r.series.days).toEqual(s.days);
    // the NAV after the split (latest) is never changed
    expect(r.series.navs[3]).toBe(101);
  });

  it('the real-market move across the split day is preserved (not 0, not -90%)', () => {
    const s = series([['2026-07-30', 2787.79], ['2026-07-31', 279.60]]);
    const r = adjustForSplits(s).series;
    expect(r.navs[1] / r.navs[0] - 1).toBeCloseTo(0.00292, 4); // 279.60 / 278.779 - 1
  });

  it('a one-year return across a 10:1 split is the real return, not -90%', () => {
    const s = series([['2025-10-01', 1000], ['2026-04-01', 1100], ['2026-04-02', 110.5], ['2026-10-01', 121]]);
    expect(periodReturn(s, 12)?.value).toBeCloseTo(-0.879, 2); // unadjusted: the bug
    expect(periodReturn(adjustForSplits(s).series, 12)?.value).toBeCloseTo(0.21, 2); // 100 -> 121
  });

  it('exact liquid-fund style 1000 -> 100 split', () => {
    const r = adjustForSplits(series([['2026-06-19', 1065.3], ['2026-06-20', 106.53]]));
    expect(r.series.navs[0]).toBeCloseTo(106.53, 10);
  });

  it('handles several splits (10:1 then 2:1) cumulatively', () => {
    const s = series([['2026-01-01', 2000], ['2026-02-01', 200], ['2026-03-01', 100]]);
    const r = adjustForSplits(s);
    expect(r.splits.map((x) => x.factor)).toEqual([10, 2]);
    expect(r.series.navs).toEqual([100, 100, 100]);
  });

  it('a consolidation (NAV x10) is adjusted the other way', () => {
    const r = adjustForSplits(series([['2026-01-01', 10], ['2026-01-02', 101]]));
    expect(r.splits[0].factor).toBeCloseTo(0.1, 10);
    expect(r.series.navs[0]).toBeCloseTo(100, 10);
  });

  it('an unexplained -60% jump is a break: history before it is dropped', () => {
    const s = series([['2026-01-01', 100], ['2026-01-02', 101], ['2026-01-03', 40], ['2026-01-04', 41]]);
    const r = adjustForSplits(s);
    expect(r.breaks).toEqual([{ day: iso('2026-01-03'), ratio: 40 / 101 }]);
    expect(r.series.days).toEqual([iso('2026-01-03'), iso('2026-01-04')]);
    expect(r.series.navs).toEqual([40, 41]);
    expect(r.trimmed).toBe(true);
    expect(periodReturn(r.series, 12)).toBeNull();
  });

  it('a split before a break is dropped with the rest of the old history; a split after it is applied', () => {
    const s = series([
      ['2026-01-01', 1000], ['2026-01-02', 100], ['2026-01-03', 40], ['2026-01-04', 400], ['2026-01-05', 41],
    ]);
    // 1000->100 split (x10), 100->40 break (x0.4), 40->400 consolidation (x10), 400->41 split
    const r = adjustForSplits(s);
    expect(r.trimmed).toBe(true);
    expect(r.series.days[0]).toBe(iso('2026-01-03'));
    expect(r.series.navs.every((v) => Number.isFinite(v) && v > 0)).toBe(true);
  });

  it('ordinary big-but-plausible days (-25%, +30%) are not touched', () => {
    const s = series([['2026-01-01', 100], ['2026-01-02', 75], ['2026-01-03', 97.5]]);
    expect(adjustForSplits(s).series).toBe(s);
  });
});

describe('removeSpikes (one-day data glitches)', () => {
  it('drops a point that crashes 40% and fully reverts next day, and keeps all other history', () => {
    // mirrors the Nippon India IDCW rows on 2026-04-01: x0.64 then x1.59
    const s = series([['2026-03-30', 100], ['2026-03-31', 101], ['2026-04-01', 64.6], ['2026-04-02', 102], ['2026-04-03', 103]]);
    const r = adjustForSplits(s);
    expect(r.spikes).toEqual([iso('2026-04-01')]);
    expect(r.series.navs).toEqual([100, 101, 102, 103]);
    expect(r.breaks).toEqual([]);
    expect(r.trimmed).toBe(false);
  });
  it('drops an upward glitch too', () => {
    const r = removeSpikes(series([['2026-01-01', 10], ['2026-01-02', 18], ['2026-01-03', 10.1]]));
    expect(r.spikes).toEqual([iso('2026-01-02')]);
    expect(r.series.navs).toEqual([10, 10.1]);
  });
  it('a permanent level shift is not a spike (no reversal)', () => {
    const r = removeSpikes(series([['2026-01-01', 100], ['2026-01-02', 60], ['2026-01-03', 60.5]]));
    expect(r.spikes).toEqual([]);
  });
  it('a split is not a spike, and the series object is returned unchanged when nothing is removed', () => {
    const s = series([['2026-01-01', 1000], ['2026-01-02', 100], ['2026-01-03', 100.2]]);
    expect(removeSpikes(s).series).toBe(s);
  });
  it('never removes the first or last point', () => {
    const s = series([['2026-01-01', 50], ['2026-01-02', 100], ['2026-01-03', 101]]);
    expect(removeSpikes(s).series.days[0]).toBe(iso('2026-01-01'));
    const t = series([['2026-01-01', 100], ['2026-01-02', 101], ['2026-01-03', 40]]);
    expect(removeSpikes(t).series.days).toEqual(t.days);
  });
});
