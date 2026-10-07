import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAum, MemoryAumStore, parseAumTable, MIN_AUM_ROWS } from '../scripts/pipeline/aum.ts';
import {
  amcKey, buildTerIndex, fetchTerMonth, latestPerScheme, loadTer, MemoryTerStore, monthParam, normalizeName,
  parseTerRow, pickTer, pickTerParts, type RawTerRow, type TerRow,
} from '../scripts/pipeline/ter.ts';

const fx = <T>(name: string): T => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8')) as T;
type Page = { data: RawTerRow[]; meta: { page: number; pageSize: number; total: number; pageCount: number } };
const ppfasPages = fx<Page[]>('ter-ppfas-09-2026.json');
const etf = fx<{ zerodhaD_only: RawTerRow[]; utiR_only: RawTerRow[] }>('ter-etf-samples.json');
const ppfasRows = ppfasPages.flatMap((p) => p.data).map(parseTerRow).filter((r): r is TerRow => r !== null);

afterEach(() => vi.unstubAllGlobals());

describe('parseTerRow (real AMFI rows)', () => {
  it('reads both plans and the breakdown as numbers', () => {
    const r = parseTerRow({
      NSDLSchemeCode: 'X/1', Scheme_Name: ' HDFC Aggressive Hybrid Fund ', SchemeCat_Desc: 'Hybrid Schemes - Aggressive Hybrid Fund', TER_Date: '2026-09-01T00:00:00.000Z',
      R_BER: '1.4000', R_BrokerageCost: '0.0100', R_TransactionCost: '0.0000', R_StatutoryLevies: '0.2800', R_TER: '1.6900',
      D_BER: '0.9000', D_BrokerageCost: '0.0100', D_TransactionCost: '0.0000', D_StatutoryLevies: '0.1900', D_TER: '1.1000',
    });
    expect(r).toMatchObject({ name: 'HDFC Aggressive Hybrid Fund', date: '2026-09-01' });
    expect(r?.regular).toEqual({ ber: 1.4, brokerage: 0.01, transaction: 0, levies: 0.28, total: 1.69 });
    expect(r?.direct?.total).toBe(1.1);
  });
  it('a plan reported as 0.0000 does not exist (null), it is not a zero fee', () => {
    const z = parseTerRow(etf.zerodhaD_only[0]);
    expect(z?.regular).toBeNull();
    expect(z?.direct?.total).toBeGreaterThan(0);
    const u = parseTerRow(etf.utiR_only[0]);
    expect(u?.direct).toBeNull();
    expect(u?.regular?.total).toBeGreaterThan(0);
  });
  it('rejects rows without code, name or date, and rows where no plan has a TER', () => {
    expect(parseTerRow({ Scheme_Name: 'x', TER_Date: '2026-01-01', R_TER: '1' })).toBeNull();
    expect(parseTerRow({ NSDLSchemeCode: 'a', TER_Date: '2026-01-01', R_TER: '1' })).toBeNull();
    expect(parseTerRow({ NSDLSchemeCode: 'a', Scheme_Name: 'x', TER_Date: '2026-01-01', R_TER: '0.0000', D_TER: '0.0000' })).toBeNull();
    expect(parseTerRow({ NSDLSchemeCode: 'a', Scheme_Name: 'x', TER_Date: '2026-01-01', R_TER: 'N.A.', D_TER: '' })).toBeNull();
  });
});

describe('latestPerScheme (TER is disclosed daily)', () => {
  it('PPFAS: ~30 daily rows per scheme collapse to one row per scheme, all on the newest date', () => {
    expect(ppfasRows.length).toBeGreaterThan(150);
    const latest = latestPerScheme(ppfasRows);
    expect(latest).toHaveLength(7);
    expect(new Set(latest.map((r) => r.date))).toEqual(new Set(['2026-09-30']));
  });
  it('keeps the newest date regardless of input order', () => {
    const mk = (date: string, total: number): TerRow => ({ nsdlCode: 'A', name: 'A', category: '', date, regular: { ber: 0, brokerage: 0, transaction: 0, levies: 0, total }, direct: null });
    expect(latestPerScheme([mk('2026-09-30', 2), mk('2026-09-01', 1), mk('2026-09-15', 3)])[0].regular?.total).toBe(2);
  });
});

