/**
 * Date helpers for the calculation library.
 *
 * Dates are represented as integer "day numbers": whole days since 1970-01-01 UTC.
 * Integer days avoid every time-zone and daylight-saving pitfall of `Date`, and
 * make "N days between" a plain subtraction.
 */

const MS_PER_DAY = 86_400_000;

/**
 * Convert a calendar date to a day number.
 *
 * @param year - Full year, e.g. 2026.
 * @param month - Month 1-12.
 * @param day - Day of month 1-31.
 * @returns Whole days since 1970-01-01 UTC.
 * @example
 * toDayNumber(1970, 1, 2); // 1
 */
export function toDayNumber(year: number, month: number, day: number): number {
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/**
 * Convert a day number back to `{ year, month, day }` (month is 1-12).
 *
 * @param dayNumber - Whole days since 1970-01-01 UTC.
 * @returns The calendar parts.
 */
export function fromDayNumber(dayNumber: number): { year: number; month: number; day: number } {
  const d = new Date(dayNumber * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Parse a `dd-mm-yyyy` string (MFapi format) into a day number.
 *
 * The format is parsed explicitly. `new Date("01-10-2026")` would read it as
 * January 10th, which is exactly the class of bug this module exists to avoid.
 *
 * @param text - A date like "01-10-2026".
 * @returns The day number, or `null` if the text is not a valid calendar date.
 * @example
 * parseDmy('01-10-2026') === toDayNumber(2026, 10, 1); // true
 * parseDmy('31-02-2026'); // null (no such date)
 */
export function parseDmy(text: string): number | null {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(text.trim());
  if (!m) return null;
  return validated(Number(m[3]), Number(m[2]), Number(m[1]));
}

/**
 * Parse an AMFI `dd-Mon-yyyy` string (NAVAll.txt format, e.g. "01-Oct-2026").
 *
 * @param text - A date like "01-Oct-2026".
 * @returns The day number, or `null` if invalid.
 */
export function parseDMonY(text: string): number | null {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = months.indexOf(m[2].toLowerCase()) + 1;
  if (month === 0) return null;
  return validated(Number(m[3]), month, Number(m[1]));
}

/** Build a day number only if the calendar date really exists (rejects 31-02). */
function validated(year: number, month: number, day: number): number | null {
  const n = toDayNumber(year, month, day);
  const back = fromDayNumber(n);
  return back.year === year && back.month === month && back.day === day ? n : null;
}

/**
 * Format a day number as ISO `YYYY-MM-DD`.
 *
 * @param dayNumber - Whole days since 1970-01-01 UTC.
 * @returns ISO date string (also what lightweight-charts accepts as a time).
 * @example
 * formatIso(toDayNumber(2026, 10, 1)); // "2026-10-01"
 */
export function formatIso(dayNumber: number): string {
  const { year, month, day } = fromDayNumber(dayNumber);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Add (or subtract) whole calendar months, clamping the day to the target month's length.
 *
 * Example: 29 Feb 2024 minus 12 months is 28 Feb 2023 (not 1 Mar 2023).
 *
 * @param dayNumber - Starting date.
 * @param months - Months to add; negative to go back.
 * @returns The shifted date.
 * @example
 * addMonths(toDayNumber(2024, 2, 29), -12) === toDayNumber(2023, 2, 28); // true
 */
export function addMonths(dayNumber: number, months: number): number {
  const { year, month, day } = fromDayNumber(dayNumber);
  const total = year * 12 + (month - 1) + months;
  const y = Math.floor(total / 12);
  const mo = (total % 12 + 12) % 12 + 1;
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return toDayNumber(y, mo, Math.min(day, lastDay));
}
