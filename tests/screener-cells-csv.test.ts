import { describe, expect, it } from 'vitest';
import { cellFor } from '../src/lib/screener/cells.ts';
import { COLUMNS, type Column } from '../src/lib/screener/columns.ts';
import { toCsv } from '../src/lib/screener/csv.ts';
import { prepare } from '../src/lib/screener/query.ts';
import { makeData } from './screener-helpers.ts';

const col = (key: Column['key']): Column => COLUMNS.find((c) => c.key === key) as Column;
const data = makeData([
  { name: 'Alpha, "Best" Fund - Direct Plan - Growth', category: 'Large Cap', nav: 205.754, m: { r1y: 0.1234, r3y: -0.031, vol3y: 0.152, sharpe3y: 0.5 } },
  { name: 'Beta Fund', amc: 'Beta Mutual Fund', m: {} },
]);
const p = prepare(data);

describe('cellFor', () => {
  it('formats returns with sign and colour class', () => {
    expect(cellFor(p, 0, col('r1y'))).toEqual({ text: '+12.34%', cls: 'pos', numeric: true });
    expect(cellFor(p, 0, col('r3y'))).toEqual({ text: '-3.10%', cls: 'neg', numeric: true });
  });
  it('missing values are a dash with no colour (not 0.00%)', () => {
    expect(cellFor(p, 1, col('r1y'))).toEqual({ text: '—', cls: '', numeric: true });
    expect(cellFor(p, 1, col('vol3y')).text).toBe('—');
    expect(cellFor(p, 1, col('sharpe3y')).text).toBe('—');
  });
  it('NAV, volatility, text and age', () => {
    expect(cellFor(p, 0, col('nav')).text).toBe('205.7540');
    expect(cellFor(p, 0, col('vol3y')).text).toBe('15.2%');
    expect(cellFor(p, 0, col('category'))).toEqual({ text: 'Large Cap', cls: '', numeric: false });
    expect(cellFor(p, 0, col('age')).text).toBe('5.0 yrs');
  });
});

describe('toCsv', () => {
  const csv = toCsv(p, [0, 1], [col('category'), col('nav'), col('r1y'), col('vol3y')]);
  const lines = csv.split('\r\n');
  it('has a header with units for percent columns', () => {
    expect(lines[0]).toBe('Scheme code,Fund,Plan,Option,Category,NAV (₹),1Y (%),Volatility 3Y (%)');
  });
  it('escapes commas and quotes in names', () => {
    expect(lines[1].startsWith('1000,"Alpha, ""Best"" Fund - Direct Plan - Growth",direct,growth,Large Cap,205.754,12.34,15.2')).toBe(true);
  });
  it('writes missing values as empty cells and one line per row', () => {
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('1001,Beta Fund,direct,growth,Large Cap,10,,');
  });
});
