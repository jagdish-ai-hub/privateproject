import { describe, expect, it } from 'vitest';
import { SMALL_SAVINGS } from '../src/data/small-savings.ts';
import { formatRupees } from '../src/lib/format.ts';
import { loanEligibility } from '../src/lib/loans.ts';
import { schemeReckoner, toolReckoner } from '../src/lib/reckoners.ts';
import { rd, ssy } from '../src/lib/schemes.ts';
import { TOOLS } from '../src/lib/tools.ts';
import type { SchemeKind } from '../src/lib/schemeContent.ts';

const R = SMALL_SAVINGS.rates;
const rs = (n: number): string => formatRupees(Math.round(n));
const SCHEMES: SchemeKind[] = ['ppf', 'ssy', 'scss', 'nsc', 'kvp', 'mis', 'rd', 'td'];

describe('ready reckoners', () => {
  it('every table is well formed in both languages: each row has one cell per heading', () => {
    const all = [...TOOLS.map((t) => [toolReckoner(t.kind, 'en'), toolReckoner(t.kind, 'hi')]), ...SCHEMES.map((k) => [schemeReckoner(k, 'en'), schemeReckoner(k, 'hi')])].flat();
    expect(all.filter(Boolean).length).toBeGreaterThan(20);
    for (const t of all) {
      if (!t) continue;
      expect(t.rows.length).toBeGreaterThan(0);
      for (const r of t.rows) expect(r).toHaveLength(t.head.length);
      expect(t.note.length).toBeGreaterThan(10);
    }
  });

  it('every scheme has a table, and the Hindi one has the same numbers', () => {
    for (const k of SCHEMES) {
      const en = schemeReckoner(k, 'en')!;
      const hi = schemeReckoner(k, 'hi')!;
      expect(en, k).not.toBeNull();
      expect(hi.rows.map((r) => r.slice(1)), k).toEqual(en.rows.map((r) => r.slice(1)));
    }
  });

  it('matches the published figures and the calculator maths', () => {
    const ppf = schemeReckoner('ppf')!;
    expect(ppf.rows.at(-1)).toEqual(['₹1,50,000', '₹22,50,000', expect.any(String), '₹40,68,209']);
    const ssyT = schemeReckoner('ssy')!;
    expect(ssyT.rows).toHaveLength(21);
    expect(ssyT.rows.at(-1)![3]).toBe(rs(ssy(150_000, R.ssy / 100).maturity));
    const rdT = schemeReckoner('rd')!;
    expect(rdT.rows.find((r) => r[0] === '₹5,000')![3]).toBe(rs(rd(5_000, R.rd5 / 100).maturity));
    const elig = toolReckoner('eligibility')!;
    const row = elig.rows.find((r) => r[0] === '₹50,000')!;
    const loan = loanEligibility({ income: 50_000, existingEmi: 0, emiShare: 0.5, rate: 0.0875, years: 20 }).maxLoan;
    expect(row[2]).toBe(`₹${+(Math.round(loan) / 100_000).toFixed(2)} lakh`);
    expect(toolReckoner('cagr')!.rows.find((r) => r[0] === '100%')![2]).toBe('14.87%');
  });

  it('tools without a useful table return null', () => {
    expect(toolReckoner('xirr')).toBeNull();
    expect(toolReckoner('rentbuy')).toBeNull();
  });
});
