import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coverageProblem, joinCosts, type SchemeForCosts } from '../scripts/pipeline/costs.ts';
import { parseAumTable, type AumQuarter } from '../scripts/pipeline/aum.ts';
import { buildTerIndex, latestPerScheme, parseTerRow, type RawTerRow, type TerRow } from '../scripts/pipeline/ter.ts';

const fx = <T>(n: string): T => JSON.parse(readFileSync(`tests/fixtures/${n}`, 'utf8')) as T;
const ppfas = fx<{ data: RawTerRow[] }[]>('ter-ppfas-09-2026.json').flatMap((p) => p.data).map(parseTerRow).filter((r): r is TerRow => r !== null);
const etf = fx<{ zerodhaD_only: RawTerRow[]; utiR_only: RawTerRow[] }>('ter-etf-samples.json');
const tag = (r: TerRow, amc: string) => ({ ...r, amc });
const terRows = [...latestPerScheme(ppfas).map((r) => tag(r, 'PPFAS Mutual Fund')), ...etf.utiR_only.map(parseTerRow).filter((r): r is TerRow => !!r).map((r) => tag(r, 'UTI Mutual Fund'))];
const index = buildTerIndex(terRows);
const aum: AumQuarter = { fy: 'x', period: 'April - June 2026', crore: new Map([[122639, 12345.67]]), names: new Map() };

const flexi = (over: Partial<SchemeForCosts> = {}): SchemeForCosts => ({
  code: 122639, amc: 'PPFAS Mutual Fund', name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
  rawCategory: 'Open Ended Schemes(Equity Scheme - Flexi Cap Fund)', plan: 'direct', option: 'growth', assetClass: 'Equity', ...over,
});

