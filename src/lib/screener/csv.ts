import type { Column } from './columns.ts';
import { rawValue } from './cells.ts';
import type { Prepared } from './query.ts';

/** Quote a CSV field when it contains a comma, quote or newline. */
function esc(v: string | number | null): string {
  if (v === null) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build CSV text for the given rows and visible columns.
 *
 * Percent-type columns are written as percent numbers (12.34, not 0.1234) with the unit in
 * the header, so they open correctly in a spreadsheet. Missing values are empty cells.
 *
 * @param p - Prepared dataset.
 * @param rows - Row indices to export (all filtered rows, not just the visible page).
 * @param columns - Visible columns, in display order.
 * @returns CSV text with a header row (CRLF line endings).
 */
export function toCsv(p: Prepared, rows: readonly number[], columns: readonly Column[]): string {
  const { data } = p;
  const isPct = (c: Column): boolean => c.kind === 'pct' || c.kind === 'plainPct';
  const header = ['Scheme code', 'Fund', 'Plan', 'Option', ...columns.map((c) => (isPct(c) ? `${c.label} (%)` : c.label))];
  const lines = [header.map(esc).join(',')];
  for (const i of rows) {
    const cells = columns.map((c) => {
      const v = rawValue(p, i, c.key);
      if (v === null || typeof v === 'string') return esc(v);
      if (isPct(c)) return esc(Math.round(v * 10_000) / 100);
      return esc(c.kind === 'nav' ? Math.round(v * 10_000) / 10_000 : Math.round(v * 100) / 100);
    });
    lines.push([data.code[i], data.name[i], data.dict.plan[data.plan[i]], data.dict.option[data.option[i]]].map(esc).concat(cells).join(','));
  }
  return lines.join('\r\n');
}
