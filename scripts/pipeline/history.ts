import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { parseSeries, type NavSeries, type RawNavRow } from '../../src/lib/calc/series.ts';
import { formatIso } from '../../src/lib/calc/dates.ts';

/** Base URL of the MFapi.in REST API. */
export const MFAPI = 'https://api.mfapi.in';

/** Options for {@link fetchJson}. */
export interface FetchOptions {
  /** Retries after the first attempt (default 4). */
  retries?: number;
  /** Per-request timeout in ms (default 30000). */
  timeoutMs?: number;
}

/**
 * GET a URL and parse JSON, retrying with exponential backoff on network errors,
 * timeouts, HTTP 429 and 5xx. Other 4xx responses return `null` (e.g. unknown scheme).
 *
 * @param url - Full URL.
 * @param opts - Retry / timeout options.
 * @returns Parsed JSON, or `null` for a permanent 4xx.
 * @throws If every attempt fails.
 */
export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T | null> {
  const { retries = 4, timeoutMs = 30_000 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 429 && res.status < 500) return null;
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Shape of MFapi `/mf/{code}` responses (only the parts we use). */
interface MfapiResponse {
  status?: string;
  data?: RawNavRow[];
}

/**
 * Download a scheme's NAV history from MFapi.
 *
 * @param code - AMFI scheme code.
 * @param fromDay - Optional day number; only rows from this day onward are requested.
 * @returns A clean series, or `null` if MFapi has no data for the scheme.
 */
export async function fetchHistory(code: number, fromDay?: number): Promise<NavSeries | null> {
  const qs = fromDay === undefined ? '' : `?startDate=${formatIso(fromDay)}`;
  const body = await fetchJson<MfapiResponse>(`${MFAPI}/mf/${code}${qs}`);
  if (!body || !Array.isArray(body.data)) return null;
  return parseSeries(body.data);
}

/**
 * Read a cached series (gzipped compact JSON `{d: days[], n: navs[]}`).
 *
 * @param path - Cache file path.
 * @returns The series, or `null` if the file is missing or unreadable.
 */
export function readCache(path: string): NavSeries | null {
  if (!existsSync(path)) return null;
  try {
    const j = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8')) as { d: number[]; n: number[] };
    return { days: j.d, navs: j.n };
  } catch {
    return null;
  }
}

/**
 * Write a series to the cache file (creating directories).
 *
 * @param path - Cache file path.
 * @param s - Series to store.
 */
export function writeCache(path: string, s: NavSeries): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, gzipSync(JSON.stringify({ d: s.days, n: s.navs })));
}

/**
 * Merge new points into a series. New points win on the same day; result is sorted.
 *
 * @param base - Existing series.
 * @param extra - Points to add or overwrite.
 * @returns A new merged series.
 */
export function mergeSeries(base: NavSeries, extra: NavSeries): NavSeries {
  const map = new Map<number, number>();
  base.days.forEach((d, i) => map.set(d, base.navs[i]));
  extra.days.forEach((d, i) => map.set(d, extra.navs[i]));
  const days = [...map.keys()].sort((a, b) => a - b);
  return { days, navs: days.map((d) => map.get(d) as number) };
}

/** Largest number of missed days we patch from the AMFI latest NAV instead of calling MFapi. */
const PATCH_FROM_AMFI_MAX_GAP = 5;

/**
 * Get a scheme's full history using the cache where possible.
 *
 * - No cache: full download from MFapi (once per scheme, ever).
 * - Cache is current or 1-5 days behind: append AMFI's latest NAV, with no API call.
 * - Cache is further behind: download only the missing range from MFapi.
 *
 * The result is written back to the cache.
 *
 * @param code - Scheme code.
 * @param cachePath - Cache file for this scheme.
 * @param latest - The latest NAV from NAVAll.txt (`{ day, nav }`).
 * @returns The up-to-date series, or `null` if MFapi has nothing and there is no cache.
 */
export async function getHistory(code: number, cachePath: string, latest: { day: number; nav: number }): Promise<NavSeries | null> {
  const cached = readCache(cachePath);
  if (!cached || cached.days.length === 0) {
    const full = await fetchHistory(code);
    if (!full || full.days.length === 0) return null;
    writeCache(cachePath, full);
    return full;
  }
  const lastDay = cached.days[cached.days.length - 1];
  if (latest.day <= lastDay) return cached;
  let merged: NavSeries;
  if (latest.day - lastDay <= PATCH_FROM_AMFI_MAX_GAP) {
    merged = mergeSeries(cached, { days: [latest.day], navs: [latest.nav] });
  } else {
    const gap = await fetchHistory(code, lastDay + 1);
    merged = mergeSeries(cached, gap ?? { days: [latest.day], navs: [latest.nav] });
  }
  writeCache(cachePath, merged);
  return merged;
}

/**
 * Run `worker` over `items` with at most `limit` in flight at once.
 *
 * @param items - Work items.
 * @param limit - Max concurrency.
 * @param worker - Async function per item; errors are caught and returned in `errors`.
 * @param onProgress - Optional callback after each item with (done, total).
 * @returns Results in input order (`undefined` where the worker threw) and the error list.
 */
export async function pool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<{ results: (R | undefined)[]; errors: { index: number; error: unknown }[] }> {
  const results: (R | undefined)[] = new Array(items.length);
  const errors: { index: number; error: unknown }[] = [];
  let next = 0;
  let done = 0;
  const run = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await worker(items[i], i);
      } catch (error) {
        errors.push({ index: i, error });
      }
      done++;
      onProgress?.(done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return { results, errors };
}
