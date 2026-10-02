import { cellFor } from '../../lib/screener/cells.ts';
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

/** Result table: sticky header and first column, sortable headers, skeleton rows while loading. */
export function ResultsTable({ prepared, rows, columns, sort, onSort, compact }: Props) {
  const pad = compact ? 'py-1.5' : 'py-3';
  const th = `px-3 ${compact ? 'py-1.5' : 'py-2.5'} text-xs font-medium text-muted whitespace-nowrap bg-bg border-b border-line sticky top-0 z-10`;
  const ariaSort = (k: SortKey): 'ascending' | 'descending' | 'none' => (sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const arrow = (k: SortKey): string => (sort.key === k ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '');
  const header = (key: SortKey, label: string, help: string, numeric: boolean, first = false) => (
    <th scope="col" aria-sort={ariaSort(key)} class={`${th} ${numeric ? 'text-right' : 'text-left'} ${first ? 'left-0 z-20 min-w-64' : ''}`} title={help}>
      <button type="button" class="font-medium hover:text-fg" onClick={() => onSort(key)}>{label}{arrow(key)}</button>
    </th>
  );

  return (
    <div class="overflow-auto rounded-md border border-line" style={{ maxHeight: '75vh' }}>
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
  );
}
