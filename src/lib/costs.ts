/**
 * Helpers for the "Costs and size" block on fund pages: the Direct-vs-Regular gap and a
 * readable label for AMFI's disclosure dates. Pure functions, no I/O.
 */
import type { TerDetail, TerParts } from './data.ts';

/** The same scheme's two plans side by side. */
export interface TerGap {
  regular: number;
  direct: number;
  /** Regular minus Direct, in percentage points per year (rounded to 2 dp). */
  gap: number;
  /** Extra rupees per year a Regular plan costs on Rs 1,00,000 invested. */
  perLakh: number;
}

/**
 * Compare the two plans of one scheme.
 *
 * @param detail - Both plans' disclosed TER, or null.
 * @returns The gap, or null unless both plans have a TER (a plan that does not exist is never compared with 0).
 */
export function terGap(detail: TerDetail | null | undefined): TerGap | null {
  const r = detail?.regular?.total;
  const d = detail?.direct?.total;
  if (r === undefined || d === undefined || r === null || d === null) return null;
  const gap = Math.round((r - d) * 100) / 100;
  return { regular: r, direct: d, gap, perLakh: Math.round(gap * 1000) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Turn an ISO date ("2026-09-30") into "30 Sep 2026" without time-zone surprises.
 *
 * @param isoDate - `YYYY-MM-DD`.
 * @returns Readable date, or the input unchanged if it is not in that shape.
 */
export function formatIsoDate(isoDate: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? '');
  if (!m) return isoDate ?? '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Statutory levies at or above this share of assets (percent a year) are explained on the page. */
export const HIGH_LEVIES = 0.5;

/**
 * Explain a large statutory-levies part of the TER. Since April 2026 AMFI's total expense ratio
 * includes statutory levies such as STT on derivative trades, which depend on how much the fund
 * trades (arbitrage and quant funds show high totals) and are not set by the fund house.
 *
 * @param parts - The plan's TER breakdown.
 * @returns One sentence, or null when the levies are small or unknown.
 */
export function leviesNote(parts: TerParts | null | undefined): string | null {
  if (!parts || parts.levies < HIGH_LEVIES) return null;
  return `${parts.levies.toFixed(2)}% of this total is statutory levies such as STT, which depend on how much the fund trades and are not set by the fund house. The base expense ratio, the part the fund house sets, is ${parts.ber.toFixed(2)}%. Compare like with like: funds that trade derivatives heavily, such as arbitrage funds, show a high total.`;
}
