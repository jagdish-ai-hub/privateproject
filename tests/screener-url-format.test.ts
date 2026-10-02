import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseView, serializeView } from '../src/lib/screener/url.ts';
import type { ViewState } from '../src/lib/screener/types.ts';
import { DASH, formatNav, formatNum, formatPct, formatPlainPct, formatRupees, signClass } from '../src/lib/format.ts';

describe('URL state', () => {
  it('the default view serialises to an empty query and parses back to itself', () => {
    expect(serializeView(DEFAULT_VIEW)).toBe('');
    expect(parseView('')).toEqual(DEFAULT_VIEW);
  });
  it('round-trips a fully customised view', () => {
    const v: ViewState = {
      filters: {
        q: 'small cap', amc: ['HDFC Mutual Fund', 'Nippon India Mutual Fund'], assetClass: ['Equity'],
        category: ['Large & Mid Cap', 'Sectoral / Thematic'], plan: ['direct', 'regular'], option: ['growth', 'idcw'],
        ranges: { r3y: { min: 15 }, vol3y: { max: 20 }, mdd3y: { min: -25, max: -5 }, age: { min: 3 } },
      },
      sort: { key: 'sip3y', dir: 'asc' }, page: 4, size: 100,
    };
    expect(parseView(serializeView(v))).toEqual(v);
  });
  it('an explicitly empty plan ("any plan") is not confused with the default', () => {
    const v: ViewState = { ...DEFAULT_VIEW, filters: { ...DEFAULT_VIEW.filters, plan: [] } };
    const qs = serializeView(v);
    expect(qs).toContain('plan=');
    expect(parseView(qs).filters.plan).toEqual([]);
  });
  it('names with commas and ampersands survive', () => {
    const v: ViewState = { ...DEFAULT_VIEW, filters: { ...DEFAULT_VIEW.filters, category: ['Banking & PSU'], amc: ['Aditya Birla Sun Life, Ltd'] } };
    expect(parseView(serializeView(v)).filters).toMatchObject({ category: ['Banking & PSU'], amc: ['Aditya Birla Sun Life, Ltd'] });
  });
  it('hand-edited garbage falls back to defaults instead of throwing', () => {
    const v = parseView('?sort=bogus:up&page=-3&size=7&min_r3y=abc&max_vol3y=&page=x');
    expect(v.sort).toEqual(DEFAULT_VIEW.sort);
    expect(v.page).toBe(1);
    expect(v.size).toBe(DEFAULT_VIEW.size);
    expect(v.filters.ranges).toEqual({});
  });
  it('accepts a leading ?', () => {
    expect(parseView('?page=2').page).toBe(2);
  });
});

describe('formatters', () => {
  it('signed percent with Indian grouping, always a sign for gains', () => {
    expect(formatPct(0.1234)).toBe('+12.34%');
    expect(formatPct(-0.031)).toBe('-3.10%');
    expect(formatPct(0)).toBe('0.00%');
    expect(formatPct(12.3456)).toBe('+1,234.56%');
    expect(formatPct(0.12345, 1)).toBe('+12.3%');
  });
  it('missing values are a dash, never zero', () => {
    for (const f of [formatPct, formatPlainPct, formatNav, formatNum, formatRupees]) {
      expect(f(null)).toBe(DASH);
      expect(f(undefined)).toBe(DASH);
      expect(f(NaN)).toBe(DASH);
    }
  });
  it('NAV to 4 decimals, rupees in lakh/crore grouping', () => {
    expect(formatNav(205.754)).toBe('205.7540');
    expect(formatNav(12345.6789)).toBe('12,345.6789');
    expect(formatRupees(1234567)).toBe('₹12,34,567');
    expect(formatRupees(1234567.5, 2)).toBe('₹12,34,567.50');
  });
  it('plain percent, numbers and sign class', () => {
    expect(formatPlainPct(0.5)).toBe('50.0%');
    expect(formatNum(1.234)).toBe('1.23');
    expect(signClass(0.1)).toBe('pos');
    expect(signClass(-0.1)).toBe('neg');
    expect(signClass(0)).toBe('');
    expect(signClass(null)).toBe('');
  });
});