describe('joinCosts', () => {
  const flexiRow = latestPerScheme(ppfas).find((r) => r.name === 'Parag Parikh Flexi Cap Fund') as TerRow;
  it('Direct plan gets the Direct TER and Regular gets the Regular TER from the same row (real PPFAS data)', () => {
    const { costs } = joinCosts([flexi(), flexi({ code: 122640, name: 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth', plan: 'regular' })], index, aum);
    expect(costs[0].ter).toBe(flexiRow.direct?.total);
    expect(costs[1].ter).toBe(flexiRow.regular?.total);
    expect(costs[1].ter as number).toBeGreaterThan(costs[0].ter as number); // Regular costs more
    expect(costs[0].terDetail?.regular?.total).toBe(flexiRow.regular?.total); // fund page shows both plans
  });
  it('AUM joins on the exact AMFI code', () => {
    const { costs, stats } = joinCosts([flexi(), flexi({ code: 999999 })], index, aum);
    expect(costs[0].planAum).toBe(12345.67);
    expect(costs[0].aum).toBe(12345.67);
    expect(costs[1].planAum).toBeNull(); // no AUM row for this code ...
    expect(costs[1].aum).toBe(12345.67); // ... but it is the same scheme, so it shows the scheme total
    expect(stats.aumMatched).toBe(1);
  });
  it('an ETF labelled "Direct Plan" still gets the cost AMFI filed under Regular (UTI regression)', () => {
    const uti: SchemeForCosts = { code: 1, amc: 'UTI Mutual Fund', name: `${etf.utiR_only[0].Scheme_Name} - Direct Plan - Growth`, rawCategory: 'Open Ended Schemes(Exchange Traded Funds (ETFs) - Equity ETF)', plan: 'direct', option: 'growth', assetClass: 'ETF' };
    const { costs } = joinCosts([uti], index, null);
    expect(costs[0].ter).toBe(Number(etf.utiR_only[0].R_TER));
    // The same row for a non-ETF Direct scheme has no Direct plan, so it correctly gets nothing.
    expect(joinCosts([{ ...uti, assetClass: 'Index Fund' }], index, null).costs[0].ter).toBeNull();
  });
  it('unknown plan, unmatched name or missing source gives null, never 0', () => {
    const { costs } = joinCosts([flexi({ plan: 'unknown' }), flexi({ name: 'Imaginary Fund - Direct Plan - Growth' })], index, aum);
    expect(costs.map((c) => c.ter)).toEqual([null, null]);
    expect(joinCosts([flexi()], null, null).costs[0]).toEqual({ ter: null, terDetail: null, terParts: null, planAum: null, aum: null });
  });
  it('counts coverage for Direct+Growth, by asset class, and lists unmatched fund houses', () => {
    const { stats } = joinCosts([flexi(), flexi({ name: 'Nope Fund - Direct Plan - Growth' }), flexi({ amc: 'Ghost Mutual Fund' })], index, aum);
    expect(stats.directGrowth).toEqual({ matched: 1, total: 3 });
    expect(stats.byAssetClass.Equity).toEqual({ matched: 1, total: 3 });
    expect(stats.unmatchedAmcs).toEqual(['Ghost Mutual Fund']);
    expect(stats.unmatchedSample).toHaveLength(2);
    expect(stats.terAsOf).toBe('2026-09-30');
  });
  it('flags Regular cheaper than Direct and TERs outside (0, 5] percent for review', () => {
    const odd: TerRow & { amc: string } = { nsdlCode: 'Z', name: 'Odd Fund', category: '', date: '2026-09-30', regular: { ber: 0, brokerage: 0, transaction: 0, levies: 0, total: 1 }, direct: { ber: 0, brokerage: 0, transaction: 0, levies: 0, total: 2 }, amc: 'Odd Mutual Fund' };
    const big: TerRow & { amc: string } = { ...odd, nsdlCode: 'Y', name: 'Big Fund', regular: { ...odd.regular!, total: 6.5 }, direct: { ...odd.direct!, total: 4 } };
    const idx = buildTerIndex([odd, big]);
    const mk = (name: string): SchemeForCosts => ({ code: 5, amc: 'Odd Mutual Fund', name, rawCategory: '', plan: 'direct', option: 'growth', assetClass: 'Equity' });
    expect(joinCosts([mk('Odd Fund - Direct Plan - Growth'), mk('Big Fund - Direct Plan - Growth')], idx, null).stats.violations.map((v) => v.name)).toEqual(['Odd Fund', 'Big Fund']);
  });
});

describe('coverageProblem (quality gate)', () => {
  const stats = (matched: number, total: number) => ({ directGrowth: { matched, total } }) as never;
  it('passes at or above the floor and fails loudly below it', () => {
    expect(coverageProblem(stats(96, 100), 2000, 0.9)).toBeNull();
    expect(coverageProblem(stats(50, 100), 2000, 0.9)).toMatch(/50\.0%.*below the 90% floor/);
  });
  it('degrades quietly (no failure) when no TER data was loaded at all', () => {
    expect(coverageProblem(stats(0, 100), 0, 0.9)).toBeNull();
    expect(coverageProblem(stats(0, 0), 5, 0.9)).toBeNull();
  });
});

describe('AUM names as a third source of plan/option', () => {
  it('AMFI’s AUM table names carry plan and option, e.g. "... - Growth - Direct"', () => {
    const { names } = parseAumTable([{ schemes: [{ AMFI_Code: 148397, SchemeNAVName: 'IL&FS Infrastructure Debt Fund Series 2A - Growth - Direct', AverageAumForTheMonth: { a: 100 } }] }]);
    expect(names.get(148397)).toContain('Growth - Direct');
  });
});

describe('whole-scheme AUM', () => {
  it('adds up every plan and option of the same scheme, and leaves other schemes alone', () => {
    const two: AumQuarter = { fy: 'x', period: 'q', names: new Map(), crore: new Map([[1, 100], [2, 40.5], [3, 0.25], [4, 999]]) };
    const s = [
      flexi({ code: 1, name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' }),
      flexi({ code: 2, name: 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth', plan: 'regular' }),
      flexi({ code: 3, name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Monthly IDCW Payout', option: 'idcw' }),
      flexi({ code: 4, name: 'Parag Parikh Conservative Hybrid Fund - Direct Plan - Growth' }),
      flexi({ code: 5, name: 'Parag Parikh Flexi Cap Fund - Direct Plan - IDCW' }),
    ];
    const { costs } = joinCosts(s, null, two);
    expect(costs.slice(0, 3).map((c) => c.aum)).toEqual([140.75, 140.75, 140.75]); // 100 + 40.5 + 0.25
    expect(costs[0].planAum).toBe(100);
    expect(costs[3].aum).toBe(999);
    expect(costs[4].aum).toBe(140.75); // no AUM of its own, but still part of the same scheme: shows the scheme total
  });
});
