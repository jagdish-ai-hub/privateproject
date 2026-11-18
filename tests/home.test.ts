import { describe, expect, it } from 'vitest';
import { MIN_AUM, screenerHref, topByCategory, topByReturn } from '../src/lib/home.ts';
import { parseView } from '../src/lib/screener/url.ts';
import { makeData } from './screener-helpers.ts';

const data = makeData([
  { name: 'Alpha Large Cap Fund - Direct Plan - Growth', category: 'Large Cap', aum: 5000, m: { r1y: 0.10, r3y: 0.15, r1m: 0.02 } },
  { name: 'Beta Mid Cap Fund - Direct Plan - Growth', category: 'Mid Cap', aum: 900, m: { r1y: 0.20, r3y: 0.22, r1m: 0.01 } },
  { name: 'Gamma Defence Fund - Direct Plan - Growth', category: 'Sectoral / Thematic', aum: 4000, m: { r1y: 0.60, r3y: 0.40 } },
  { name: 'Tiny Small Cap Fund - Direct Plan - Growth', category: 'Small Cap', aum: MIN_AUM - 1, m: { r1y: 0.50, r3y: 0.30 } },
  { name: 'Beta Mid Cap Fund - Regular Plan - Growth', category: 'Mid Cap', plan: 'regular', aum: 900, m: { r1y: 0.25, r3y: 0.24 } },
  { name: 'Beta Mid Cap Fund - Direct Plan - IDCW', category: 'Mid Cap', option: 'idcw', aum: 900, m: { r1y: 0.26, r3y: 0.25 } },
  { name: 'Nifty 50 Index Fund - Direct Plan - Growth', category: 'Index Fund', assetClass: 'Index Fund', aum: 9000, m: { r1y: 0.30, r3y: 0.13 } },
  { name: 'New Large Cap Fund - Direct Plan - Growth', category: 'Large Cap', aum: 700, m: { r1y: 0.12, r3y: null } },
  { name: 'Unknown Size Fund - Direct Plan - Growth', category: 'Flexi Cap', aum: null, m: { r1y: 0.90, r3y: 0.50 } },
]);

describe('topByReturn', () => {
  it('keeps only Direct Growth diversified equity funds of at least the minimum size, highest first', () => {
    const top = topByReturn(data, 'r1y');
    expect(top.map((f) => f.name)).toEqual(['Beta Mid Cap Fund', 'New Large Cap Fund', 'Alpha Large Cap Fund']);
    expect(top[0].value).toBe(0.20);
    expect(top[0].category).toBe('Mid Cap');
  });

  it('leaves out funds without a figure for the period', () => {
    expect(topByReturn(data, 'r3y').map((f) => f.name)).toEqual(['Beta Mid Cap Fund', 'Alpha Large Cap Fund']);
    expect(topByReturn(data, 'r5y')).toEqual([]);
  });

  it('respects n and links to fund pages', () => {
    const top = topByReturn(data, 'r1m', 1);
    expect(top).toHaveLength(1);
    expect(top[0].href).toMatch(/^\/fund\/alpha-large-cap-fund-direct-plan-growth-\d+\/$/);
  });

  it('is empty when no fund size is known (AUM file missing)', () => {
    const noAum = { ...data, aum: data.aum.map(() => null) };
    expect(topByReturn(noAum, 'r1y')).toEqual([]);
  });
});

describe('topByCategory', () => {
  it('ranks each category by 3-year return, Direct Growth only, in the order asked, skipping missing ones', () => {
    const tops = topByCategory(data, ['Mid Cap', 'Large Cap', 'Index Fund', 'Gilt']);
    expect(tops.map((t) => t.category)).toEqual(['Mid Cap', 'Large Cap', 'Index Fund']);
    expect(tops[0].funds.map((f) => f.name)).toEqual(['Beta Mid Cap Fund']);
    expect(tops[1].funds.map((f) => f.name)).toEqual(['Alpha Large Cap Fund']);
    expect(tops[2]).toMatchObject({ slug: 'index-fund', assetClass: 'Index Fund' });
  });
});

describe('screenerHref', () => {
  it('builds links the screener reads back to the same view', () => {
    const href = screenerHref({ key: 'r1y', minAum: 500 });
    const v = parseView(href.slice(2));
    expect(v.sort).toEqual({ key: 'r1y', dir: 'desc' });
    expect(v.filters.ranges.aum).toEqual({ min: 500 });
    expect(v.filters.assetClass).toEqual(['Equity']);
  });

  it('sets the fund type for non-equity categories, so the list is not empty', () => {
    const v = parseView(screenerHref({ category: 'Liquid', assetClass: 'Debt', key: 'r1y' }).slice(2));
    expect(v.filters.category).toEqual(['Liquid']);
    expect(v.filters.assetClass).toEqual(['Debt']);
  });

  it('is the bare home page for the default view', () => {
    expect(screenerHref({})).toBe('/');
  });
});
