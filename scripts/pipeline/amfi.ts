import { parseDMonY } from '../../src/lib/calc/dates.ts';

/** One scheme row from AMFI's NAVAll.txt, plus the AMC and category headers above it. */
export interface AmfiScheme {
  /** AMFI scheme code (same as MFapi `schemeCode`). */
  code: number;
  /** ISIN for payout / growth option, or null. */
  isinGrowth: string | null;
  /** ISIN for dividend reinvestment, or null. */
  isinReinvest: string | null;
  /** Scheme name as published. */
  name: string;
  /** Raw "Plan" column (may be empty). */
  planCol: string;
  /** Raw "Option" column (may be empty). */
  optionCol: string;
  /** Latest NAV. */
  nav: number;
  /** Day number of the NAV date. */
  navDay: number;
  /** Fund house, e.g. "Axis Mutual Fund". */
  amc: string;
  /** Raw category header, e.g. "Open Ended Schemes(Equity Scheme - Large Cap Fund)". */
  rawCategory: string;
}

const CATEGORY_RE = /^(Open Ended|Close Ended|Interval Fund) Schemes?\s*\((.*)\)\s*$/;

/**
 * Parse AMFI's `NAVAll.txt`.
 *
 * File layout: a header row, then blocks. A line without `;` is either a category header
 * (`Open Ended Schemes(Equity Scheme - Large Cap Fund)`) or a fund house name
 * (`Axis Mutual Fund`); scheme rows have 8 `;`-separated columns:
 * `code; ISIN growth; ISIN reinvest; name; plan; option; NAV; date`.
 *
 * Rows with a non-numeric NAV ("N.A.") or an unparseable date are skipped.
 *
 * @param text - Full file contents.
 * @returns Parsed schemes in file order.
 */
export function parseNavAll(text: string): AmfiScheme[] {
  const out: AmfiScheme[] = [];
  let amc = '';
  let rawCategory = '';
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!line.includes(';')) {
      if (CATEGORY_RE.test(line)) rawCategory = line;
      else amc = line;
      continue;
    }
    if (!/^\d/.test(line)) continue; // column header row
    const c = line.split(';').map((x) => x.trim());
    if (c.length < 8) continue;
    const nav = Number.parseFloat(c[6]);
    const navDay = parseDMonY(c[7]);
    if (!Number.isFinite(nav) || nav <= 0 || navDay === null) continue;
    out.push({
      code: Number(c[0]),
      isinGrowth: clean(c[1]),
      isinReinvest: clean(c[2]),
      name: c[3],
      planCol: c[4],
      optionCol: c[5],
      nav,
      navDay,
      amc,
      rawCategory,
    });
  }
  return out;
}

/** AMFI uses "-" or empty for "no ISIN". */
function clean(v: string): string | null {
  return v && v !== '-' ? v : null;
}
