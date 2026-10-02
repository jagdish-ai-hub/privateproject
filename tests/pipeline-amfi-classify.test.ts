import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseNavAll } from '../scripts/pipeline/amfi.ts';
import { classifyCategory, classifyOption, classifyPlan, resolveName, slugify } from '../scripts/pipeline/classify.ts';
import { toDayNumber } from '../src/lib/calc/index.ts';

const SAMPLE = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date

Open Ended Schemes(Equity Scheme - Small Cap Fund)

SBI Mutual Fund

125497;INF200K01T51;-;SBI Small Cap Fund;Direct Plan;Growth;205.754;01-Oct-2026
125498;-;INF200K01T69;SBI Small Cap Fund;Direct Plan;IDCW;N.A.;01-Oct-2026

Open Ended Schemes(Debt Scheme - Liquid Fund)

Axis Mutual Fund

100001;INF846K01111;-;Axis Liquid Fund;;;2500.5;30-Sep-2026
100002;-;INF846K01222;Bad Date Fund;;;10;31-02-2026
`;

describe('parseNavAll', () => {
  const rows = parseNavAll(SAMPLE);
  it('reads scheme rows with AMC and category from the header lines above them', () => {
    expect(rows[0]).toMatchObject({
      code: 125497, isinGrowth: 'INF200K01T51', isinReinvest: null, name: 'SBI Small Cap Fund',
      planCol: 'Direct Plan', optionCol: 'Growth', nav: 205.754, amc: 'SBI Mutual Fund',
      rawCategory: 'Open Ended Schemes(Equity Scheme - Small Cap Fund)',
    });
    expect(rows[0].navDay).toBe(toDayNumber(2026, 10, 1));
  });
  it('skips N.A. NAVs and unparseable dates, and tracks the category / AMC change', () => {
    expect(rows.map((r) => r.code)).toEqual([125497, 100001]);
    expect(rows[1]).toMatchObject({ amc: 'Axis Mutual Fund', rawCategory: 'Open Ended Schemes(Debt Scheme - Liquid Fund)', planCol: '' });
  });
});

describe('classifyCategory', () => {
  const headers = readFileSync('tests/fixtures/category-headers.txt', 'utf8').split('\n').filter(Boolean);
  it('maps every real AMFI header (all 104 seen on 2026-10-02) to a known asset class, none to Other', () => {
    expect(headers.length).toBeGreaterThan(100);
    const bad = headers.filter((h) => classifyCategory(h).assetClass === 'Other');
    expect(bad).toEqual([]);
  });
  it('merges old and new SEBI naming into one category', () => {
    const cat = (h: string) => classifyCategory(h).category;
    expect(cat('Open Ended Schemes(Equity Schemes - Small Cap Fund)')).toBe('Small Cap');
    expect(cat('Open Ended Schemes(Equity Scheme - Small Cap Fund)')).toBe('Small Cap');
    expect(cat('Open Ended Schemes(Hybrid Schemes - Balanced Advantage Fund/ Dynamic Asset Allocation)')).toBe('Balanced Advantage');
    expect(cat('Open Ended Schemes(Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage)')).toBe('Balanced Advantage');
    expect(cat('Open Ended Schemes(Debt Scheme - Short Duration Fund)')).toBe('Short Duration');
    expect(cat('Open Ended Schemes(Income/Debt Oriented Schemes - Short Term Fund)')).toBe('Short Duration');
    expect(cat('Open Ended Schemes(Equity Schemes - ELSS- Tax Saver Fund)')).toBe('ELSS (Tax Saver)');
  });
  it('does not confuse Large Cap with Large & Mid Cap, or Medium with Medium to Long', () => {
    expect(classifyCategory('Open Ended Schemes(Equity Scheme - Large & Mid Cap Fund)').category).toBe('Large & Mid Cap');
    expect(classifyCategory('Open Ended Schemes(Equity Scheme - Large Cap Fund)').category).toBe('Large Cap');
    expect(classifyCategory('Open Ended Schemes(Debt Scheme - Medium to Long Duration Fund)').category).toBe('Medium to Long Duration');
    expect(classifyCategory('Open Ended Schemes(Debt Scheme - Medium Duration Fund)').category).toBe('Medium Duration');
  });
  it('reads the scheme type and asset class', () => {
    expect(classifyCategory('Close Ended Schemes(ELSS)')).toMatchObject({ schemeType: 'Close Ended', assetClass: 'Equity' });
    expect(classifyCategory('Interval Fund Schemes(Income)')).toMatchObject({ schemeType: 'Interval', assetClass: 'Debt' });
    expect(classifyCategory('Open Ended Schemes(Other Scheme - Gold ETF)')).toMatchObject({ assetClass: 'ETF', category: 'Gold ETF' });
    expect(classifyCategory('Open Ended Schemes(Index Funds - Equity Funds)')).toMatchObject({ assetClass: 'Index Fund' });
  });
  it('keeps unknown headers visible instead of dropping them', () => {
    expect(classifyCategory('Open Ended Schemes(Brand New Thing)')).toMatchObject({ assetClass: 'Other', category: 'Brand New Thing' });
  });
});

describe('classifyPlan', () => {
  it('reads the plan column or the name', () => {
    expect(classifyPlan('Direct Plan', 'X Fund', 'Equity')).toBe('direct');
    expect(classifyPlan('', 'X Fund - Direct Plan - Growth', 'Equity')).toBe('direct');
    expect(classifyPlan('', 'X Fund - Regular Plan - Growth', 'Equity')).toBe('regular');
  });
  it('is unknown (not guessed) when nothing says and the fund is newer than Direct plans', () => {
    expect(classifyPlan('', 'X Fund', 'Equity', toDayNumber(2020, 1, 1))).toBe('unknown');
    expect(classifyPlan('', 'X Fund', 'Equity')).toBe('unknown');
  });
  it('is regular for unlabelled schemes that started before Direct plans existed (1 Jan 2013)', () => {
    expect(classifyPlan('', 'X Fund - Growth', 'Equity', toDayNumber(2005, 6, 1))).toBe('regular');
  });
  it('ETFs have no plans', () => {
    expect(classifyPlan('', 'Nippon Nifty BeES', 'ETF')).toBe('na');
  });
});

describe('classifyOption', () => {
  it('growth, idcw (all wordings), bonus', () => {
    expect(classifyOption('Growth Option', '')).toBe('growth');
    expect(classifyOption('', 'X - Direct Plan - Monthly IDCW Payout')).toBe('idcw');
    expect(classifyOption('', 'X - Weekly Dividend Reinvestment')).toBe('idcw');
    expect(classifyOption('', 'X - Income Distribution cum Capital Withdrawal')).toBe('idcw');
    expect(classifyOption('Bonus', '')).toBe('bonus');
  });
  it('idcw wins when both words appear, other when nothing says, reinvest-only ISIN means idcw', () => {
    expect(classifyOption('', 'X - Growth and IDCW')).toBe('idcw');
    expect(classifyOption('', 'X Fund')).toBe('other');
    expect(classifyOption('', 'X Fund', true)).toBe('idcw');
  });
});

describe('resolveName / slugify', () => {
  it('prefers the MFapi full name, falls back to AMFI parts', () => {
    expect(resolveName('A Fund', 'Direct Plan', 'Growth', 'A Fund - Direct Plan - Growth')).toBe('A Fund - Direct Plan - Growth');
    expect(resolveName('A Fund', 'Direct Plan', 'Growth')).toBe('A Fund - Direct Plan - Growth');
    expect(resolveName('A Fund', '', '')).toBe('A Fund');
  });
  it('slugifies', () => {
    expect(slugify("HDFC Mid-Cap Opportunities Fund - Direct Plan")).toBe('hdfc-mid-cap-opportunities-fund-direct-plan');
    expect(slugify('Large & Mid Cap')).toBe('large-and-mid-cap');
  });
});
