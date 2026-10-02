import { describe, expect, it } from 'vitest';
import { indexOnOrAfter, indexOnOrBefore, parseSeries } from '../src/lib/calc/index.ts';
import { iso, series } from './helpers.ts';

describe('parseSeries', () => {
  it('sorts ascending even though MFapi sends newest first', () => {
    const s = parseSeries([
      { date: '03-01-2026', nav: '12.0' },
      { date: '01-01-2026', nav: '10.0' },
      { date: '02-01-2026', nav: '11.0' },
    ]);
    expect(s.navs).toEqual([10, 11, 12]);
    expect(s.days).toEqual([iso('2026-01-01'), iso('2026-01-02'), iso('2026-01-03')]);
  });
  it('drops duplicates (last wins), bad dates, NAV <= 0 and non-numeric NAV', () => {
    const s = parseSeries([
      { date: '01-01-2026', nav: '10' },
      { date: '01-01-2026', nav: '10.5' },
      { date: '31-02-2026', nav: '9' },
      { date: '02-01-2026', nav: '0' },
      { date: '03-01-2026', nav: '-4' },
      { date: '04-01-2026', nav: 'N.A.' },
    ]);
    expect(s.navs).toEqual([10.5]);
  });
  it('returns an empty series for empty input', () => {
    expect(parseSeries([])).toEqual({ days: [], navs: [] });
  });
});

describe('index search', () => {
  const s = series([['2026-01-01', 1], ['2026-01-05', 2], ['2026-01-09', 3]]);
  it('on or before', () => {
    expect(indexOnOrBefore(s, iso('2025-12-31'))).toBe(-1);
    expect(indexOnOrBefore(s, iso('2026-01-05'))).toBe(1);
    expect(indexOnOrBefore(s, iso('2026-01-08'))).toBe(1);
    expect(indexOnOrBefore(s, iso('2026-02-01'))).toBe(2);
  });
  it('on or after', () => {
    expect(indexOnOrAfter(s, iso('2025-12-31'))).toBe(0);
    expect(indexOnOrAfter(s, iso('2026-01-06'))).toBe(2);
    expect(indexOnOrAfter(s, iso('2026-01-10'))).toBe(-1);
  });
});
