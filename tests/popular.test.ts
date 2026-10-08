import { describe, expect, it } from 'vitest';
import { popularPairs } from '../src/lib/popular.ts';
import { makeData } from './screener-helpers.ts';

describe('popularPairs', () => {
  const data = makeData([
    { name: 'Alpha Flexi Cap Fund - Direct Plan - Growth', category: 'Flexi Cap', aum: 500 },
    { name: 'Beta Flexi Cap Fund - Direct Plan - Growth', category: 'Flexi Cap', aum: 9000 },
    { name: 'Gamma Flexi Cap Fund - Direct Plan - Growth', category: 'Flexi Cap', aum: 4000 },
    { name: 'Delta Flexi Cap Fund - Regular Plan - Growth', category: 'Flexi Cap', plan: 'regular', aum: 99999 },
    { name: 'Solo Large Cap Fund - Direct Plan - Growth', category: 'Large Cap', aum: 100 },
    { name: 'No Size Mid Cap A - Direct Plan - Growth', category: 'Mid Cap', aum: null },
    { name: 'No Size Mid Cap B - Direct Plan - Growth', category: 'Mid Cap', aum: null },
  ]);
  it('takes the two largest Direct Growth funds by size, largest first, and ignores Regular plans', () => {
    const [p] = popularPairs(data, ['Flexi Cap']);
    expect(p.a.name).toBe('Beta Flexi Cap Fund');
    expect(p.b.name).toBe('Gamma Flexi Cap Fund');
  });
  it('drops parenthetical notes from the label but keeps the real code', () => {
    const d = makeData([
      { name: 'Old Name Fund (erstwhile Other Fund) - Direct Plan - Growth', category: 'Large Cap', aum: 20 },
      { name: 'Plain Fund - Direct Plan - Growth', category: 'Large Cap', aum: 10 },
    ]);
    const [p] = popularPairs(d, ['Large Cap']);
    expect(p.a.name).toBe('Old Name Fund');
    expect(d.code).toContain(p.a.code);
  });
  it('skips categories with fewer than two funds, with no known size, or that do not exist', () => {
    expect(popularPairs(data, ['Large Cap', 'Mid Cap', 'Nonexistent'])).toEqual([]);
  });
  it('keeps the order asked for and links real scheme codes', () => {
    const r = popularPairs(data, ['Flexi Cap']);
    expect(data.code).toContain(r[0].a.code);
    expect(data.code).toContain(r[0].b.code);
  });
});
