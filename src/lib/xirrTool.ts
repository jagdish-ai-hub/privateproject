/**
 * Input handling for the XIRR calculator page: turns typed rows (a date, an amount, money in or out)
 * plus today's value into dated cash flows and solves for the yearly rate. The solver is the one used
 * for the SIP returns on fund pages (src/lib/calc/xirr.ts).
 */
import { toDayNumber } from './calc/dates.ts';
import { xirr, type CashFlow } from './calc/xirr.ts';

export interface XirrRow {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  amount: number;
  /** 'in' = money you invested, 'out' = money you took out. */
  kind: 'in' | 'out';
}

export interface XirrOutcome {
  /** Yearly rate as a fraction, or null when it cannot be worked out. */
  rate: number | null;
  invested: number;
  /** Withdrawals plus the value at the end. */
  received: number;
  gain: number;
  /** Days from the first cash flow to the valuation date. */
  days: number;
  /** Why there is no rate, when there is none. */
  problem: 'date' | 'order' | 'empty' | 'nosolution' | null;
}

/** Day number of an ISO date, or null when it is not a real date. */
export function isoToDay(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const day = toDayNumber(y, mo, d);
  return new Date(day * 86_400_000).getUTCDate() === d ? day : null;
}

/**
 * XIRR of a set of investments and withdrawals, valued on a date.
 *
 * @param rows - Each investment or withdrawal with its date. Rows with a zero amount are ignored.
 * @param value - What the investment is worth on `valueDate`.
 * @param valueDate - ISO date of the valuation; must not be before any row.
 */
export function xirrOf(rows: readonly XirrRow[], value: number, valueDate: string): XirrOutcome {
  const used = rows.filter((r) => r.amount > 0);
  const invested = used.filter((r) => r.kind === 'in').reduce((s, r) => s + r.amount, 0);
  const received = used.filter((r) => r.kind === 'out').reduce((s, r) => s + r.amount, 0) + Math.max(0, value);
  const none = (problem: XirrOutcome['problem'], days = 0): XirrOutcome => ({ rate: null, invested, received, gain: received - invested, days, problem });
  const end = isoToDay(valueDate);
  const flows: CashFlow[] = [];
  for (const r of used) {
    const day = isoToDay(r.date);
    if (day === null) return none('date');
    flows.push({ day, amount: r.kind === 'in' ? -r.amount : r.amount });
  }
  if (end === null) return none('date');
  if (invested <= 0 || received <= 0) return none('empty');
  const first = Math.min(...flows.map((f) => f.day));
  if (flows.some((f) => f.day > end) || end <= first) return none('order', Math.max(0, end - first));
  if (value > 0) flows.push({ day: end, amount: value });
  const rate = xirr(flows);
  return { rate, invested, received, gain: received - invested, days: end - first, problem: rate === null ? 'nosolution' : null };
}