describe('pickTer: which plan applies', () => {
  const both: TerRow = { nsdlCode: 'A', name: 'A', category: '', date: '2026-09-30', regular: { ber: 1, brokerage: 0, transaction: 0, levies: 0, total: 1.69 }, direct: { ber: 0.5, brokerage: 0, transaction: 0, levies: 0, total: 1.1 } };
  it('Direct gets D_TER, Regular gets R_TER, unknown gets nothing', () => {
    expect(pickTer(both, 'direct')).toBe(1.1);
    expect(pickTer(both, 'regular')).toBe(1.69);
    expect(pickTer(both, 'unknown')).toBeNull();
    expect(pickTerParts(both, 'direct')?.ber).toBe(0.5);
  });
  it('ETFs (no plans) get whichever plan AMFI filled in: Zerodha under Direct, UTI under Regular', () => {
    expect(pickTer(parseTerRow(etf.zerodhaD_only[0]) as TerRow, 'na')).toBe(Number(etf.zerodhaD_only[0].D_TER));
    expect(pickTer(parseTerRow(etf.utiR_only[0]) as TerRow, 'na')).toBe(Number(etf.utiR_only[0].R_TER));
  });
  it('a plan that does not exist yields null for that plan, never 0', () => {
    const z = parseTerRow(etf.zerodhaD_only[0]) as TerRow;
    expect(pickTer(z, 'regular')).toBeNull();
  });
  it('plan "na" with two different totals is ambiguous: null', () => {
    expect(pickTer(both, 'na')).toBeNull();
    expect(pickTerParts(both, 'na')).toBeNull();
    expect(pickTer({ ...both, regular: both.direct }, 'na')).toBe(1.1);
  });
});

describe('name and fund-house keys', () => {
  it('base names drop plan, option and payout words', () => {
    expect(normalizeName('Parag Parikh Flexi Cap Fund - Direct Plan - Growth')).toBe('parag parikh flexi cap fund');
    expect(normalizeName('Parag Parikh Flexi Cap Fund - Regular Plan - Monthly IDCW Payout')).toBe('parag parikh flexi cap fund');
    expect(normalizeName('HDFC Banking & Financial Services Fund - Direct Plan - Growth Option')).toBe('hdfc banking and financial services fund');
    expect(normalizeName('SBI GILT FUND - Direct Plan - Growth')).toBe(normalizeName('SBI Gilt Fund'));
  });
  it('fund house names match across AMFI lists', () => {
    expect(amcKey('PPFAS Mutual Fund')).toBe('ppfas');
    expect(amcKey('Aditya Birla Sun Life Mutual Fund')).toBe(amcKey('Aditya Birla Sun Life AMC Ltd'));
    expect(amcKey('ASK MUTUAL FUND')).toBe(amcKey('Ask Mutual Fund'));
  });
});

describe('buildTerIndex (joining TER rows to schemes)', () => {
  const tag = (r: TerRow, amc = 'PPFAS Mutual Fund') => ({ ...r, amc });
  const index = buildTerIndex(latestPerScheme(ppfasRows).map((r) => tag(r)));
  it('finds a real PPFAS scheme from its full MFapi name, in either plan', () => {
    for (const n of ['Parag Parikh Flexi Cap Fund - Direct Plan - Growth', 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth', 'Parag Parikh Flexi Cap Fund - Direct Plan - Monthly IDCW Payout']) {
      expect(index.find('PPFAS Mutual Fund', n, 'Flexi Cap')?.name).toBe('Parag Parikh Flexi Cap Fund');
    }
  });
  it('does not find another fund house’s scheme or an unknown name', () => {
    expect(index.find('SBI Mutual Fund', 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', 'Flexi Cap')).toBeNull();
    expect(index.find('PPFAS Mutual Fund', 'Parag Parikh Imaginary Fund - Direct Plan - Growth', 'Flexi Cap')).toBeNull();
  });
  it('two TER rows with one base name are split by category, and refused when category cannot decide', () => {
    const mk = (code: string, category: string): TerRow & { amc: string } => ({ nsdlCode: code, name: 'X Index Fund', category, date: '2026-09-30', regular: null, direct: { ber: 0, brokerage: 0, transaction: 0, levies: 0, total: 0.3 }, amc: 'X Mutual Fund' });
    const idx = buildTerIndex([mk('1', 'Equity Scheme - Large Cap Fund'), mk('2', 'Equity Scheme - Small Cap Fund')]);
    expect(idx.find('X Mutual Fund', 'X Index Fund - Direct Plan - Growth', 'Small Cap')?.nsdlCode).toBe('2');
    expect(idx.find('X Mutual Fund', 'X Index Fund - Direct Plan - Growth', 'Mid Cap')).toBeNull();
  });
});

/** A fetch stub that serves a router of URL -> JSON, optionally failing first with truncated JSON. */
function stubFetch(route: (url: string) => unknown, opts: { truncateFirst?: boolean } = {}) {
  let first = opts.truncateFirst ?? false;
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(String(url));
    if (first) { first = false; return new Response('{"data":[{"NSDLSchemeCode":"A","Scheme_N'); }
    return new Response(JSON.stringify(route(String(url))));
  }));
  return calls;
}
const pageOf = (url: string): Page => ppfasPages[Number(new URL(url).searchParams.get('page')) - 1];

