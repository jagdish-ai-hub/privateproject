import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { NavSeries } from '../../lib/calc/series.ts';
import { defaultWindow, rebase, type CompareInput } from '../../lib/compare.ts';
import { cellFor } from '../../lib/screener/cells.ts';
import { COLUMNS } from '../../lib/screener/columns.ts';
import { filterIndices } from '../../lib/screener/query.ts';
import { fundSlug } from '../../lib/slug.ts';
import type { Filters } from '../../lib/screener/types.ts';
import { CompareChart } from './CompareChart.tsx';
import { COLUMN_TERM, type TermKey } from '../../lib/glossary.ts';
import { InfoTip } from '../InfoTip.tsx';
import { InsightsPanel } from '../InsightsPanel.tsx';
import { compareInsights, insightFundAt } from '../../lib/insights.ts';
import { useScreenerData } from '../screener/useScreenerData.ts';

const MAX_FUNDS = 4;
const RANGES = [{ label: '1Y', months: 12 }, { label: '3Y', months: 36 }, { label: '5Y', months: 60 }, { label: 'Max', months: 0 }];
const NO_FILTERS: Filters = { q: '', amc: [], assetClass: [], category: [], plan: [], option: [], ranges: {} };

type NavState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; series: NavSeries };

/** Scheme codes from `?f=1,2,3` (max 4, numbers only). */
function codesFromUrl(): number[] {
  const raw = new URLSearchParams(location.search).get('f') ?? '';
  return [...new Set(raw.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_FUNDS);
}

/**
 * Compare 2-4 funds: search and add funds, see a rebased NAV chart for a common window, and a
 * side-by-side table of every metric. The selection lives in the URL (`?f=code,code`).
 */
export function Compare() {
  const { state, retry } = useScreenerData();
  const [codes, setCodes] = useState<number[]>([]);
  const [navs, setNavs] = useState<Record<number, NavState>>({});
  const [query, setQuery] = useState('');
  const [months, setMonths] = useState<number | null>(null);
  // A fund keeps its colour slot while it stays selected: removing one fund must not repaint the others.
  const slots = useRef(new Map<number, number>());
  for (const c of [...slots.current.keys()]) if (!codes.includes(c)) slots.current.delete(c);
  for (const c of codes) {
    if (slots.current.has(c)) continue;
    const used = new Set(slots.current.values());
    slots.current.set(c, [0, 1, 2, 3].find((n) => !used.has(n)) ?? 0);
  }
  const slotOf = (code: number): number => slots.current.get(code) ?? 0;

  useEffect(() => {
    setCodes(codesFromUrl());
    const onPop = (): void => setCodes(codesFromUrl());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const setSelection = (next: number[]): void => {
    setCodes(next);
    setMonths(null);
    const url = location.pathname + (next.length ? `?f=${next.join(',')}` : '');
    history.replaceState(null, '', url);
  };

  // Fetch each selected fund's NAV history once.
  useEffect(() => {
    for (const code of codes) {
      if (navs[code]) continue;
      setNavs((n) => ({ ...n, [code]: { status: 'loading' } }));
      fetch(`/data/nav/${code}.json`)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ d: number[]; n: number[] }>; })
        .then((j) => setNavs((n) => ({ ...n, [code]: { status: 'ready', series: { days: j.d, navs: j.n } } })))
        .catch(() => setNavs((n) => ({ ...n, [code]: { status: 'error' } })));
    }
  }, [codes]);

  const prepared = state.status === 'ready' ? state.prepared : null;
  const rowOf = useMemo(() => {
    const m = new Map<number, number>();
    prepared?.data.code.forEach((c, i) => m.set(c, i));
    return m;
  }, [prepared]);

  const selected = codes.map((c) => ({ code: c, row: rowOf.get(c) })).filter((x): x is { code: number; row: number } => x.row !== undefined);
  const inputs: CompareInput[] = codes.flatMap((c) => { const s = navs[c]; return s?.status === 'ready' ? [{ code: c, ...s.series }] : []; });
  const allLoaded = codes.length > 0 && inputs.length === codes.length;
  const windowMonths = months ?? (allLoaded ? defaultWindow(inputs) : 12);
  const result = useMemo(() => (allLoaded && inputs.length >= 2 ? rebase(inputs, windowMonths) : null), [allLoaded, codes, navs, windowMonths]);

  const suggestions = useMemo(() => {
    if (!prepared || query.trim().length < 2) return [];
    const d = prepared.data;
    const rows = filterIndices(prepared, { ...NO_FILTERS, q: query }).filter((i) => !codes.includes(d.code[i]));
    const pref = (i: number): number => (d.dict.plan[d.plan[i]] === 'direct' ? 0 : 1) + (d.dict.option[d.option[i]] === 'growth' ? 0 : 2);
    return rows.sort((a, b) => pref(a) - pref(b) || d.name[a].localeCompare(d.name[b])).slice(0, 8);
  }, [prepared, query, codes]);

  if (state.status === 'error') {
    return (
      <div role="alert" class="rounded-md border border-line p-6 text-center">
        <p class="font-medium">Could not load fund data</p>
        <p class="mt-1 text-sm text-muted">{state.message}</p>
        <button type="button" onClick={retry} class="mt-4 h-9 rounded-md bg-accent px-4 text-sm text-accent-fg">Retry</button>
      </div>
    );
  }

  const d = prepared?.data;
  const categories = new Set(selected.map((s) => d?.category[s.row]));
  const insights = useMemo(() => {
    if (!d || selected.length < 2) return null;
    const newest = Math.max(...d.navDate);
    return compareInsights(selected.map((s) => insightFundAt(d, s.row, newest)));
  }, [d, codes]);
  const rangeAvailable = (m: number): boolean => allLoaded && inputs.length >= 2 && rebase(inputs, m) !== null;

  return (
    <div class="space-y-5">
      <div class="relative max-w-xl">
        <input
          type="search" value={query} disabled={!prepared || codes.length >= MAX_FUNDS}
          placeholder={codes.length >= MAX_FUNDS ? `Maximum ${MAX_FUNDS} funds selected` : 'Search a fund to add (at least 2 letters)…'}
          aria-label="Search a fund to add" onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          class="h-10 w-full rounded-md border border-line bg-bg px-3 text-sm"
        />
        {suggestions.length > 0 && (
          <ul class="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-line bg-bg shadow-sm" role="listbox" aria-label="Matching funds">
            {suggestions.map((i) => (
              <li key={d?.code[i]}>
                <button
                  type="button" role="option" aria-selected="false" class="block w-full px-3 py-2 text-left text-sm hover:bg-subtle"
                  onClick={() => { setSelection([...codes, (d as NonNullable<typeof d>).code[i]]); setQuery(''); }}
                >
                  {d?.name[i]}<span class="block text-xs text-muted">{d?.dict.category[d.category[i]]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!prepared && codes.length > 0 && <div class="skeleton h-24 w-full" aria-busy="true" />}

      {selected.length > 0 && d && (
        <ul class="flex flex-wrap gap-2" aria-label="Selected funds">
          {selected.map((s) => (
            <li key={s.code} class="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm">
              <svg class="shrink-0" width="14" height="6" aria-hidden="true"><line x1="0" y1="3" x2="14" y2="3" stroke={`var(--s${slotOf(s.code) + 1})`} stroke-width="2" stroke-linecap="round" /></svg>
              <span class="max-w-72 truncate">{d.name[s.row]}</span>
              <button type="button" class="text-muted hover:text-fg" aria-label={`Remove ${d.name[s.row]}`} onClick={() => setSelection(codes.filter((c) => c !== s.code))}>×</button>
            </li>
          ))}
        </ul>
      )}

      {codes.length < 2 && (
        <p class="rounded-md border border-line p-8 text-center text-sm text-muted" data-testid="compare-empty">
          Pick at least two funds to compare their growth and metrics side by side.
        </p>
      )}

      {categories.size > 1 && (
        <p class="rounded-md border border-line bg-subtle p-3 text-sm text-muted">These funds are in different categories, so their returns and risk may not be directly comparable.</p>
      )}

      {codes.length >= 2 && (
        <section aria-label="Growth comparison">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div role="group" aria-label="Comparison window" class="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.label} type="button" disabled={!rangeAvailable(r.months)} aria-pressed={allLoaded && windowMonths === r.months}
                  onClick={() => setMonths(r.months)}
                  class={`h-8 min-w-10 rounded-md border px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${allLoaded && windowMonths === r.months ? 'border-accent bg-accent text-accent-fg' : 'border-line hover:bg-subtle'}`}
                >{r.label}</button>
              ))}
            </div>
            {result && <p class="text-xs text-muted">Common window ends {new Date(result.endDay * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>}
          </div>
          {inputs.length < codes.length && !Object.values(navs).some((n) => n.status === 'error') && <div class="skeleton h-96 w-full" aria-busy="true" aria-label="Loading chart" />}
          {Object.values(navs).some((n) => n.status === 'error') && <p role="alert" class="rounded-md border border-line p-6 text-sm text-muted">Chart data for one of the funds could not be loaded. Reload the page to try again.</p>}
          {allLoaded && !result && <p class="rounded-md border border-line p-6 text-sm text-muted">One of these funds is too new for this window. Choose a shorter one.</p>}
          {result && d && <CompareChart lines={result.lines.map((l) => ({ ...l, name: d.name[rowOf.get(l.code) as number], slot: slotOf(l.code) }))} />}
        </section>
      )}

      {insights && <InsightsPanel title="What the numbers say" headline={insights.headline} items={insights.items} caveats={insights.caveats} idPrefix="cmp" />}

      {selected.length >= 2 && prepared && (
        <section aria-label="Metrics comparison" class="overflow-auto rounded-md border border-line">
          <table class="w-full text-sm">
            <caption class="sr-only">Side-by-side metrics</caption>
            <thead>
              <tr class="border-b border-line text-xs text-muted">
                <th scope="col" class="sticky left-0 bg-bg px-3 py-2 text-left font-medium">Metric</th>
                {selected.map((s) => <th key={s.code} scope="col" class="min-w-44 px-3 py-2 text-right font-medium"><a class="hover:underline" href={`/fund/${fundSlug(prepared.data.name[s.row], s.code)}/`}>{prepared.data.name[s.row]}</a></th>)}
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map((c) => (
                <tr key={c.key} class="border-b border-line last:border-0">
                  <th scope="row" class="sticky left-0 bg-bg px-3 py-2 text-left font-normal text-muted" title={c.help}>{c.label}{COLUMN_TERM[c.key] && <InfoTip term={COLUMN_TERM[c.key] as TermKey} instance={`cmp-${c.key}`} />}</th>
                  {selected.map((s) => {
                    const cell = cellFor(prepared, s.row, c);
                    return <td key={s.code} class={`px-3 py-2 ${cell.numeric ? 'num' : 'text-right'} ${cell.cls}`}>{cell.text}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
