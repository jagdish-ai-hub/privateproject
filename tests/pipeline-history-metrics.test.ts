import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ANCHOR_MONTHS, chartSeries, OLD_POINTS } from '../scripts/pipeline/chart.ts';
import { periodReturn } from '../src/lib/calc/index.ts';
import { afterEach, vi } from 'vitest';
import { createRateLimiter, fetchJson, FileHistoryStore, getHistory, MemoryHistoryStore, mergeSeries, pool, readCache, writeCache } from '../scripts/pipeline/history.ts';
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
  it('getHistory appends the AMFI latest NAV with no network call when the store is 1-5 days behind', async () => {
    const store = new MemoryHistoryStore();
    store.set(1, series([['2026-09-29', 10], ['2026-09-30', 11]]));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const s = await getHistory(1, store, { day: iso('2026-10-01'), nav: 12 });
    expect(s?.navs).toEqual([10, 11, 12]);
    expect(store.get(1)?.navs).toEqual([10, 11, 12]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('getHistory returns the stored copy untouched when it is already current (no fetch)', async () => {
    const store = new MemoryHistoryStore();
    store.set(1, series([['2026-09-30', 11], ['2026-10-01', 12]]));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect((await getHistory(1, store, { day: iso('2026-10-01'), nav: 12 }))?.navs).toEqual([11, 12]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('first sight of a scheme downloads once, stores it, and the next call hits the store (cache hit)', async () => {
    const store = new MemoryHistoryStore();
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ status: 'SUCCESS', data: [{ date: '01-10-2026', nav: '12' }, { date: '30-09-2026', nav: '11' }] })));
    vi.stubGlobal('fetch', fetchSpy);
    await getHistory(7, store, { day: iso('2026-10-01'), nav: 12 });
    await getHistory(7, store, { day: iso('2026-10-01'), nav: 12 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(store.get(7)?.navs).toEqual([11, 12]);
  });
  it('FileHistoryStore is a drop-in HistoryStore backed by files', () => {
    const store = new FileHistoryStore(join(tmp, 'store'));
    expect(store.get(5)).toBeNull();
    store.set(5, series([['2026-01-01', 1]]));
    expect(store.get(5)?.navs).toEqual([1]);
  });
});

describe('rate limiting', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('limiter spaces request starts at least the interval apart, even when called concurrently', async () => {
    const limiter = createRateLimiter(30);
    const starts: number[] = [];
    await Promise.all(Array.from({ length: 5 }, async () => { await limiter.wait(); starts.push(Date.now()); }));
    starts.sort((a, b) => a - b);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(25);
  });
  it('a limiter of 0 never waits', async () => {
    const t0 = Date.now();
    const l = createRateLimiter(0);
    for (let i = 0; i < 20; i++) await l.wait();
    expect(Date.now() - t0).toBeLessThan(50);
  });
  it('on HTTP 429 it honours Retry-After, retries, and then succeeds', async () => {
    const calls: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls.push(Date.now());
      return calls.length === 1 ? new Response('slow down', { status: 429, headers: { 'retry-after': '0' } }) : new Response('{"ok":true}');
    }));
    expect(await fetchJson<{ ok: boolean }>('https://x.test/a', { retries: 2 })).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });
  it('gives up with an error after the retries are used up', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    await expect(fetchJson('https://x.test/b', { retries: 1 })).rejects.toThrow(/503/);
  });
  it('a permanent 404 returns null without retrying', async () => {
    const spy = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', spy);
    expect(await fetchJson('https://x.test/c')).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
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
    expect(out.days.length).toBeLessThanOrEqual(OLD_POINTS + recentIn + ANCHOR_MONTHS.length);
  });
  it('chart and returns table agree: periodReturn on the thinned series equals the full series for every standard period', () => {
    // A wiggly 11-year series so LTTB really drops points near the anchors.
    const wiggly = daily('2015-10-01', 4000, (i) => 100 + i * 0.03 + 8 * Math.sin(i / 9) + 5 * Math.sin(i / 37));
    const thin = chartSeries(wiggly);
    expect(thin.days.length).toBeLessThan(wiggly.days.length / 2);
    for (const m of ANCHOR_MONTHS) {
      const full = periodReturn(wiggly, m);
      expect(full, `${m}M computable`).not.toBeNull();
      expect(periodReturn(thin, m)?.value, `${m}M`).toBe(full?.value);
    }
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
