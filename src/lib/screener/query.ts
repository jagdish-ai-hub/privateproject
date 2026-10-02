import { RANGE_SCALE, isMetricKey } from './columns.ts';
import type { Filters, MetricKey, RangeKey, ScreenerData, SortKey, ViewState } from './types.ts';

/** Seconds-free constant: days in a year, for fund age. */
const DAYS_PER_YEAR = 365.25;

/** A dataset plus precomputed lookups so filtering and sorting stay fast on ~9k rows. */
export interface Prepared {
  data: ScreenerData;
  /** Lower-cased "name amc" per row, for text search. */
  haystack: string[];
  /** Fund age in years per row (as of the dataset's newest NAV date). */
  age: Float64Array;
}

/**
 * Precompute search text and ages once after the data loads.
 *
 * @param data - Parsed screener.json.
 * @returns A {@link Prepared} dataset to pass to {@link applyView}.
 */
export function prepare(data: ScreenerData): Prepared {
  const newest = data.navDate.reduce((a, b) => (b > a ? b : a), 0);
  const haystack = data.name.map((n, i) => `${n} ${data.dict.amc[data.amc[i]]}`.toLowerCase());
  const age = Float64Array.from(data.inception, (d) => (newest - d) / DAYS_PER_YEAR);
  return { data, haystack, age };
}

/**
 * Turn a list of selected labels into a set of dictionary indices (empty list = no restriction).
 *
 * @param labels - Selected human-readable values.
 * @param dict - The dictionary for that column.
 * @returns A Set of indices, or `null` when there is no restriction.
 */
function indexSet(labels: readonly string[], dict: readonly string[]): Set<number> | null {
  if (labels.length === 0) return null;
  const out = new Set<number>();
  for (const l of labels) {
    const i = dict.indexOf(l);
    if (i >= 0) out.add(i);
  }
  return out; // may be empty -> matches nothing, which is correct for an unknown label
}

/**
 * Indices of rows that pass every filter, in dataset order.
 *
 * Null handling: a row with no value for a metric is excluded only if a range filter is set on
 * that metric.
 *
 * @param p - Prepared dataset.
 * @param f - Filters.
 * @returns Row indices.
 */
export function filterIndices(p: Prepared, f: Filters): number[] {
  const { data } = p;
  const amc = indexSet(f.amc, data.dict.amc);
  const asset = indexSet(f.assetClass, data.dict.assetClass);
  const cat = indexSet(f.category, data.dict.category);
  const plan = indexSet(f.plan, data.dict.plan);
  const opt = indexSet(f.option, data.dict.option);
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const ranges = (Object.entries(f.ranges) as [RangeKey, { min?: number; max?: number }][])
    .filter(([, r]) => r.min !== undefined || r.max !== undefined)
    .map(([key, r]) => ({
      key,
      min: r.min ?? -Infinity,
      max: r.max ?? Infinity,
      scale: RANGE_SCALE[key],
      col: key === 'age' ? null : data.metrics[key as MetricKey],
    }));

  const out: number[] = [];
  for (let i = 0; i < data.count; i++) {
    if (amc && !amc.has(data.amc[i])) continue;
    if (asset && !asset.has(data.assetClass[i])) continue;
    if (cat && !cat.has(data.category[i])) continue;
    if (plan && !plan.has(data.plan[i])) continue;
    if (opt && !opt.has(data.option[i])) continue;
    if (words.length && !words.every((w) => p.haystack[i].includes(w))) continue;
    let ok = true;
    for (const r of ranges) {
      const raw = r.col ? r.col[i] : p.age[i];
      if (raw === null || raw === undefined) { ok = false; break; }
      const v = raw * r.scale;
      if (v < r.min || v > r.max) { ok = false; break; }
    }
    if (ok) out.push(i);
  }
  return out;
}

/**
 * Sort row indices. Missing values always go last, whichever direction is chosen, so
 * sorting by "5Y return" never buries real values under blanks. Ties break by name, then code.
 *
 * @param p - Prepared dataset.
 * @param idx - Indices to sort (not mutated).
 * @param key - Column to sort by.
 * @param dir - Direction.
 * @returns A new sorted array.
 */
export function sortIndices(p: Prepared, idx: readonly number[], key: SortKey, dir: 'asc' | 'desc'): number[] {
  const { data } = p;
  const sign = dir === 'asc' ? 1 : -1;
  const value = (i: number): number | string | null => {
    switch (key) {
      case 'name': return data.name[i].toLowerCase();
      case 'amc': return data.dict.amc[data.amc[i]].toLowerCase();
      case 'category': return data.dict.category[data.category[i]].toLowerCase();
      case 'nav': return data.nav[i];
      case 'age': return p.age[i];
      default: return isMetricKey(key) ? data.metrics[key][i] : null;
    }
  };
  return [...idx].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === null && vb === null) return tie(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va < vb) return -sign;
    if (va > vb) return sign;
    return tie(a, b);
  });

  function tie(a: number, b: number): number {
    return data.name[a].localeCompare(data.name[b]) || data.code[a] - data.code[b];
  }
}

/** One page of results. */
export interface PageResult {
  /** Row indices on this page. */
  rows: number[];
  /** Rows matching the filters, before pagination. */
  total: number;
  /** 1-based page actually shown (clamped into range). */
  page: number;
  pages: number;
  /** 1-based position of the first / last row shown, for "Showing 51-100 of 1,234". */
  from: number;
  to: number;
}

/**
 * Apply filters, sort and pagination in one call.
 *
 * @param p - Prepared dataset.
 * @param view - Full view state.
 * @returns The page of row indices plus counts.
 */
export function applyView(p: Prepared, view: ViewState): PageResult {
  const matched = sortIndices(p, filterIndices(p, view.filters), view.sort.key, view.sort.dir);
  const total = matched.length;
  const pages = Math.max(1, Math.ceil(total / view.size));
  const page = Math.min(Math.max(1, view.page), pages);
  const start = (page - 1) * view.size;
  const rows = matched.slice(start, start + view.size);
  return { rows, total, page, pages, from: total === 0 ? 0 : start + 1, to: start + rows.length };
}

/**
 * Compact page-number list with gaps: [1, '…', 4, 5, 6, '…', 20].
 *
 * @param page - Current page (1-based).
 * @param pages - Total pages.
 * @returns Numbers and '…' markers.
 */
export function pageList(page: number, pages: number): (number | '…')[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}