describe('fetchTerMonth', () => {
  it('walks every page at pageSize=100 and parses all rows', async () => {
    const calls = stubFetch(pageOf);
    const rows = await fetchTerMonth(42, '09-2026');
    expect(calls).toHaveLength(ppfasPages.length);
    expect(calls[0]).toContain('MF_ID=42');
    expect(calls[0]).toContain('Month=09-2026');
    expect(calls[0]).toContain('pageSize=100');
    expect(rows).toHaveLength(ppfasRows.length);
  });
  it('AMFI answers a throttled request with truncated JSON: it is detected and retried', async () => {
    const calls = stubFetch(pageOf, { truncateFirst: true });
    const rows = await fetchTerMonth(42, '09-2026', { retries: 2 });
    expect(rows).toHaveLength(ppfasRows.length);
    expect(calls.length).toBe(ppfasPages.length + 1);
  });
});

describe('loadTer: cache, freshness, fallbacks', () => {
  const amcs = [{ id: 9, name: 'PPFAS Mutual Fund' }];
  const now = new Date('2026-10-07T00:00:00Z');
  it('monthParam formats MM-YYYY', () => {
    expect(monthParam(new Date('2026-01-31T10:00:00Z'))).toBe('01-2026');
  });
  it('first run fetches and stores; a run within 7 days uses the cache with no calls', async () => {
    const store = new MemoryTerStore();
    const calls = stubFetch(pageOf);
    const a = await loadTer({ store, amcs, now });
    expect(a).toMatchObject({ fetched: 1, fromCache: 0, failed: [], stale: [] });
    expect(a.rows).toHaveLength(7);
    expect(a.rows[0].amc).toBe('PPFAS Mutual Fund');
    const n = calls.length;
    const b = await loadTer({ store, amcs, now: new Date('2026-10-12T00:00:00Z') });
    expect(b).toMatchObject({ fetched: 0, fromCache: 1 });
    expect(calls.length).toBe(n);
  });
  it('a cache older than 7 days is refreshed', async () => {
    const store = new MemoryTerStore();
    stubFetch(pageOf);
    await loadTer({ store, amcs, now });
    const c = await loadTer({ store, amcs, now: new Date('2026-10-20T00:00:00Z') });
    expect(c.fetched).toBe(1);
  });
  it('if the fetch fails, an older cache is used and reported stale; with no cache the fund house is reported failed', async () => {
    const store = new MemoryTerStore();
    stubFetch(pageOf);
    await loadTer({ store, amcs, now });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    const s = await loadTer({ store, amcs, now: new Date('2026-10-30T00:00:00Z') });
    expect(s.stale).toEqual(['PPFAS Mutual Fund']);
    expect(s.rows).toHaveLength(7);
    const f = await loadTer({ store: new MemoryTerStore(), amcs, now });
    expect(f.failed).toEqual(['PPFAS Mutual Fund']);
    expect(f.rows).toHaveLength(0);
  }, 60_000);
  it('falls back to the previous month when the current month has no rows yet', async () => {
    const calls = stubFetch((url) => (url.includes('Month=10-2026') ? { data: [], meta: { page: 1, pageSize: 100, total: 0, pageCount: 0 } } : pageOf(url)));
    const r = await loadTer({ store: new MemoryTerStore(), amcs, now });
    expect(r.rows).toHaveLength(7);
    expect(calls.some((u) => u.includes('Month=09-2026'))).toBe(true);
  });
  it('skip mode makes no calls and returns nothing; cached mode never fetches', async () => {
    const calls = stubFetch(pageOf);
    expect((await loadTer({ store: new MemoryTerStore(), amcs, now, mode: 'skip' })).rows).toHaveLength(0);
    expect((await loadTer({ store: new MemoryTerStore(), amcs, now, mode: 'cached' })).rows).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });
});

