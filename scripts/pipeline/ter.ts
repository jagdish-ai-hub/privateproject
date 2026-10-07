/**
 * Expense ratio (TER) from AMFI's website API.
 *
 * Source: `GET https://www.amfiindia.com/api/populate-te-rdata-revised` (and `/api/populate-mf` for the
 * list of fund houses). Verified behaviour (October 2026):
 * - pages hold at most 100 rows, even if a larger `pageSize` is requested;
 * - TER is disclosed daily, so one scheme has about 30 rows per month: keep the newest date;
 * - one row holds BOTH plans (`R_*` Regular, `D_*` Direct);
 * - a plan that does not exist (ETFs have only one) is reported as `0.0000`: that means "none",
 *   never a zero fee;
 * - rows carry a name and category but no AMFI scheme code, so they are joined by name.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { classifyCategory, type Plan } from './classify.ts';
import { fetchJson, type FetchOptions, type RateLimiter } from './history.ts';

const API = 'https://www.amfiindia.com/api';

/** One plan's expense ratio, in percent of assets per year. */
export interface TerParts {
  /** Base expense ratio. */
  ber: number;
  brokerage: number;
  transaction: number;
  /** Statutory levies (GST, STT and similar). */
  levies: number;
  /** Total expense ratio. */
  total: number;
}

/** The newest TER disclosure for one scheme (both plans). */
export interface TerRow {
  /** NSDL scheme code (AMFI's TER identifier; not the AMFI scheme code). */
  nsdlCode: string;
  name: string;
  /** Raw AMFI category, e.g. "Equity Schemes - Small Cap Fund". */
  category: string;
  /** ISO date `YYYY-MM-DD` of the disclosure. */
  date: string;
  /** `null` when the scheme has no Regular plan. */
  regular: TerParts | null;
  /** `null` when the scheme has no Direct plan. */
  direct: TerParts | null;
}

/** A fund house in AMFI's list. */
export interface Amc {
  id: number;
  name: string;
}

/** Raw row from the TER endpoint (all numbers are strings). */
export interface RawTerRow {
  NSDLSchemeCode?: string;
  Scheme_Name?: string;
  SchemeCat_Desc?: string;
  TER_Date?: string;
  R_BER?: string; R_BrokerageCost?: string; R_TransactionCost?: string; R_StatutoryLevies?: string; R_TER?: string;
  D_BER?: string; D_BrokerageCost?: string; D_TransactionCost?: string; D_StatutoryLevies?: string; D_TER?: string;
}

/** Number from AMFI's string, or `NaN`. */
const num = (v: string | undefined): number => (v === undefined || v === '' ? Number.NaN : Number(v));

/**
 * Read one plan's parts, or `null` if the plan does not exist.
 *
 * A total of exactly 0 (or a missing / non-numeric total) means AMFI has no such plan for the scheme.
 *
 * @param total - The plan's `*_TER` string.
 * @param ber - `*_BER`.
 * @param brokerage - `*_BrokerageCost`.
 * @param transaction - `*_TransactionCost`.
 * @param levies - `*_StatutoryLevies`.
 * @returns The parts, or `null`.
 */
function planParts(total?: string, ber?: string, brokerage?: string, transaction?: string, levies?: string): TerParts | null {
  const t = num(total);
  if (!Number.isFinite(t) || t <= 0) return null;
  const n = (v: string | undefined): number => (Number.isFinite(num(v)) ? num(v) : 0);
  return { ber: n(ber), brokerage: n(brokerage), transaction: n(transaction), levies: n(levies), total: t };
}

/**
 * Convert a raw API row into a {@link TerRow}.
 *
 * @param r - Raw row.
 * @returns The row, or `null` if it has no code, name, or date, or neither plan has a TER.
 */
