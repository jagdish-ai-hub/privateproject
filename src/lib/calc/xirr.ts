/** A dated cash flow: negative = money invested, positive = money received. */
export interface CashFlow {
  /** Day number (see dates.ts). */
  day: number;
  /** Amount; investments negative, final value positive. */
  amount: number;
}

/**
 * Net present value of cash flows at an annual rate, discounting from the first flow's date.
 *
 * @param flows - Cash flows (any order).
 * @param rate - Annual rate as a fraction; must be > -1.
 * @returns NPV at `rate`.
 */
function npv(flows: readonly CashFlow[], rate: number): number {
  const d0 = Math.min(...flows.map((f) => f.day));
  let sum = 0;
  for (const f of flows) sum += f.amount / Math.pow(1 + rate, (f.day - d0) / 365);
  return sum;
}

/**
 * Extended internal rate of return (XIRR), as spreadsheets define it: the annual rate
 * at which the cash flows' NPV is zero, with day counts over 365.
 *
 * Solved with Newton's method from a 10% guess; if Newton diverges or leaves the valid
 * range, falls back to bisection on (-99.99%, +10,000%). Returns `null` when the flows
 * lack both a negative and a positive amount (no solution) or no root is bracketed.
 *
 * @param flows - At least one negative and one positive flow.
 * @returns Annual rate as a fraction, or `null`.
 * @example
 * xirr([{ day: 0, amount: -100 }, { day: 365, amount: 110 }]); // ~0.1
 */
export function xirr(flows: readonly CashFlow[]): number | null {
  if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
  const d0 = Math.min(...flows.map((f) => f.day));

  let r = 0.1;
  for (let i = 0; i < 50; i++) {
    let f = 0;
    let df = 0;
    for (const c of flows) {
      const t = (c.day - d0) / 365;
      const base = Math.pow(1 + r, t);
      f += c.amount / base;
      df += (-t * c.amount) / (base * (1 + r));
    }
    if (!Number.isFinite(f) || !Number.isFinite(df) || df === 0) break;
    const next = r - f / df;
    if (!(next > -0.9999) || next > 1e4) break;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }

  let lo = -0.9999;
  let hi = 1e4;
  let flo = npv(flows, lo);
  const fhi = npv(flows, hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(flows, mid);
    if (Math.abs(fm) < 1e-9 || hi - lo < 1e-12) return mid;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
