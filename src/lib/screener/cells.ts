import { DASH, formatAum, formatNav, formatNum, formatPct, formatPlainPct, formatTer, signClass } from '../format.ts';
import type { Column } from './columns.ts';
import { numericValue, type Prepared } from './query.ts';

/** What a table cell shows. */
export interface Cell {
  /** Display text (never "0" or "NaN" for a missing value: that is {@link DASH}). */
  text: string;
  /** `pos`, `neg` or empty, for gain / loss colouring. */
  cls: string;
  /** True for right-aligned monospaced numbers. */
  numeric: boolean;
}

/**
 * Raw value behind a column for one row (before formatting).
 *
 * @param p - Prepared dataset.
 * @param i - Row index.
 * @param key - Column key.
 * @returns The value, or `null` if missing.
 */
export function rawValue(p: Prepared, i: number, key: Column['key']): number | string | null {
  const { data } = p;
  switch (key) {
    case 'name': return data.name[i];
    case 'amc': return data.dict.amc[data.amc[i]];
    case 'category': return data.dict.category[data.category[i]];
    default: return numericValue(p, i, key);
  }
}

/**
 * Format one cell according to its column kind.
 *
 * @param p - Prepared dataset.
 * @param i - Row index.
 * @param col - Column definition.
 * @returns Display text, colour class and alignment hint.
 */
export function cellFor(p: Prepared, i: number, col: Column): Cell {
  const v = rawValue(p, i, col.key);
  switch (col.kind) {
    case 'text': return { text: v === null ? DASH : String(v), cls: '', numeric: false };
    case 'nav': return { text: formatNav(v as number), cls: '', numeric: true };
    case 'age': return { text: v === null ? DASH : `${formatNum(v as number, 1)} yrs`, cls: '', numeric: true };
    case 'ter': return { text: formatTer(v as number | null), cls: '', numeric: true };
    case 'aum': return { text: formatAum(v as number | null), cls: '', numeric: true };
    case 'pct': return { text: formatPct(v as number | null), cls: signClass(v as number | null), numeric: true };
    case 'plainPct': return { text: formatPlainPct(v as number | null), cls: '', numeric: true };
    case 'num': return { text: formatNum(v as number | null), cls: signClass(v as number | null), numeric: true };
  }
}