export function parseTerRow(r: RawTerRow): TerRow | null {
  if (!r.NSDLSchemeCode || !r.Scheme_Name || !r.TER_Date) return null;
  const regular = planParts(r.R_TER, r.R_BER, r.R_BrokerageCost, r.R_TransactionCost, r.R_StatutoryLevies);
  const direct = planParts(r.D_TER, r.D_BER, r.D_BrokerageCost, r.D_TransactionCost, r.D_StatutoryLevies);
  if (!regular && !direct) return null;
  return { nsdlCode: r.NSDLSchemeCode, name: r.Scheme_Name.trim(), category: r.SchemeCat_Desc ?? '', date: r.TER_Date.slice(0, 10), regular, direct };
}

/**
 * Keep only the newest disclosure for each scheme.
 *
 * @param rows - Parsed rows, any order, possibly many dates per scheme.
 * @returns One row per NSDL scheme code (the newest date wins).
 */
export function latestPerScheme(rows: readonly TerRow[]): TerRow[] {
  const best = new Map<string, TerRow>();
  for (const r of rows) {
    const cur = best.get(r.nsdlCode);
    if (!cur || r.date > cur.date) best.set(r.nsdlCode, r);
  }
  return [...best.values()];
}

/**
 * The TER that applies to a scheme variant.
 *
 * - Direct plan: the Direct total. Regular plan: the Regular total.
 * - No plan (ETFs): whichever plan AMFI filled in; if both are filled and differ, `null` (ambiguous).
 * - Plan unknown: `null`. We do not guess.
 *
 * @param row - The scheme's TER row.
 * @param plan - The variant's plan.
 * @returns TER in percent, or `null`.
 */
export function pickTer(row: TerRow, plan: Plan): number | null {
  if (plan === 'direct') return row.direct?.total ?? null;
  if (plan === 'regular') return row.regular?.total ?? null;
  if (plan === 'na') {
    if (row.direct && row.regular) return row.direct.total === row.regular.total ? row.direct.total : null;
    return (row.direct ?? row.regular)?.total ?? null;
  }
  return null;
}

/** The TER parts of the plan that applies to a variant (same rules as {@link pickTer}). */
export function pickTerParts(row: TerRow, plan: Plan): TerParts | null {
  if (plan === 'direct') return row.direct;
  if (plan === 'regular') return row.regular;
  if (plan === 'na') return row.direct && row.regular ? null : (row.direct ?? row.regular);
  return null;
}

/**
 * Normalise a scheme name for joining: lower case, plan / option / payout-frequency words removed,
 * `&` as "and", punctuation collapsed.
 *
 * @param name - Scheme name from any source.
 * @returns A comparable key.
 * @example
 * normalizeName('Parag Parikh Flexi Cap Fund - Direct Plan - Growth'); // "parag parikh flexi cap fund"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(direct|regular)(\s+plan)?\b/g, ' ')
    .replace(/\b(growth|idcw|dividend|option|payout|reinvestment|re-investment|monthly|weekly|daily|quarterly|annual|fortnightly|bonus|plan)\b/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalise a fund-house name so AMFI's TER list and NAVAll.txt agree
 * (e.g. "Aditya Birla Sun Life Mutual Fund" vs "Aditya Birla Sun Life AMC Ltd").
 *
 * @param name - Fund house name.
 * @returns A comparable key.
 */
