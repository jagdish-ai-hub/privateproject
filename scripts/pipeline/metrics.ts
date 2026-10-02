import { periodReturn, sinceInception } from '../../src/lib/calc/returns.ts';
import { sipReturn } from '../../src/lib/calc/sip.ts';
import { riskStats } from '../../src/lib/calc/risk.ts';
import { rollingReturns } from '../../src/lib/calc/rolling.ts';
import type { NavSeries } from '../../src/lib/calc/series.ts';

/** All numeric metrics for one scheme. Fractions (0.123 = 12.3%); `null` = not computable. */
export interface Metrics {
  r1m: number | null;
  r3m: number | null;
  r6m: number | null;
  r1y: number | null;
  r3y: number | null;
  r5y: number | null;
  r10y: number | null;
  /** Since-inception return (CAGR if >= 1 year old). */
  rInc: number | null;
  sip1y: number | null;
  sip3y: number | null;
  sip5y: number | null;
  vol3y: number | null;
  sharpe3y: number | null;
  sortino3y: number | null;
  mdd3y: number | null;
  /** Share of 1-year rolling windows with a positive return. */
  roll1yPos: number | null;
  roll1yAvg: number | null;
  roll1yMin: number | null;
  roll3yAvg: number | null;
  roll3yMin: number | null;
}

/** Metric keys, in column order (also the order in screener.json). */
export const METRIC_KEYS = [
  'r1m', 'r3m', 'r6m', 'r1y', 'r3y', 'r5y', 'r10y', 'rInc',
  'sip1y', 'sip3y', 'sip5y',
  'vol3y', 'sharpe3y', 'sortino3y', 'mdd3y',
  'roll1yPos', 'roll1yAvg', 'roll1yMin', 'roll3yAvg', 'roll3yMin',
] as const satisfies readonly (keyof Metrics)[];

/**
 * Compute every metric for one scheme's NAV history.
 *
 * @param s - Clean NAV series.
 * @returns The metrics (each independently `null` when it cannot be computed honestly).
 */
export function computeMetrics(s: NavSeries): Metrics {
  const risk = riskStats(s, 36);
  const roll1 = rollingReturns(s, 12);
  const roll3 = rollingReturns(s, 36);
  return {
    r1m: periodReturn(s, 1)?.value ?? null,
    r3m: periodReturn(s, 3)?.value ?? null,
    r6m: periodReturn(s, 6)?.value ?? null,
    r1y: periodReturn(s, 12)?.value ?? null,
    r3y: periodReturn(s, 36)?.value ?? null,
    r5y: periodReturn(s, 60)?.value ?? null,
    r10y: periodReturn(s, 120)?.value ?? null,
    rInc: sinceInception(s)?.value ?? null,
    sip1y: sipReturn(s, 12)?.xirr ?? null,
    sip3y: sipReturn(s, 36)?.xirr ?? null,
    sip5y: sipReturn(s, 60)?.xirr ?? null,
    vol3y: risk?.volatility ?? null,
    sharpe3y: risk?.sharpe ?? null,
    sortino3y: risk?.sortino ?? null,
    mdd3y: risk?.maxDrawdown ?? null,
    roll1yPos: roll1?.pctPositive ?? null,
    roll1yAvg: roll1?.average ?? null,
    roll1yMin: roll1?.min ?? null,
    roll3yAvg: roll3?.average ?? null,
    roll3yMin: roll3?.min ?? null,
  };
}

/**
 * Rank of each value among its peers, 1 = highest. Nulls get `null` rank and do not count
 * as peers.
 *
 * @param values - One value per scheme in the peer group.
 * @returns `{ rank, of }` per input position (ties share the better rank).
 * @example
 * rankDescending([10, 30, 20, null]); // [{rank:3,of:3},{rank:1,of:3},{rank:2,of:3},{rank:null,of:3}]
 */
export function rankDescending(values: readonly (number | null)[]): { rank: number | null; of: number }[] {
  const present = values.filter((v): v is number => v !== null).sort((a, b) => b - a);
  return values.map((v) => ({
    rank: v === null ? null : present.indexOf(v) + 1,
    of: present.length,
  }));
}
