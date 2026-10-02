import { describe, expect, it } from 'vitest';
import { applyView, filterIndices, pageList, prepare, sortIndices } from '../src/lib/screener/query.ts';
import { DEFAULT_VIEW } from '../src/lib/screener/url.ts';
import type { Filters, ViewState } from '../src/lib/screener/types.ts';
import { makeData } from './screener-helpers.ts';

const noFilters: Filters = { q: '', amc: [], assetClass: [], category: [], plan: [], option: [], ranges: {} };
const view = (over: Partial<ViewState> & { filters?: Partial<Filters> } = {}): ViewState => ({
  ...DEFAULT_VIEW,
  ...over,
  filters: { ...noFilters, ...over.filters },
});

const data = makeData([
  { name: 'Alpha Bluechip Fund - Direct Plan - Growth', category: 'Large Cap', m: { r1y: 0.12, r3y: 0.15, sharpe3y: 1.2, mdd3y: -0.2 } },
  { name: 'Alpha Bluechip Fund - Regular Plan - Growth', plan: 'regular', category: 'Large Cap', m: { r1y: 0.1, r3y: 0.13 } },
  { name: 'Beta Small Cap Fund - Direct Plan - Growth', amc: 'Beta Mutual Fund', category: 'Small Cap', m: { r1y: 0.3, r3y: null } },
  { name: 'Beta Small Cap Fund - Direct Plan - IDCW', amc: 'Beta Mutual Fund', category: 'Small Cap', option: 'idcw', m: { r1y: 0.25, r3y: 0.2 } },
  { name: 'Gamma Liquid Fund - Direct Plan - Growth', amc: 'Gamma Mutual Fund', category: 'Liquid', assetClass: 'Debt', inception: 20_000 - 100, m: { r1y: 0.065 } },
]);
const p = prepare(data);
const names = (idx: number[]): string[] => idx.map((i) => data.name[i]);

describe('filterIndices', () => {
  it('no filters returns every row', () => {
    expect(filterIndices(p, noFilters)).toHaveLength(5);
  });
  it('plan + option (the default view) keeps Direct Growth only', () => {
    const r = filterIndices(p, { ...noFilters, plan: ['direct'], option: ['growth'] });
    expect(names(r)).toEqual([
      'Alpha Bluechip Fund - Direct Plan - Growth',
      'Beta Small Cap Fund - Direct Plan - Growth',
      'Gamma Liquid Fund - Direct Plan - Growth',
    ]);
  });
  it('multi-select within a field is OR; across fields is AND', () => {
    expect(filterIndices(p, { ...noFilters, category: ['Large Cap', 'Liquid'] })).toHaveLength(3);
    expect(filterIndices(p, { ...noFilters, category: ['Large Cap', 'Liquid'], plan: ['regular'] })).toHaveLength(1);
  });
  it('unknown label matches nothing instead of everything', () => {
    expect(filterIndices(p, { ...noFilters, category: ['Nope'] })).toHaveLength(0);
  });
  it('text search: every word must match name or fund house, case-insensitive', () => {
    expect(filterIndices(p, { ...noFilters, q: 'beta small' })).toHaveLength(2);
    expect(filterIndices(p, { ...noFilters, q: 'GAMMA' })).toHaveLength(1);
    expect(filterIndices(p, { ...noFilters, q: 'beta liquid' })).toHaveLength(0);
    expect(filterIndices(p, { ...noFilters, q: '   ' })).toHaveLength(5);
  });
  it('range filters use display units (percent) and are inclusive', () => {
    expect(names(filterIndices(p, { ...noFilters, ranges: { r1y: { min: 12 } } }))).toEqual([
      'Alpha Bluechip Fund - Direct Plan - Growth', 'Beta Small Cap Fund - Direct Plan - Growth', 'Beta Small Cap Fund - Direct Plan - IDCW',
    ]);
    expect(filterIndices(p, { ...noFilters, ranges: { r1y: { min: 10, max: 12 } } })).toHaveLength(2);
  });
  it('null handling: a fund with no 3Y return is excluded only when a 3Y filter is set', () => {
    expect(filterIndices(p, { ...noFilters, ranges: { r1y: { min: 0 } } })).toHaveLength(5);
    const r = filterIndices(p, { ...noFilters, ranges: { r3y: { min: 0 } } });
    expect(names(r)).not.toContain('Beta Small Cap Fund - Direct Plan - Growth');
    expect(r).toHaveLength(3);
  });
  it('plain-unit ranges (Sharpe) and negative bounds (drawdown) work', () => {
    expect(filterIndices(p, { ...noFilters, ranges: { sharpe3y: { min: 1 } } })).toHaveLength(1);
    expect(filterIndices(p, { ...noFilters, ranges: { mdd3y: { min: -25 } } })).toHaveLength(1);
    expect(filterIndices(p, { ...noFilters, ranges: { mdd3y: { min: -10 } } })).toHaveLength(0);
  });
  it('age filter in years', () => {
    expect(filterIndices(p, { ...noFilters, ranges: { age: { max: 1 } } })).toHaveLength(1);
    expect(filterIndices(p, { ...noFilters, ranges: { age: { min: 3 } } })).toHaveLength(4);
  });
  it('empty range object ({}) imposes no restriction', () => {
    expect(filterIndices(p, { ...noFilters, ranges: { r3y: {} } })).toHaveLength(5);
  });
});