export function amcKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(mutual fund|asset management company|amc|limited|ltd|private|pvt|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Lookup from (fund house, base name) to TER rows. */
export interface TerIndex {
  find(amc: string, name: string, category: string): TerRow | null;
  /** The fund-house keys present in the TER data (see {@link amcKey}). */
  amcKeys: Set<string>;
}

/**
 * Index TER rows for joining to schemes.
 *
 * Two TER rows can share a fund house and base name (for example a regular fund and a similarly named
 * series); the scheme's classified category then decides. If it cannot decide, the join fails
 * (`null`) rather than pick one.
 *
 * @param rows - Newest TER rows (see {@link latestPerScheme}), tagged with their fund house.
 * @returns An index with a `find` method.
 */
export function buildTerIndex(rows: readonly (TerRow & { amc: string })[]): TerIndex {
  // Defence in depth: several dates of the same scheme must never look like several schemes.
  const newest = new Map<string, TerRow & { amc: string }>();
  for (const r of rows) {
    const k = `${r.amc}|${r.nsdlCode}`;
    const cur = newest.get(k);
    if (!cur || r.date > cur.date) newest.set(k, r);
  }
  const map = new Map<string, (TerRow & { amc: string })[]>();
  for (const r of newest.values()) {
    const key = `${amcKey(r.amc)}|${normalizeName(r.name)}`;
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  return {
    amcKeys: new Set([...newest.values()].map((r) => amcKey(r.amc))),
    find(amc, name, category) {
      const hits = map.get(`${amcKey(amc)}|${normalizeName(name)}`);
      if (!hits) return null;
      if (hits.length === 1) return hits[0];
      const wanted = classifyCategory(category).category;
      const same = hits.filter((h) => classifyCategory(`Open Ended Schemes(${h.category})`).category === wanted);
      return same.length === 1 ? same[0] : null;
    },
  };
}

/** Cached TER data for one fund house. */
export interface TerCacheEntry {
  /** ISO timestamp of when it was fetched. */
  fetchedAt: string;
  /** The `MM-YYYY` month the rows came from. */
  month: string;
  rows: TerRow[];
}

/** Where fetched TER data is kept between runs (swap for S3 / R2 / Redis by implementing both methods). */
export interface TerStore {
  get(mfId: number): TerCacheEntry | null;
  set(mfId: number, entry: TerCacheEntry): void;
}

/** Default store: one JSON file per fund house. */
export class FileTerStore implements TerStore {
  private readonly dir: string;

  /**
   * Create a store rooted at a directory.
   *
   * @param dir - Directory for the cache files (created on first write).
   */
  constructor(dir: string) {
    this.dir = dir;
  }

  /**
   * Read a fund house's cached rows.
   *
   * @param mfId - AMFI fund house id.
   * @returns The entry or `null`.
   */
  get(mfId: number): TerCacheEntry | null {
    const p = `${this.dir}/${mfId}.json`;
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, 'utf8')) as TerCacheEntry;
    } catch {
      return null;
    }
  }

  /**
   * Write a fund house's rows.
   *
   * @param mfId - AMFI fund house id.
   * @param entry - Data to store.
   */
  set(mfId: number, entry: TerCacheEntry): void {
    const p = `${this.dir}/${mfId}.json`;
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(entry));
  }
}

/** In-memory store for tests. */
export class MemoryTerStore implements TerStore {
  private readonly map = new Map<number, TerCacheEntry>();

  /**
   * Read from memory.
   *
   * @param mfId - AMFI fund house id.
   * @returns The entry or `null`.
   */
  get(mfId: number): TerCacheEntry | null {
    return this.map.get(mfId) ?? null;
  }

  /**
   * Write to memory.
   *
   * @param mfId - AMFI fund house id.
   * @param entry - Data to store.
   */
  set(mfId: number, entry: TerCacheEntry): void {
    this.map.set(mfId, entry);
  }
}

/**
 * List AMFI's fund houses.
 *
 * @param opts - Retry / rate-limit options.
 * @returns The fund houses (empty if the call returns nothing).
 */
export async function fetchAmcs(opts: FetchOptions = {}): Promise<Amc[]> {
  const raw = await fetchJson<{ mfId: string; mfName: string }[]>(`${API}/populate-mf`, opts);
  return (raw ?? []).map((a) => ({ id: Number(a.mfId), name: a.mfName })).filter((a) => Number.isFinite(a.id) && a.id > 0);
}

/** `MM-YYYY` for a date (UTC), as the TER endpoint expects. */
export function monthParam(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
}

/**
 * Fetch every page of one fund house's TER rows for a month (open-ended schemes, all categories).
 *
 * @param mfId - AMFI fund house id.
 * @param month - `MM-YYYY`.
 * @param opts - Retry / rate-limit options. The limiter spaces the page requests.
 * @returns Parsed rows (all dates of that month); empty if the month has none.
 * @throws If a page keeps failing after retries (AMFI answers a throttled request with truncated JSON).
 */
