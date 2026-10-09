import { cellFor } from '../../lib/screener/cells.ts';
import { COLUMN_TERM, type TermKey } from '../../lib/glossary.ts';
import { InfoTip } from '../InfoTip.tsx';
import { fundSlug } from '../../lib/slug.ts';
import type { Column } from '../../lib/screener/columns.ts';
import type { Prepared } from '../../lib/screener/query.ts';
import type { SortKey, ViewState } from '../../lib/screener/types.ts';

interface Props {
  /** `null` while loading: skeleton rows are shown. */
  prepared: Prepared | null;
  rows: number[];
  columns: Column[];
  sort: ViewState['sort'];
  onSort: (key: SortKey) => void;
  compact: boolean;
}

const PLAN_LABEL: Record<string, string> = { direct: 'Direct', regular: 'Regular', na: '', unknown: 'Plan not stated' };
const OPTION_LABEL: Record<string, string> = { growth: 'Growth', idcw: 'IDCW', bonus: 'Bonus', other: '' };

/**
 * Results. From the `sm` breakpoint up: a table with a sticky header and first column and sortable headers.
 * On phones: one card per fund with every visible number in a 3-column grid (no sideways scrolling) and a
 * "Sort by" control, since there are no column headers to tap. Both use the same rows, cells and sort state.
 * Skeletons are shown while loading.
 */
export function ResultsTable({ prepared, rows, columns, sort, onSort, compact }: Props) {
  const pad = compact ? 'py-1.5' : 'py-3';
  const th = `px-3 ${compact ? 'py-1.5' : 'py-2.5'} text-xs font-medium text-muted whitespace-nowrap bg-bg border-b border-line sticky top-0 z-10`;
  const ariaSort = (k: SortKey): 'ascending' | 'descending' | 'none' => (sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const arrow = (k: SortKey): string => (sort.key === k ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '');
  const header = (key: SortKey, label: string, help: string, numeric: boolean, first = false) => (
    <th scope="col" aria-sort={ariaSort(key)} class={`${th} ${numeric ? 'text-right' : 'text-left'} ${first ? 'left-0 z-20 min-w-64' : ''}`} title={help}>
      <button type="button" class="font-medium hover:text-fg" onClick={() => onSort(key)}>{label}{arrow(key)}</button>
      {COLUMN_TERM[key] && <InfoTip term={COLUMN_TERM[key] as TermKey} instance={`col-${key}`} />}
    </th>
  );

  const d0 = prepared?.data;
  const numericCols = columns.filter((c) => c.kind !== 'text');
  const sortTerm = COLUMN_TERM[sort.key];
  const cards = (
    <div class="sm:hidden" data-testid="result-cards">
      <div class="mb-2 flex items-center gap-2 text-sm">
        <label for="m-sort" class="shrink-0 text-muted">Sort by</label>
        <select
          id="m-sort" value={sort.key} disabled={!prepared}
          onChange={(e) => onSort((e.currentTarget as HTMLSelectElement).value as SortKey)}
          class="h-9 min-w-0 flex-1 rounded-md border border-line bg-bg px-2"
        >
          <option value="name">Fund name</option>
          {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <button
          type="button" disabled={!prepared} onClick={() => onSort(sort.key)}
          aria-label={sort.dir === 'asc' ? 'Sorted low to high; switch to high to low' : 'Sorted high to low; switch to low to high'}
          class="h-9 shrink-0 rounded-md border border-line px-3"
        >{['name', 'amc', 'category'].includes(sort.key) ? (sort.dir === 'asc' ? 'A → Z' : 'Z → A') : sort.dir === 'asc' ? 'Low → high' : 'High → low'}</button>
        {sortTerm && <InfoTip term={sortTerm} instance="m-sort" />}
      </div>
      <ul class="divide-y divide-line overflow-hidden rounded-md border border-line">
        {prepared === null || !d0
          ? Array.from({ length: 6 }, (_, r) => (
              <li key={r} class="space-y-2 p-3" aria-hidden="true">
                <div class="skeleton h-4 w-56" />
                <div class="grid grid-cols-3 gap-3">{[0, 1, 2].map((k) => <div key={k} class="skeleton h-8" />)}</div>
              </li>
            ))
          : rows.map((i) => {
              const tags = [d0.dict.category[d0.category[i]], PLAN_LABEL[d0.dict.plan[d0.plan[i]]], OPTION_LABEL[d0.dict.option[d0.option[i]]]].filter(Boolean).join(' · ');
              return (
                <li key={d0.code[i]} class="p-3" data-testid="result-card">
                  <a href={`/fund/${fundSlug(d0.name[i], d0.code[i])}/`} class="font-medium hover:underline">{d0.name[i]}</a>
                  <div class="text-xs text-muted">{tags}</div>
                  {numericCols.length > 0 && (
                    <dl class="mt-2 grid grid-cols-3 gap-x-3 gap-y-2">
                      {numericCols.map((c) => {
                        const cell = cellFor(prepared, i, c);
                        return (
                          <div key={c.key}>
                            <dt class={`text-[11px] leading-tight ${sort.key === c.key ? 'font-semibold text-fg' : 'text-muted'}`}>{c.label}</dt>
                            <dd class={`num text-left text-sm ${cell.cls}`}>{cell.text}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </li>
              );
            })}
      </ul>
    </div>
  );

  return (
    <>
    {cards}
    <div class="hidden overflow-auto rounded-md border border-line sm:block" style={{ maxHeight: '75vh' }}>
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">Mutual funds matching the current filters</caption>
        <thead>
          <tr>
            {header('name', 'Fund', 'Fund name', false, true)}
            {columns.map((c) => <>{header(c.key, c.label, c.help, c.kind !== 'text')}</>)}
          </tr>
        </thead>
        <tbody>
          {prepared === null
            ? Array.from({ length: 10 }, (_, r) => (
                <tr key={r} class="border-b border-line" aria-hidden="true">
                  <td class={`sticky left-0 bg-bg px-3 ${pad}`}><div class="skeleton h-4 w-56" /></td>
                  {columns.map((c) => <td key={c.key} class={`px-3 ${pad}`}><div class={`skeleton h-4 ${c.kind === 'text' ? 'w-28' : 'ml-auto w-14'}`} /></td>)}
                </tr>
              ))
            : rows.map((i) => {
                const d = prepared.data;
                const tags = [PLAN_LABEL[d.dict.plan[d.plan[i]]], OPTION_LABEL[d.dict.option[d.option[i]]]].filter(Boolean).join(' · ');
                return (
                  <tr key={d.code[i]} class="group border-b border-line hover:bg-subtle">
                    <td class={`sticky left-0 z-[5] bg-bg px-3 ${pad} group-hover:bg-subtle`}>
                      <a href={`/fund/${fundSlug(d.name[i], d.code[i])}/`} class="font-medium hover:underline">{d.name[i]}</a>
                      {!compact && tags && <div class="text-xs text-muted">{tags}</div>}
                    </td>
                    {columns.map((c) => {
                      const cell = cellFor(prepared, i, c);
                      return <td key={c.key} class={`px-3 ${pad} ${cell.numeric ? 'num' : 'whitespace-nowrap'} ${cell.cls}`}>{cell.text}</td>;
                    })}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
    </>
  );
}
