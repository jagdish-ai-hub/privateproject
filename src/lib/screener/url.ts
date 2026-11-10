import { isMetricKey, RANGE_FILTERS } from './columns.ts';
import type { Filters, RangeKey, SortKey, ViewState } from './types.ts';

/** Page sizes the UI offers. */
export const PAGE_SIZES = [25, 50, 100] as const;

/**
 * The view a first-time visitor sees: Direct plans, Growth option, equity funds, largest fund size first.
 * Fund size is a fact, not a verdict: it brings the best-known funds to the top without ranking by past returns.
 * Defaults are left out of the URL, so a clean `/` is the default view.
 */
export const DEFAULT_VIEW: ViewState = {
  filters: { q: '', amc: [], assetClass: ['Equity'], category: [], plan: ['direct'], option: ['growth'], ranges: {} },
  sort: { key: 'aum', dir: 'desc' },
  page: 1,
  size: 50,
};

const LIST_FIELDS = ['amc', 'assetClass', 'category', 'plan', 'option'] as const;
/** Short URL parameter name for each list filter. */
const PARAM: Record<(typeof LIST_FIELDS)[number], string> = { amc: 'amc', assetClass: 'type', category: 'cat', plan: 'plan', option: 'opt' };

const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Encode a view as URL query parameters. Anything equal to the default is omitted. Lists are
 * joined with `~` (fund house and category names contain commas and `&`).
 *
 * An explicitly empty list (e.g. "any plan") is written as an empty value so it can be told
 * apart from "not specified" (which means the default).
 *
 * @param view - View state.
 * @returns A query string without the leading `?` (empty for the default view).
 */
export function serializeView(view: ViewState): string {
  const sp = new URLSearchParams();
  const { filters: f } = view;
  if (f.q.trim()) sp.set('q', f.q.trim());
  // While searching, an empty fund-type list means "every type" (see parseView), so only a chosen type is written.
  const searching = f.q.trim() !== '';
  for (const field of LIST_FIELDS) {
    if (field === 'assetClass' && searching) {
      if (f.assetClass.length) sp.set(PARAM.assetClass, f.assetClass.join('~'));
      continue;
    }
    if (!sameList(f[field], DEFAULT_VIEW.filters[field])) sp.set(PARAM[field], f[field].join('~'));
  }
  for (const [key, r] of Object.entries(f.ranges) as [RangeKey, { min?: number; max?: number }][]) {
    if (r.min !== undefined) sp.set(`min_${key}`, String(r.min));
    if (r.max !== undefined) sp.set(`max_${key}`, String(r.max));
  }
  if (view.sort.key !== DEFAULT_VIEW.sort.key || view.sort.dir !== DEFAULT_VIEW.sort.dir) sp.set('sort', `${view.sort.key}:${view.sort.dir}`);
  if (view.page !== 1) sp.set('page', String(view.page));
  if (view.size !== DEFAULT_VIEW.size) sp.set('size', String(view.size));
  return sp.toString();
}

/**
 * Decode URL query parameters into a view. Unknown or malformed values fall back to
 * defaults instead of throwing, because anyone can edit a URL by hand.
 *
 * @param search - Query string, with or without the leading `?`.
 * @returns A complete view state.
 */
export function parseView(search: string): ViewState {
  const sp = new URLSearchParams(search.replace(/^\?/, ''));
  const filters: Filters = {
    q: sp.get('q') ?? '',
    amc: [...DEFAULT_VIEW.filters.amc], assetClass: [...DEFAULT_VIEW.filters.assetClass],
    category: [...DEFAULT_VIEW.filters.category], plan: [...DEFAULT_VIEW.filters.plan],
    option: [...DEFAULT_VIEW.filters.option], ranges: {},
  };
  for (const field of LIST_FIELDS) {
    const raw = sp.get(PARAM[field]);
    if (raw !== null) filters[field] = raw === '' ? [] : raw.split('~');
  }
  // A search link looks across every fund type unless it names one: the default view shows equity funds only,
  // and "/?q=liquid" must not come back empty.
  if (filters.q.trim() !== '' && sp.get(PARAM.assetClass) === null) filters.assetClass = [];
  for (const { key } of RANGE_FILTERS) {
    const min = num(sp.get(`min_${key}`));
    const max = num(sp.get(`max_${key}`));
    if (min !== undefined || max !== undefined) filters.ranges[key] = { ...(min !== undefined && { min }), ...(max !== undefined && { max }) };
  }
  let sort = DEFAULT_VIEW.sort;
  const s = sp.get('sort');
  if (s) {
    const [key, dir] = s.split(':');
    if (isSortKey(key) && (dir === 'asc' || dir === 'desc')) sort = { key, dir };
  }
  const page = Math.max(1, Math.floor(num(sp.get('page')) ?? 1));
  const sizeNum = num(sp.get('size'));
  const size = (PAGE_SIZES as readonly number[]).includes(sizeNum ?? -1) ? (sizeNum as 25 | 50 | 100) : DEFAULT_VIEW.size;
  return { filters, sort, page, size };
}

/** Parse a finite number, or `undefined`. */
function num(v: string | null): number | undefined {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Is this string a sortable column key? */
function isSortKey(k: string): k is SortKey {
  return k === 'name' || k === 'amc' || k === 'category' || k === 'nav' || k === 'age' || k === 'ter' || k === 'aum' || isMetricKey(k);
}

/**
 * Changes to apply when the filters change. When the search box goes from empty to filled while the fund type is
 * still the default (equity), the fund type is cleared, so a search finds a liquid or hybrid fund as well as an
 * equity one. A fund type the visitor chose themselves is left alone.
 *
 * @param current - The filters before the change.
 * @param patch - The change requested.
 * @returns The change to apply.
 */
export function withSearchWidening(current: Filters, patch: Partial<Filters>): Partial<Filters> {
  const startsSearching = patch.q !== undefined && patch.q.trim() !== '' && current.q.trim() === '';
  if (startsSearching && patch.assetClass === undefined && sameList(current.assetClass, DEFAULT_VIEW.filters.assetClass)) return { ...patch, assetClass: [] };
  return patch;
}
