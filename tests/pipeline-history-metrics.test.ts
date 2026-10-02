import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { chartSeries, OLD_POINTS } from '../scripts/pipeline/chart.ts';
import { getHistory, mergeSeries, pool, readCache, writeCache } from '../scripts/pipeline/history.ts';
import { computeMetrics, rankDescending } from '../scripts/pipeline/metrics.ts';
import { daily, iso, series } from './helpers.ts';

const tmp = mkdtempSync(join(tmpdir(), 'mfs-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('cache + merge', () => {
  it('round-trips a series through the gzip cache', () => {
    const s = series([['2026-01-01', 10.1234], ['2026-01-02', 10.2]]);
    writeCache(join(tmp, 'a.json.gz'), s);
    expect(readCache(join(tmp, 'a.json.gz'))).toEqual(s);
    expect(readCache(join(tmp, 'missing.json.gz'))).toBeNull();
  });
  it('merge: new points win on the same day and the result stays sorted', () => {
    const m = mergeSeries(series([['2026-01-01', 1], ['2026-01-03', 3]]), series([['2026-01-02', 2], ['2026-01-03', 33]]));
    expect(m.navs).toEqual([1, 2, 33]);
    expect(m.days).toEqual([iso('2026-01-01'), iso('2026-01-02'), iso('2026-01-03')]);
  });
  it('getHistory appends the AMFI latest NAV with no network call when the cache is 1-5 days behind', async () => {
    const path = join(tmp, 'b.json.gz');
    writeCache(path, series([['2026-09-29', 10], ['2026-09-30', 11]]));
    const s = await getHistory(1, path, { day: iso('2026-10-01'), nav: 12 });
    expect(s?.navs).toEqual([10, 11, 12]);
    expect(readCache(path)?.navs).toEqual([10, 11, 12]);
  });
  it('getHistory returns the cache untouched when it is already current', async () => {
    const path = join(tmp, 'c.json.gz');
    writeCache(path, series([['2026-09-30', 11], ['2026-10-01', 12]]));
    const s = await getHistory(1, path, { day: iso('2026-10-01'), nav: 12 });
    expect(s?.navs).toEqual([11, 12]);
  });
});

describe('pool', () => {
  it('never exceeds the concurrency limit, keeps result order, and collects errors', async () => {
    let inFlight = 0;
    let peak = 0;
    const { results, errors } = await pool([1, 2, 3, 4, 5, 6, 7, 8], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      if (n === 4) throw new Error('boom');
      return n * 10;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(results).toEqual([10, 20, 30, undefined, 50, 60, 70, 80]);
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(3);
  });
});

describe('chartSeries', () => {
  const long = daily('2016-01-01', 3800, (i) => 100 + i * 0.05);
  const out = chartSeries(long);
  it('keeps the last year at full daily resolution and thins the older part', () => {
    const lastYearStart = long.days[long.days.length - 1] - 366;
    const recentIn = long.days.filter((d) => d >= lastYearStart).length;
    const recentOut = out.days.filter((d) => d >= lastYearStart).length;
    expect(recentOut).toBe(recentIn);
    expect(out.days.length).toBeLessThanOrEqual(OLD_POINTS + recentIn);
  });
  it('keeps the first and last points and stays strictly ascending with no duplicates', () => {
    expect(out.days[0]).toBe(long.days[0]);
    expect(out.days[out.days.length - 1]).toBe(long.days[long.days.length - 1]);
    for (let i = 1; i < out.days.length; i++) expect(out.days[i]).toBeGreaterThan(out.days[i - 1]);
  });
  it('returns short histories unchanged', () => {
    const short = daily('2026-01-01', 200, (i) => 10 + i);
    expect(chartSeries(short)).toBe(short);
  });
});

describe('rankDescending / computeMetrics', () => {
  it('ranks 1 = highest, ignores nulls as peers', () => {
    expect(rankDescending([10, 30, 20, null])).toEqual([
      { rank: 3, of: 3 }, { rank: 1, of: 3 }, { rank: 2, of: 3 }, { rank: null, of: 3 },
    ]);
  });
  it('ties share the better rank', () => {
    expect(rankDescending([5, 5, 1]).map((r) => r.rank)).toEqual([1, 1, 3]);
  });
  it('a 4-month-old fund has short-period metrics only; every long metric is null', () => {
    const m = computeMetrics(daily('2026-06-01', 123, (i) => 10 + i * 0.01));
    expect(m.r1m).not.toBeNull();
    expect(m.r3m).not.toBeNull();
    for (const k of ['r6m', 'r1y', 'r3y', 'r5y', 'r10y', 'sip1y', 'sip3y', 'sip5y', 'vol3y', 'roll1yPos'] as const) {
      expect(m[k], k).toBeNull();
    }
    expect(m.rInc).not.toBeNull();
  });
});
