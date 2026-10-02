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
  /** Spaces requests out to stay under the API's rate limit. */
  limiter?: RateLimiter;
}

/** Waits until it is this caller's turn to send a request. */
export interface RateLimiter {
  wait(): Promise<void>;
}

/**
 * Rate limiter that allows at most one request per `minIntervalMs` across all callers
 * (so concurrency cannot exceed the limit). Use `createRateLimiter(100)` for 10 requests/second.
 *
 * @param minIntervalMs - Minimum gap between two request starts; 0 disables limiting.
 * @returns A limiter whose `wait()` resolves when a request may start.
 */
export function createRateLimiter(minIntervalMs: number): RateLimiter {
  let nextSlot = 0;
  return {
    async wait() {
      if (minIntervalMs <= 0) return;
      const now = Date.now();
      const slot = Math.max(now, nextSlot);
      nextSlot = slot + minIntervalMs;
      if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
    },
  };
}

/** Seconds to wait from a `Retry-After` header (number of seconds), capped at 60; otherwise `null`. */
function retryAfterSeconds(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 60) : null;
}

/**
 * GET a URL and parse JSON, retrying with exponential backoff on network errors,
 * timeouts, HTTP 429 and 5xx. A `Retry-After` header on a 429 is honoured. Other 4xx
 * responses return `null` (e.g. unknown scheme).
 *
 * @param url - Full URL.
 * @param opts - Retry / timeout options.
 * @returns Parsed JSON, or `null` for a permanent 4xx.
 * @throws If every attempt fails.
 */
export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T | null> {
  const { retries = 4, timeoutMs = 30_000, limiter } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let waitMs = 500 * 2 ** attempt;
    try {
      await limiter?.wait();
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 429 && res.status < 500) return null;
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
      const hinted = res.status === 429 ? retryAfterSeconds(res.headers.get('retry-after')) : null;
      if (hinted !== null) waitMs = hinted * 1000;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, waitMs));
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
 * @param opts - Retry, timeout and rate-limit options.
 * @returns A clean series, or `null` if MFapi has no data for the scheme.
 */
export async function fetchHistory(code: number, fromDay?: number, opts: FetchOptions = {}): Promise<NavSeries | null> {
  const qs = fromDay === undefined ? '' : `?startDate=${formatIso(fromDay)}`;
  const body = await fetchJson<MfapiResponse>(`${MFAPI}/mf/${code}${qs}`, opts);
  if (!body || !Array.isArray(body.data)) return null;
  return parseSeries(body.data);
}

/**
 * Where downloaded histories are kept between runs. The pipeline only talks to this
 * interface, so the storage can be swapped without touching any other code: implement
 * `get` and `set` for the GitHub Actions cache, Cloudflare R2 / S3, Redis, a database...
 * and pass it to {@link getHistory}.
 */
export interface HistoryStore {
  /** The stored series for a scheme, or `null` if nothing is stored. */
  get(code: number): Promise<NavSeries | null> | NavSeries | null;
  /** Store (replace) the series for a scheme. */
  set(code: number, series: NavSeries): Promise<void> | void;
}

/** Default store: one gzipped JSON file per scheme in a directory (`{dir}/{code}.json.gz`). */
export class FileHistoryStore implements HistoryStore {
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
   * Read a scheme's series from its file.
   *
   * @param code - Scheme code.
   * @returns The series or `null`.
   */
  get(code: number): NavSeries | null {
    return readCache(`${this.dir}/${code}.json.gz`);
  }

  /**
   * Write a scheme's series to its file.
   *
   * @param code - Scheme code.
   * @param series - Series to store.
   */
  set(code: number, series: NavSeries): void {
    writeCache(`${this.dir}/${code}.json.gz`, series);
  }
}

/** In-memory store, useful for tests and as a template for other implementations. */
export class MemoryHistoryStore implements HistoryStore {
  private readonly map = new Map<number, NavSeries>();

  /**
   * Read from memory.
   *
   * @param code - Scheme code.
   * @returns The series or `null`.
   */
  get(code: number): NavSeries | null {
    return this.map.get(code) ?? null;
  }

  /**
   * Write to memory.
   *
   * @param code - Scheme code.
   * @param series - Series to store.
   */
  set(code: number, series: NavSeries): void {
    this.map.set(code, series);
  }
}

/**
 * Read a gzipped cache file (compact JSON `{d: days[], n: navs[]}`).
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
 * Write a series to a gzipped cache file (creating directories).
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
 * Get a scheme's full history using the store where possible.
 *
 * - Nothing stored: full download from MFapi (once per scheme, ever).
 * - Stored copy is current or 1-5 days behind: append AMFI's latest NAV, with no API call.
 * - Stored copy is further behind: download only the missing range from MFapi.
 *
 * The result is written back to the store.
 *
 * @param code - Scheme code.
 * @param store - Where histories are kept between runs.
 * @param latest - The latest NAV from NAVAll.txt (`{ day, nav }`).
 * @param opts - Retry, timeout and rate-limit options for MFapi calls.
 * @returns The up-to-date series, or `null` if MFapi has nothing and nothing is stored.
 */
export async function getHistory(
  code: number,
  store: HistoryStore,
  latest: { day: number; nav: number },
  opts: FetchOptions = {},
): Promise<NavSeries | null> {
  const cached = await store.get(code);
  if (!cached || cached.days.length === 0) {
    const full = await fetchHistory(code, undefined, opts);
    if (!full || full.days.length === 0) return null;
    await store.set(code, full);
    return full;
  }
  const lastDay = cached.days[cached.days.length - 1];
  if (latest.day <= lastDay) return cached;
  let merged: NavSeries;
  if (latest.day - lastDay <= PATCH_FROM_AMFI_MAX_GAP) {
    merged = mergeSeries(cached, { days: [latest.day], navs: [latest.nav] });
  } else {
    const gap = await fetchHistory(code, lastDay + 1, opts);
    merged = mergeSeries(cached, gap ?? { days: [latest.day], navs: [latest.nav] });
  }
  await store.set(code, merged);
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
