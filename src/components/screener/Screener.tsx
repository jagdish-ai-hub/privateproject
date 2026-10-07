import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { formatDay } from '../../lib/format.ts';
import { COLUMNS } from '../../lib/screener/columns.ts';
import { toCsv } from '../../lib/screener/csv.ts';
import { applyView, filterIndices, sortIndices } from '../../lib/screener/query.ts';
import type { Filters, SortKey, ViewState } from '../../lib/screener/types.ts';
import { DEFAULT_VIEW, parseView, serializeView } from '../../lib/screener/url.ts';
import { FilterBar } from './FilterBar.tsx';
import { Pagination } from './Pagination.tsx';
import { ResultsTable } from './ResultsTable.tsx';
import { useScreenerData } from './useScreenerData.ts';

const DEFAULT_COLUMNS = COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key as string);

/** Read a localStorage value without ever throwing (private mode, blocked storage). */
function readStore(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStore(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable: preference just is not remembered */ }
}

/**
 * The screener: loads `screener.json` once, then filters, sorts and paginates in the browser.
 * The whole view (filters, sort, page, page size) lives in the URL query string, so Back /
 * Forward and shared links reproduce exactly what the user saw.
 */
export function Screener() {
  const { state, retry } = useScreenerData();
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const viewRef = useRef(view);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(DEFAULT_COLUMNS);
  const [compact, setCompact] = useState(false);

  // Read the URL and saved preferences after mount (the server-rendered HTML uses defaults).
  useEffect(() => {
    const initial = parseView(location.search);
    viewRef.current = initial;
    setView(initial);
    try {
      const saved = JSON.parse(readStore('mfs.columns') ?? 'null') as string[] | null;
      if (Array.isArray(saved) && saved.length) setVisibleKeys(saved.filter((k) => COLUMNS.some((c) => c.key === k)));
    } catch { /* ignore a corrupted saved value */ }
    setCompact(readStore('mfs.density') === 'compact');
    const onPop = (): void => { const v = parseView(location.search); viewRef.current = v; setView(v); };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  /** Apply a change to the view and mirror it into the URL (`push` adds a history entry). */
  const update = (change: (v: ViewState) => ViewState, mode: 'push' | 'replace' = 'push'): void => {
    const next = change(viewRef.current);
    viewRef.current = next;
    setView(next);
    const qs = serializeView(next);
    const url = location.pathname + (qs ? `?${qs}` : '');
    if (url !== location.pathname + location.search) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  };

  const onFilters = (patch: Partial<Filters>, mode: 'push' | 'replace' = 'push'): void =>
    update((v) => ({ ...v, filters: { ...v.filters, ...patch }, page: 1 }), mode);
  const onSort = (key: SortKey): void =>
    update((v) => ({ ...v, page: 1, sort: v.sort.key === key ? { key, dir: v.sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'name' || key === 'amc' || key === 'category' || key === 'ter' ? 'asc' : 'desc' } }));

  const prepared = state.status === 'ready' ? state.prepared : null;
  const result = useMemo(() => (prepared ? applyView(prepared, view) : null), [prepared, view]);
  const columns = useMemo(() => COLUMNS.filter((c) => visibleKeys.includes(c.key)), [visibleKeys]);
  const isDefault = serializeView(view) === '';

  const exportCsv = (): void => {
    if (!prepared) return;
    const all = sortIndices(prepared, filterIndices(prepared, view.filters), view.sort.key, view.sort.dir);
    const blob = new Blob([toCsv(prepared, all, columns)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mf-screener-${prepared.data.asOf}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section aria-label="Mutual fund screener" class="space-y-3">
      <FilterBar
        prepared={prepared} filters={view.filters} onFilters={onFilters} disabled={!prepared}
        visibleKeys={visibleKeys} onColumns={(k) => { setVisibleKeys(k); writeStore('mfs.columns', JSON.stringify(k)); }}
        compact={compact} onCompact={(c) => { setCompact(c); writeStore('mfs.density', c ? 'compact' : 'comfortable'); }}
        onExport={exportCsv} isDefault={isDefault} onReset={() => update(() => DEFAULT_VIEW)}
      />

      {state.status === 'error' ? (
        <div role="alert" class="rounded-md border border-line p-6 text-center">
          <p class="font-medium">Could not load fund data</p>
          <p class="mt-1 text-sm text-muted">{state.message}</p>
          <button type="button" onClick={retry} class="mt-4 h-9 rounded-md bg-accent px-4 text-sm text-accent-fg">Retry</button>
        </div>
      ) : (
        <>
          <div class="flex items-center justify-between text-xs text-muted">
            <span>{prepared ? <>NAV as of <span class="num">{formatDay(Date.parse(prepared.data.asOf) / 86_400_000)}</span></> : 'Loading funds…'}</span>
            <span>Sorted by {view.sort.key === 'name' ? 'name' : COLUMNS.find((c) => c.key === view.sort.key)?.label ?? view.sort.key} ({view.sort.dir === 'desc' ? 'high to low' : 'low to high'}); funds with no value come last</span>
          </div>
          {result && result.total === 0 ? (
            <div class="rounded-md border border-line p-10 text-center">
              <p class="font-medium">No funds match these filters</p>
              <p class="mt-1 text-sm text-muted">Try widening a range or removing a filter.</p>
              <button type="button" class="mt-4 h-9 rounded-md border border-line px-4 text-sm hover:bg-subtle" onClick={() => update(() => DEFAULT_VIEW)}>Clear filters</button>
            </div>
          ) : (
            <ResultsTable prepared={prepared} rows={result?.rows ?? []} columns={columns} sort={view.sort} onSort={onSort} compact={compact} />
          )}
          {result && (
            <Pagination
              page={result.page} pages={result.pages} from={result.from} to={result.to} total={result.total} size={view.size}
              onPage={(page) => update((v) => ({ ...v, page }))}
              onSize={(size) => update((v) => ({ ...v, size, page: 1 }))}
            />
          )}
        </>
      )}
    </section>
  );
}