export async function fetchTerMonth(mfId: number, month: string, opts: FetchOptions = {}): Promise<TerRow[]> {
  const rows: TerRow[] = [];
  for (let page = 1; ; page++) {
    const url = `${API}/populate-te-rdata-revised?MF_ID=${mfId}&Month=${month}&strCat=-1&strType=1&page=${page}&pageSize=100`;
    const body = await fetchJson<{ data?: RawTerRow[]; meta?: { pageCount?: number } }>(url, opts);
    for (const r of body?.data ?? []) {
      const parsed = parseTerRow(r);
      if (parsed) rows.push(parsed);
    }
    if (!body?.meta?.pageCount || page >= body.meta.pageCount) break;
  }
  return rows;
}

/** How TER data is refreshed. */
export type TerMode = 'auto' | 'refresh' | 'cached' | 'skip';

/** Options for {@link loadTer}. */
export interface LoadTerOptions {
  store: TerStore;
  mode?: TerMode;
  /** Re-fetch a fund house when its cache is older than this many days (default 7). */
  ttlDays?: number;
  /** Current time (injectable for tests). */
  now?: Date;
  limiter?: RateLimiter;
  /** Progress callback. */
  log?: (msg: string) => void;
  /** Fund houses to use instead of asking AMFI (tests). */
  amcs?: Amc[];
}

/** Result of {@link loadTer}. */
export interface LoadedTer {
  /** Newest row per scheme, tagged with the fund house. */
  rows: (TerRow & { amc: string })[];
  fetched: number;
  fromCache: number;
  /** Fund houses that could not be fetched and had no cache (their schemes get no TER). */
  failed: string[];
  /** Fund houses served from an out-of-date cache because the fetch failed. */
  stale: string[];
}

/**
 * Load TER rows for all fund houses, using the cache where it is fresh.
 *
 * Per fund house: use the cache if it is younger than `ttlDays`; otherwise fetch the current month
 * (falling back to the previous month if it has no rows yet). If a fetch fails, an older cache is
 * used and reported as stale; with no cache the fund house is reported as failed. Never throws for a
 * single fund house, so one AMFI hiccup cannot break the whole build.
 *
 * @param o - Options.
 * @returns The rows and a summary of what happened.
 */
export async function loadTer(o: LoadTerOptions): Promise<LoadedTer> {
  const mode = o.mode ?? 'auto';
  const ttlMs = (o.ttlDays ?? 7) * 86_400_000;
  const now = o.now ?? new Date();
  const out: LoadedTer = { rows: [], fetched: 0, fromCache: 0, failed: [], stale: [] };
  if (mode === 'skip') return out;
  const amcs = o.amcs ?? (await fetchAmcs({ limiter: o.limiter }));
  for (const amc of amcs) {
    const cached = o.store.get(amc.id);
    const fresh = cached !== null && now.getTime() - Date.parse(cached.fetchedAt) < ttlMs;
    let entry = cached;
    if (mode === 'refresh' || (mode === 'auto' && !fresh)) {
      try {
        let month = monthParam(now);
        let rows = await fetchTerMonth(amc.id, month, { limiter: o.limiter });
        if (rows.length === 0) {
          const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
          month = monthParam(prev);
          rows = await fetchTerMonth(amc.id, month, { limiter: o.limiter });
        }
        entry = { fetchedAt: now.toISOString(), month, rows: latestPerScheme(rows) };
        o.store.set(amc.id, entry);
        out.fetched++;
        o.log?.(`  TER ${amc.name}: ${entry.rows.length} schemes (${month})`);
      } catch (e) {
        o.log?.(`  TER ${amc.name}: fetch failed (${String(e)})`);
        if (cached) out.stale.push(amc.name);
        else out.failed.push(amc.name);
        entry = cached;
      }
    } else if (entry) out.fromCache++;
    if (entry) for (const r of entry.rows) out.rows.push({ ...r, amc: amc.name });
  }
  return out;
}
