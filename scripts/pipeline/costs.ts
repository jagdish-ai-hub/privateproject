import type { AssetClass, Option, Plan } from './classify.ts';
import type { AumQuarter } from './aum.ts';
import { amcKey, normalizeName, pickTer, pickTerParts, type TerIndex, type TerParts } from './ter.ts';

/** What the join needs to know about one scheme. */
export interface SchemeForCosts {
  /** AMFI scheme code (the AUM key). */
  code: number;
  /** Fund house as named in NAVAll.txt. */
  amc: string;
  /** Full scheme name (MFapi). */
  name: string;
  /** Raw AMFI category heading from NAVAll.txt. */
  rawCategory: string;
  plan: Plan;
  option: Option;
  assetClass: AssetClass;
}

/** TER and AUM for one scheme (`null` = not available; never 0). */
export interface Costs {
  /** Expense ratio of this scheme's plan, in percent per year. */
  ter: number | null;
  /** Both plans' breakdown for the fund page (the scheme's TER row), or `null` if unmatched. */
  terDetail: { regular: TerParts | null; direct: TerParts | null; date: string } | null;
  /** The breakdown of this scheme's own plan. */
  terParts: TerParts | null;
  /** Average AUM in Rs crore of this plan/option alone (AMFI reports one figure per scheme code). */
  planAum: number | null;
  /**
   * Average AUM in Rs crore of the whole scheme: every plan and option of the same fund added up.
   * This is the "fund size" other sites show; a Direct plan alone is only part of it.
   */
  aum: number | null;
}

/** Coverage numbers for the report and the quality gate. */
export interface CostStats {
  terMatched: number;
  terTotal: number;
  aumMatched: number;
  aumTotal: number;
  /** TER coverage of Direct + Growth schemes, the main comparison group. */
  directGrowth: { matched: number; total: number };
  byAssetClass: Record<string, { matched: number; total: number }>;
  /** Fund houses of ours with no counterpart in AMFI's TER data. */
  unmatchedAmcs: string[];
  /** A sample of Direct + Growth schemes that found no TER row. */
  unmatchedSample: string[];
  /** Rows that look wrong: Regular cheaper than Direct, or a TER outside (0, 5] percent. */
  violations: { name: string; regular: number | null; direct: number | null }[];
  /** Newest TER disclosure date used. */
  terAsOf: string | null;
}

/**
 * Attach TER and AUM to every scheme and measure how well the joins worked.
 *
 * TER joins by fund house + base name (see {@link buildTerIndex}); AUM joins by exact AMFI code.
 * Either source may be missing (`null`): the corresponding fields are then all `null`.
 *
 * @param schemes - Schemes in output order.
 * @param terIndex - TER lookup, or `null` if TER was not loaded.
 * @param aum - The AUM quarter, or `null` if not loaded.
 * @returns One {@link Costs} per scheme, in the same order, and coverage statistics.
 */
export function joinCosts(schemes: readonly SchemeForCosts[], terIndex: TerIndex | null, aum: AumQuarter | null): { costs: Costs[]; stats: CostStats } {
  const stats: CostStats = {
    terMatched: 0, terTotal: schemes.length, aumMatched: 0, aumTotal: schemes.length,
    directGrowth: { matched: 0, total: 0 }, byAssetClass: {}, unmatchedAmcs: [], unmatchedSample: [], violations: [], terAsOf: null,
  };
  const costs = schemes.map((s): Costs => {
    const row = terIndex ? terIndex.find(s.amc, s.name, s.rawCategory) : null;
    // An ETF has one plan only, whatever its name says ("... ETF - Direct Plan - Growth"): AMFI files its
    // cost under whichever plan column applies, so for ETFs the plan label must not decide the column.
    const planForTer: Plan = s.assetClass === 'ETF' ? 'na' : s.plan;
    const ter = row ? pickTer(row, planForTer) : null;
    const group = (stats.byAssetClass[s.assetClass] ??= { matched: 0, total: 0 });
    group.total++;
    if (ter !== null) { stats.terMatched++; group.matched++; }
    if (s.plan === 'direct' && s.option === 'growth') {
      stats.directGrowth.total++;
      if (ter !== null) stats.directGrowth.matched++;
      else if (stats.unmatchedSample.length < 25) stats.unmatchedSample.push(`${s.amc} | ${s.name}`);
    }
    if (row) {
      if (!stats.terAsOf || row.date > stats.terAsOf) stats.terAsOf = row.date;
      const r = row.regular?.total ?? null;
      const d = row.direct?.total ?? null;
      const bad = (r !== null && d !== null && r < d) || [r, d].some((v) => v !== null && (v <= 0 || v > 5));
      if (bad && stats.violations.length < 50) stats.violations.push({ name: row.name, regular: r, direct: d });
    }
    const aumValue = aum?.crore.get(s.code) ?? null;
    if (aumValue !== null) stats.aumMatched++;
    return {
      ter,
      terParts: row ? pickTerParts(row, planForTer) : null,
      terDetail: row ? { regular: row.regular, direct: row.direct, date: row.date } : null,
      planAum: aumValue,
      aum: null,
    };
  });
  // Whole-scheme AUM: add up every plan and option of the same scheme (same fund house, base name, category).
  const key = (s: SchemeForCosts) => `${amcKey(s.amc)}|${normalizeName(s.name)}|${s.rawCategory}`;
  const totals = new Map<string, number>();
  schemes.forEach((s, i) => {
    const v = costs[i].planAum;
    if (v !== null) totals.set(key(s), (totals.get(key(s)) ?? 0) + v);
  });
  schemes.forEach((s, i) => {
    const t = totals.get(key(s));
    costs[i].aum = t === undefined ? null : Math.round(t * 100) / 100;
  });
  if (terIndex) {
    const ours = new Map<string, string>();
    for (const s of schemes) ours.set(amcKey(s.amc), s.amc);
    stats.unmatchedAmcs = [...ours].filter(([k]) => !terIndex.amcKeys.has(k)).map(([, name]) => name).sort();
  }
  return { costs, stats };
}

/**
 * Decide whether the TER coverage is good enough to publish.
 *
 * A TER file that loaded but joins badly means AMFI changed its format or names, so the build should
 * fail loudly instead of shipping a column of dashes. If no TER data loaded at all (skipped, or AMFI
 * unreachable with no cache) the build degrades quietly: the column is simply empty and the report says so.
 *
 * @param stats - From {@link joinCosts}.
 * @param loadedRows - How many TER rows were loaded.
 * @param floor - Minimum fraction of Direct + Growth schemes that must have a TER (0..1).
 * @returns `null` if fine, otherwise a message explaining the failure.
 */
export function coverageProblem(stats: CostStats, loadedRows: number, floor: number): string | null {
  if (loadedRows === 0 || stats.directGrowth.total === 0) return null;
  const cov = stats.directGrowth.matched / stats.directGrowth.total;
  return cov < floor
    ? `TER coverage of Direct+Growth schemes is ${(cov * 100).toFixed(1)}% (${stats.directGrowth.matched}/${stats.directGrowth.total}), below the ${(floor * 100).toFixed(0)}% floor. AMFI's TER format or names may have changed; see data/generated/report.json.`
    : null;
}
