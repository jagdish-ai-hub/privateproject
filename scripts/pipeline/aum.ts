/**
 * Scheme-wise average AUM from AMFI's website API.
 *
 * Source: `GET https://www.amfiindia.com/api/average-aum-schemewise` (called in three steps: financial
 * years, quarters of a year, then the table for one quarter with `MF_ID=0` meaning all fund houses).
 * Verified behaviour (October 2026):
 * - rows carry `AMFI_Code`, the same scheme code as the NAV data, so the join is exact;
 * - each scheme has two figures (`ExcludingFundOfFundsDomesticButIncludingFundOfFundsOverseas` and
 *   `FundOfFundsDomestic`); the scheme's own AUM is their sum;
 * - values are in Rs lakh (divide by 100 for Rs crore);
 * - the newest quarter is published piecemeal (299 schemes at first, 8,500+ once complete), so the
 *   newest quarter is not necessarily usable: choose the newest one with a full table.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fetchJson, type FetchOptions } from './history.ts';

const API = 'https://www.amfiindia.com/api/average-aum-schemewise';

/** A quarter table is "complete" if it lists at least this many schemes. */
export const MIN_AUM_ROWS = 5000;

/** Parsed AUM for one quarter. */
export interface AumQuarter {
  /** Financial year label, e.g. "April 2026 - March 2027". */
  fy: string;
  /** Quarter label, e.g. "April - June 2026". */
  period: string;
  /** AMFI scheme code -> AUM in Rs crore. */
  crore: Map<number, number>;
  /** AMFI scheme code -> the scheme name AMFI uses in this table. */
  names: Map<number, string>;
}

/** Raw shapes of the table response (only the parts used). */
interface RawBlock {
  schemes?: {
    SchemeNAVName?: string;
    AMFI_Code?: number | string;
    AverageAumForTheMonth?: Record<string, number | string | null>;
  }[];
}

/**
 * Parse a quarter table into AUM per scheme.
 *
 * @param blocks - The `data` array of the table response.
 * @returns Maps keyed by AMFI scheme code: AUM in Rs crore (sum of AMFI's two fields, converted from
 *   lakh) and AMFI's scheme names. Schemes with no finite AUM figure are left out.
 */
export function parseAumTable(blocks: readonly RawBlock[]): { crore: Map<number, number>; names: Map<number, string> } {
  const crore = new Map<number, number>();
  const names = new Map<number, string>();
  for (const b of blocks) {
    for (const s of b.schemes ?? []) {
      const code = Number(s.AMFI_Code);
      if (!Number.isInteger(code) || code <= 0) continue;
      const vals = Object.values(s.AverageAumForTheMonth ?? {}).map((v) => (v === null || v === '' ? Number.NaN : Number(v)));
      const finite = vals.filter((v) => Number.isFinite(v));
      if (finite.length === 0) continue;
      const lakh = finite.reduce((a, b2) => a + b2, 0);
      crore.set(code, Math.round(lakh) / 100);
      if (s.SchemeNAVName) names.set(code, s.SchemeNAVName);
    }
  }
  return { crore, names };
}

/** Where a finished quarter is kept (swap for S3 / R2 by implementing both methods). */
export interface AumStore {
  get(period: string): AumQuarter | null;
  set(q: AumQuarter): void;
}

/** File name part for a period label. */
const slug = (period: string): string => period.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Default store: one JSON file per finished quarter. */
export class FileAumStore implements AumStore {
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
   * Read a cached quarter.
   *
   * @param period - Quarter label.
   * @returns The quarter or `null`.
   */
  get(period: string): AumQuarter | null {
    const p = `${this.dir}/${slug(period)}.json`;
    if (!existsSync(p)) return null;
    try {
      const j = JSON.parse(readFileSync(p, 'utf8')) as { fy: string; period: string; crore: [number, number][]; names: [number, string][] };
      return { fy: j.fy, period: j.period, crore: new Map(j.crore), names: new Map(j.names) };
    } catch {
      return null;
    }
  }

  /**
   * Cache a finished quarter.
   *
   * @param q - The quarter.
   */
  set(q: AumQuarter): void {
    const p = `${this.dir}/${slug(q.period)}.json`;
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ fy: q.fy, period: q.period, crore: [...q.crore], names: [...q.names] }));
  }
}

/** In-memory store for tests. */
export class MemoryAumStore implements AumStore {
  private readonly map = new Map<string, AumQuarter>();

  /**
   * Read from memory.
   *
   * @param period - Quarter label.
   * @returns The quarter or `null`.
   */
  get(period: string): AumQuarter | null {
    return this.map.get(period) ?? null;
  }

  /**
   * Write to memory.
   *
   * @param q - The quarter.
   */
  set(q: AumQuarter): void {
    this.map.set(q.period, q);
  }
}

/** Options for {@link loadAum}. */
export interface LoadAumOptions {
  store: AumStore;
  opts?: FetchOptions;
  /** Minimum scheme count for a quarter to count as complete (default {@link MIN_AUM_ROWS}). */
  minRows?: number;
  /** How many financial years to look back through (default 2). */
  years?: number;
  log?: (msg: string) => void;
}

/**
 * Find the newest complete quarter of AUM data and return it.
 *
 * Walks financial years (newest first) and their quarters (newest first). A quarter already in the
 * store is used as is (finished quarters never change); otherwise its table is fetched and used if it
 * has at least `minRows` schemes, then stored. A partly published quarter is skipped.
 *
 * @param o - Options.
 * @returns The quarter, or `null` if AMFI could not be reached or no quarter is complete.
 */
export async function loadAum(o: LoadAumOptions): Promise<AumQuarter | null> {
  const minRows = o.minRows ?? MIN_AUM_ROWS;
  const yearsBody = await fetchJson<{ data?: { id: number; financial_year: string }[] }>(`${API}?strType=Categorywise&MF_ID=0`, o.opts);
  for (const y of (yearsBody?.data ?? []).slice(0, o.years ?? 2)) {
    const pBody = await fetchJson<{ data?: { periods?: { id: number; period: string }[] } }>(`${API}?fyId=${y.id}&strType=Categorywise&MF_ID=0`, o.opts);
    for (const p of pBody?.data?.periods ?? []) {
      const cached = o.store.get(p.period);
      if (cached && cached.crore.size >= minRows) {
        o.log?.(`  AUM ${p.period}: ${cached.crore.size} schemes (cached)`);
        return cached;
      }
      const t = await fetchJson<{ data?: RawBlock[] }>(`${API}?strType=Categorywise&fyId=${y.id}&periodId=${p.id}&MF_ID=0`, o.opts);
      const parsed = parseAumTable(t?.data ?? []);
      if (parsed.crore.size >= minRows) {
        const q: AumQuarter = { fy: y.financial_year, period: p.period, ...parsed };
        o.store.set(q);
        o.log?.(`  AUM ${p.period}: ${q.crore.size} schemes`);
        return q;
      }
      o.log?.(`  AUM ${p.period}: only ${parsed.crore.size} schemes, not complete yet; trying the previous quarter`);
    }
  }
  return null;
}
