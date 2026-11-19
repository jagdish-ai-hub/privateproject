import { describe, expect, it } from 'vitest';
import { applyView, prepare } from '../src/lib/screener/query.ts';
import { seedFromDefaultView } from '../src/lib/screener/seed.ts';
import { DEFAULT_VIEW } from '../src/lib/screener/url.ts';
import { fundTitle, fundTitleStem, monthLabel, duplicateStems } from '../src/lib/fundTitle.ts';
import { makeData } from './screener-helpers.ts';

describe('seedFromDefaultView', () => {
  const funds = Array.from({ length: 40 }, (_, i) => ({ name: `Fund ${i} - Direct Plan - Growth`, aum: 1000 + i, m: { r1y: 0.1 + i / 1000 } }));
  const data = makeData([...funds, { name: 'Debt X - Direct Plan - Growth', assetClass: 'Debt', aum: 99999 }, { name: 'Fund R - Regular Plan - Growth', plan: 'regular', aum: 99999 }]);

  it('is the first page of the default view: Direct Growth equity, largest fund size first', () => {
    const seed = seedFromDefaultView(data)!;
    expect(seed.count).toBe(DEFAULT_VIEW.size);
    expect(seed.name[0]).toBe('Fund 39 - Direct Plan - Growth');
    expect(seed.aum.slice(0, 3)).toEqual([1039, 1038, 1037]);
    expect(seed.name).not.toContain('Debt X - Direct Plan - Growth');
  });

  it('carries every column, aligned row by row, so a table can be drawn from it alone', () => {
    const seed = seedFromDefaultView(data)!;
    const full = applyView(prepare(data), { ...DEFAULT_VIEW, page: 1 }).rows;
    expect(seed.count).toBe(full.length);
    expect(seed.code).toEqual(full.map((i) => data.code[i]));
    expect(seed.metrics.r1y).toEqual(full.map((i) => data.metrics.r1y[i]));
    expect(seed.nav).toEqual(full.map((i) => data.nav[i]));
    for (const k of Object.keys(data.ranks)) expect(seed.ranks[k]).toHaveLength(full.length);
    expect(seed.dict).toBe(data.dict);
  });

  it('is null when the default view is empty (a tiny test dataset)', () => {
    expect(seedFromDefaultView(makeData([{ name: 'Debt only - Direct Plan - Growth', assetClass: 'Debt' }]))).toBeNull();
  });
});

describe('fund page titles', () => {
  it('names the fund, what people search for, and the month', () => {
    const day = Date.UTC(2026, 10, 17) / 86_400_000;
    expect(monthLabel(day)).toBe('Nov 2026');
    expect(fundTitle({ name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', plan: 'direct', option: 'growth', navDate: day, code: 122639 }))
      .toBe('Parag Parikh Flexi Cap Direct Growth: NAV, Returns, Expense Ratio (Nov 2026)');
  });

  it('drops bracketed notes and plan words from the name', () => {
    expect(fundTitleStem('ICICI Prudential Large Cap Fund (erstwhile Bluechip Fund) - Direct Plan - Growth')).toBe('ICICI Prudential Large Cap');
    expect(fundTitleStem('HDFC Flexi Cap Fund - Direct Plan - Growth Option')).toBe('HDFC Flexi Cap');
  });

  it('adds the scheme code only when two funds would share a title', () => {
    const a = { name: 'Same Fund (Series A) - Direct Plan - Growth', plan: 'direct', option: 'growth' };
    const b = { name: 'Same Fund (Series B) - Direct Plan - Growth', plan: 'direct', option: 'growth' };
    const c = { name: 'Other Fund - Direct Plan - Growth', plan: 'direct', option: 'growth' };
    expect(duplicateStems([a, b, c]).size).toBe(1);
    const day = 20_000;
    expect(fundTitle({ ...a, navDate: day, code: 11 }, true)).toContain('(11)');
    expect(fundTitle({ ...c, navDate: day, code: 12 }, false)).not.toMatch(/\(12\)/);
  });
});
