import { pageList } from '../../lib/screener/query.ts';
import { formatNum } from '../../lib/format.ts';
import { PAGE_SIZES } from '../../lib/screener/url.ts';

interface Props {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: 25 | 50 | 100) => void;
}

/** "Showing 51–100 of 1,234 funds", page-number buttons, and a rows-per-page selector. */
export function Pagination({ page, pages, from, to, total, size, onPage, onSize }: Props) {
  const btn = 'h-8 min-w-8 rounded-md border px-2 text-sm';
  return (
    <div class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <p class="text-muted" aria-live="polite">
        {total === 0 ? 'No funds' : <>Showing <span class="num">{formatNum(from, 0)}–{formatNum(to, 0)}</span> of <span class="num">{formatNum(total, 0)}</span> funds</>}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-muted">
          Rows
          <select
            class="h-8 rounded-md border border-line bg-bg px-2 text-fg" value={size}
            onChange={(e) => onSize(Number((e.currentTarget as HTMLSelectElement).value) as 25 | 50 | 100)}
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <nav class="flex items-center gap-1" aria-label="Pagination">
          <button type="button" class={`${btn} border-line disabled:opacity-40`} disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
          {pageList(page, pages).map((p, i) => p === '…'
            ? <span key={`gap${i}`} class="px-1 text-muted" aria-hidden="true">…</span>
            : <button
                key={p} type="button" aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}
                class={`${btn} num ${p === page ? 'border-accent bg-accent text-accent-fg' : 'border-line hover:bg-subtle'}`}
              >{p}</button>)}
          <button type="button" class={`${btn} border-line disabled:opacity-40`} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
        </nav>
      </div>
    </div>
  );
}
