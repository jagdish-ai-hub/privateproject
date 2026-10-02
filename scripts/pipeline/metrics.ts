import { periodReturn, sinceInception } from '../../src/lib/calc/returns.ts';
import { sipReturn } from '../../src/lib/calc/sip.ts';
import { riskStats } from '../../src/lib/calc/risk.ts';
import { rollingReturns } from '../../src/lib/calc/rolling.ts';
import type { NavSeries } from '../../src/lib/calc/series.ts';
import { METRIC_KEYS, type MetricKey } from '../../src/lib/screener/types.ts';

export { METRIC_KEYS };

/** All numeric metrics for one scheme. Fractions (0.123 = 12.3%); `null` = not computable. */
export type Metrics = Record<MetricKey, number | null>;

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
