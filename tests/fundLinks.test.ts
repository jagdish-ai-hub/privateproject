import { describe, expect, it } from 'vitest';
import { fundHref, hasFundPage, schemeStem } from '../src/lib/fundLinks.ts';

describe('fund links', () => {
  it('only Direct Growth (and single-plan Growth) schemes get their own page', () => {
    expect(hasFundPage('direct', 'growth')).toBe(true);
    expect(hasFundPage('na', 'growth')).toBe(true);
    expect(hasFundPage('regular', 'growth')).toBe(false);
    expect(hasFundPage('direct', 'idcw')).toBe(false);
    expect(hasFundPage('unknown', 'growth')).toBe(false);
  });
  it('links to the static page or the on-demand page', () => {
    expect(fundHref('SBI Small Cap Fund - Direct Plan - Growth', 125497, 'direct', 'growth')).toBe('/fund/sbi-small-cap-fund-direct-plan-growth-125497/');
    expect(fundHref('SBI Small Cap Fund - Regular Plan - Growth', 125494, 'regular', 'growth')).toBe('/fund/?code=125494');
  });
  it('variants of one scheme share a stem; different schemes do not', () => {
    const a = schemeStem('Kotak Flexicap Fund - Direct Plan - Growth');
    expect(schemeStem('Kotak Flexicap Fund - Regular Plan - Growth')).toBe(a);
    expect(schemeStem('Kotak Flexicap Fund - Direct Plan - Payout of Income Distribution cum Capital Withdrawal option')).toBe(a);
    expect(schemeStem('Kotak Small Cap Fund - Direct Plan - Growth')).not.toBe(a);
    expect(schemeStem('Axis Banking & PSU Debt Fund - Direct Plan - Growth')).toBe(schemeStem('Axis Banking and PSU Debt Fund - Regular Growth'));
  });
});