describe('sortIndices', () => {
  const all = [0, 1, 2, 3, 4];
  it('descending puts the highest first and nulls last', () => {
    expect(sortIndices(p, all, 'r3y', 'desc').map((i) => data.metrics.r3y[i])).toEqual([0.2, 0.15, 0.13, null, null]);
  });
  it('ascending still puts nulls last', () => {
    expect(sortIndices(p, all, 'r3y', 'asc').map((i) => data.metrics.r3y[i])).toEqual([0.13, 0.15, 0.2, null, null]);
  });
  it('sorts text columns case-insensitively and does not mutate its input', () => {
    const input = [4, 0, 2];
    expect(sortIndices(p, input, 'name', 'asc')).toEqual([0, 2, 4]);
    expect(input).toEqual([4, 0, 2]);
  });
  it('ties break by name for a stable order', () => {
    const d = makeData([{ name: 'B Fund', m: { r1y: 0.1 } }, { name: 'A Fund', m: { r1y: 0.1 } }]);
    expect(sortIndices(prepare(d), [0, 1], 'r1y', 'desc')).toEqual([1, 0]);
  });
});

describe('applyView / pagination', () => {
  const many = makeData(Array.from({ length: 120 }, (_, i) => ({ name: `Fund ${String(i).padStart(3, '0')}`, m: { r1y: i / 1000 } })));
  const pm = prepare(many);
  it('slices pages and reports "Showing a-b of n"', () => {
    const r = applyView(pm, view({ sort: { key: 'name', dir: 'asc' }, page: 2, size: 50 }));
    expect(r).toMatchObject({ total: 120, page: 2, pages: 3, from: 51, to: 100 });
    expect(r.rows[0]).toBe(50);
  });
  it('last page is partial; out-of-range pages clamp', () => {
    expect(applyView(pm, view({ page: 3, size: 50 }))).toMatchObject({ from: 101, to: 120 });
    expect(applyView(pm, view({ page: 99, size: 50 })).page).toBe(3);
    expect(applyView(pm, view({ page: 0, size: 50 })).page).toBe(1);
  });
  it('no matches gives zero counts, not "Showing 1-0"', () => {
    expect(applyView(pm, view({ filters: { q: 'zzz' } }))).toMatchObject({ total: 0, pages: 1, page: 1, from: 0, to: 0, rows: [] });
  });
});

describe('pageList', () => {
  it('shows first, last and neighbours with gaps', () => {
    expect(pageList(1, 3)).toEqual([1, 2, 3]);
    expect(pageList(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
    expect(pageList(2, 20)).toEqual([1, 2, 3, '…', 20]);
    expect(pageList(1, 1)).toEqual([1]);
  });
});

describe('performance budget: 9,000 funds', () => {
  const N = 9000;
  const big = makeData(Array.from({ length: N }, (_, i) => ({
    name: `Fund number ${i} ${i % 7 === 0 ? 'Direct Plan Growth' : 'Regular Plan IDCW'}`,
    amc: `AMC ${i % 45}`, category: `Cat ${i % 35}`, plan: i % 2 ? 'direct' : 'regular', option: i % 3 ? 'growth' : 'idcw',
    m: { r1y: (i % 97) / 300, r3y: i % 5 ? (i % 89) / 300 : null, r5y: (i % 83) / 300, vol3y: (i % 31) / 100 },
  })));
  const pb = prepare(big);
  it('filter + sort + paginate stays under 30 ms (median of 15 runs)', () => {
    const v = view({ filters: { plan: ['direct'], option: ['growth'], q: 'fund', ranges: { r3y: { min: 5 }, vol3y: { max: 25 } } }, sort: { key: 'r5y', dir: 'desc' } });
    applyView(pb, v); // warm up
    const times: number[] = [];
    for (let i = 0; i < 15; i++) {
      const t0 = performance.now();
      applyView(pb, v);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[7]).toBeLessThan(30);
  });
});