describe('AUM', () => {
  const sample = fx<{ years: { id: number; financial_year: string }[]; periods: unknown; partial: { data: unknown[] }; full: { data: unknown[] } }>('aum-sample.json');
  it('parses the real table: lakh to crore (AMFI 445,276.72 lakh = 4,452.77 crore, as TigZig reports)', () => {
    const { crore, names } = parseAumTable(sample.full.data as never);
    expect(crore.get(100033)).toBe(4452.77);
    expect(names.get(100033)).toContain('Large');
  });
  it('a scheme’s AUM is the sum of AMFI’s two figures; blanks are skipped', () => {
    const { crore } = parseAumTable([{ schemes: [
      { AMFI_Code: 1, SchemeNAVName: 'A', AverageAumForTheMonth: { x: 10000, y: 5000 } },
      { AMFI_Code: 2, SchemeNAVName: 'B', AverageAumForTheMonth: { x: null, y: '2500' } },
      { AMFI_Code: 3, SchemeNAVName: 'C', AverageAumForTheMonth: { x: null, y: null } },
      { AMFI_Code: 'bad', SchemeNAVName: 'D', AverageAumForTheMonth: { x: 1 } },
    ] }]);
    expect(crore.get(1)).toBe(150);
    expect(crore.get(2)).toBe(25);
    expect(crore.has(3)).toBe(false);
    expect(crore.size).toBe(2);
  });
  const sizeOf = (b: unknown[]) => parseAumTable(b as never).crore.size;
  function stubAum() {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(String(url));
      const u = new URL(String(url));
      if (!u.searchParams.has('fyId')) return new Response(JSON.stringify({ type: 'years', data: sample.years }));
      if (!u.searchParams.has('periodId')) return new Response(JSON.stringify({ type: 'periods', data: { financial_year: 'x', periods: [{ id: 1, period: 'July - September 2026' }, { id: 2, period: 'April - June 2026' }] } }));
      return new Response(JSON.stringify(u.searchParams.get('periodId') === '1' ? sample.partial : sample.full));
    }));
    return calls;
  }
  it('skips the newest quarter when it is only partly published and uses the previous one', async () => {
    const partial = sizeOf(sample.partial.data);
    const full = sizeOf(sample.full.data);
    expect(full).toBeGreaterThan(partial); // fixture precondition
    stubAum();
    const q = await loadAum({ store: new MemoryAumStore(), minRows: partial + 1 });
    expect(q?.period).toBe('April - June 2026');
    expect(q?.crore.get(100033)).toBe(4452.77);
  });
  it('a finished quarter is cached: the second run makes no table call', async () => {
    const store = new MemoryAumStore();
    const calls = stubAum();
    const minRows = sizeOf(sample.partial.data) + 1;
    await loadAum({ store, minRows });
    const tableCalls = () => calls.filter((c) => c.includes('periodId=')).length;
    const before = tableCalls();
    expect((await loadAum({ store, minRows }))?.period).toBe('April - June 2026');
    expect(tableCalls()).toBe(before + 1); // only the newer, still-partial quarter is re-checked
  });
  it('returns null (so the build degrades, not fails) when AMFI cannot be reached or nothing is complete', async () => {
    stubAum();
    expect(await loadAum({ store: new MemoryAumStore(), minRows: 10_000 })).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await loadAum({ store: new MemoryAumStore() })).toBeNull();
    expect(MIN_AUM_ROWS).toBeGreaterThan(1000);
  });
});
