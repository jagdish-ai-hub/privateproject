/**
 * Plain-English "insights" generated from a fund's own numbers: which fund returned more, which was
 * steadier, which costs less. Rule-based (no AI model, no randomness), so every sentence can be
 * traced to the figures in the table next to it.
 *
 * Wording rules: state facts and differences, never "better fund", "buy", "avoid" or a forecast.
 * A measure is only compared when every fund has it, so a young fund is never ranked on a period
 * it has not lived through. (The "different categories" warning is shown by the compare page itself,
 * above the chart, so it is not repeated here.)
 */
import { formatAum, formatPct, formatPlainPct, formatTer } from './format.ts';
import type { TermKey } from './glossary.ts';
import { shortName } from './compare.ts';
import { median } from './stats.ts';
import { METRIC_KEYS, type MetricKey, type ScreenerData } from './screener/types.ts';

/** What the insights need to know about one fund. */
export interface InsightFund {
  name: string;
  category: string;
  plan: string;
  option: string;
  /** Percent a year, or null. */
  ter: number | null;
  /** Rs crore, whole scheme, or null. */
  aum: number | null;
  /** Years of NAV history, or null. */
  age: number | null;
  metrics: Record<MetricKey, number | null>;
}

/** One sentence plus the explainer that goes with it. */
export interface Insight {
  id: string;
  text: string;
  term?: TermKey;
}

/** The result for a comparison. */
export interface InsightSet {
  /** One summary sentence ("A leads on ...; B leads on ..."), or null when nothing can be compared. */
  headline: string | null;
  items: Insight[];
  /** Things that make the comparison less like-for-like. */
  caveats: string[];
}

const PERIODS = [['r5y', '5 years'], ['r3y', '3 years'], ['r1y', '1 year']] as const;
/** Differences smaller than this are treated as a tie and not reported. */
const EPS = 1e-9;

/**
 * Short, unique labels for a set of funds (the plan is added only when two names collide).
 *
 * @param funds - The funds.
 * @returns One label per fund, in order.
 */
export function labelsFor(funds: readonly InsightFund[]): string[] {
  const base = funds.map((f) => shortName(f.name));
  return base.map((b, i) => {
    if (base.filter((x) => x === b).length < 2) return b;
    const plan = funds[i].plan === 'direct' ? 'Direct' : funds[i].plan === 'regular' ? 'Regular' : '';
    const opt = funds[i].option === 'growth' ? 'Growth' : funds[i].option === 'idcw' ? 'IDCW' : '';
    return `${b} (${[plan, opt].filter(Boolean).join(' ')})` || b;
  });
}

/** Index of the best value (max or min), or -1 if there is a tie for first or fewer than two values. */
function leader(values: (number | null)[], higherIsBetter: boolean): number {
  const have = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (have.length < 2) return -1;
  have.sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
  return Math.abs(have[0].v - have[1].v) < EPS ? -1 : have[0].i;
}

/** "A (+15.8%), B (+12.8%)" in the order given. */
const list = (labels: string[], values: (number | null)[], fmt: (v: number) => string, order: number[]): string =>
  order.map((i) => `${labels[i]} (${values[i] === null ? '—' : fmt(values[i] as number)})`).join(', ');

/**
 * Compare two to four funds in words.
 *
 * @param funds - The funds being compared (at least two for anything to be said).
 * @returns A headline, one insight per measure that can be compared fairly, and caveats.
 */
export function compareInsights(funds: readonly InsightFund[]): InsightSet {
  const out: InsightSet = { headline: null, items: [], caveats: [] };
  if (funds.length < 2) return out;
  const L = labelsFor(funds);
  const all = (vals: (number | null)[]): boolean => vals.every((v) => v !== null);
  const wins: Record<string, number[]> = {};
  const win = (dimension: string, i: number): void => { if (i >= 0) (wins[dimension] ??= []).push(i); };

  // 1. Returns: the longest period every fund has.
  for (const [key, label] of PERIODS) {
    const v = funds.map((f) => f.metrics[key]);
    if (!all(v)) continue;
    const order = v.map((_, i) => i).sort((a, b) => (v[b] as number) - (v[a] as number));
    const top = leader(v, true);
    if (top < 0) break;
    const gap = ((v[order[0]] as number) - (v[order[1]] as number)) * 100;
    out.items.push({
      id: 'returns', term: 'cagr',
      text: `Over ${label}, ${L[top]} grew the most: ${list(L, v, (x) => formatPct(x), order)} a year. It is ${gap.toFixed(1)} percentage points ahead of ${L[order[1]]}.`,
    });
    win('returns', top);
    break;
  }
  if (!out.items.some((x) => x.id === 'returns')) out.caveats.push('These funds do not all have a 1-year history, so their returns are not compared.');

  // 2. Steadiness: volatility, then the worst fall.
  const vol = funds.map((f) => f.metrics.vol3y);
  const mdd = funds.map((f) => f.metrics.mdd3y);
  const volLead = all(vol) ? leader(vol, false) : -1;
  const mddLead = all(mdd) ? leader(mdd, true) : -1;
  if (volLead >= 0) {
    const order = vol.map((_, i) => i).sort((a, b) => (vol[a] as number) - (vol[b] as number));
    out.items.push({ id: 'volatility', term: 'volatility', text: `${L[volLead]} had the smoother ride over the last 3 years: volatility ${list(L, vol, (x) => formatPlainPct(x, 1), order)}. Lower volatility means smaller day-to-day swings.` });
    win('steadiness', volLead);
  }
  if (mddLead >= 0) {
    const order = mdd.map((_, i) => i).sort((a, b) => (mdd[b] as number) - (mdd[a] as number));
    out.items.push({ id: 'drawdown', term: 'drawdown', text: `${L[mddLead]} fell the least from its peak in the last 3 years: worst fall ${list(L, mdd, (x) => formatPct(x, 1), order)}.` });
    if (mddLead !== volLead) win('steadiness', mddLead);
  }

  // 3. Return per unit of risk.
  const sharpe = funds.map((f) => f.metrics.sharpe3y);
  const shLead = all(sharpe) ? leader(sharpe, true) : -1;
  if (shLead >= 0) {
    const order = sharpe.map((_, i) => i).sort((a, b) => (sharpe[b] as number) - (sharpe[a] as number));
    out.items.push({ id: 'sharpe', term: 'sharpe', text: `For each unit of risk taken over the last 3 years, ${L[shLead]} earned the most above a safe 6.5%: Sharpe ratio ${list(L, sharpe, (x) => x.toFixed(2), order)}.` });
  }

  // 4. Consistency of 1-year returns.
  const pos = funds.map((f) => f.metrics.roll1yPos);
  const posLead = all(pos) ? leader(pos, true) : -1;
  if (posLead >= 0) {
    const order = pos.map((_, i) => i).sort((a, b) => (pos[b] as number) - (pos[a] as number));
    out.items.push({ id: 'rolling', term: 'rollingPositive', text: `${L[posLead]} was up in the highest share of all possible 1-year periods: ${list(L, pos, (x) => formatPlainPct(x, 1), order)}.` });
    win('consistency', posLead);
  }

  // 5. Cost.
  const ter = funds.map((f) => f.ter);
  const terLead = all(ter) ? leader(ter, false) : -1;
  if (terLead >= 0) {
    const order = ter.map((_, i) => i).sort((a, b) => (ter[a] as number) - (ter[b] as number));
    const gapPts = (ter[order[order.length - 1]] as number) - (ter[order[0]] as number);
    out.items.push({
      id: 'cost', term: 'ter',
      text: `${L[terLead]} costs the least to hold: expense ratio ${list(L, ter, (x) => formatTer(x), order)} a year. The gap of ${gapPts.toFixed(2)} percentage points between the highest and lowest is about ₹${Math.round(gapPts * 10_000).toLocaleString('en-IN')} a year on ₹10 lakh invested.`,
    });
    win('cost', terLead);
  }

  // 6. Size.
  const aum = funds.map((f) => f.aum);
  if (all(aum)) {
    const order = aum.map((_, i) => i).sort((a, b) => (aum[b] as number) - (aum[a] as number));
    const big = aum[order[0]] as number;
    const small = aum[order[order.length - 1]] as number;
    if (big > small * 1.5) {
      out.items.push({ id: 'size', term: 'aum', text: `${L[order[0]]} is the largest fund: ${list(L, aum, (x) => formatAum(x), order)}${small > 0 ? `, about ${Math.round(big / small).toLocaleString('en-IN')} times the size of the smallest` : ''}.` });
      win('size', order[0]);
    }
  }

  // 7. History.
  const ages = funds.map((f) => f.age);
  if (all(ages)) {
    const young = ages.map((a, i) => ({ a: a as number, i })).filter((x) => x.a < 5);
    if (young.length > 0 && young.length < funds.length) {
      out.items.push({ id: 'history', term: 'age', text: `${young.map((y) => `${L[y.i]} has only ${y.a.toFixed(1)} years of history`).join('; ')}, so its longer-period figures are not available and its numbers may not include a full market cycle.` });
    }
  }

  // Headline: who leads on what.
  const labelOf: Record<string, string> = { returns: 'returns', steadiness: 'steadiness', consistency: 'consistency', cost: 'low cost', size: 'size' };
  const byFund = new Map<number, string[]>();
  for (const [dim, idx] of Object.entries(wins)) for (const i of idx) byFund.set(i, [...(byFund.get(i) ?? []), labelOf[dim]]);
  const parts = [...byFund.entries()].sort((a, b) => a[0] - b[0]).map(([i, dims]) => `${L[i]} leads on ${dims.join(' and ')}`);
  if (parts.length > 0) out.headline = `${parts.join('; ')}.`;

  // Caveats that make the comparison less like-for-like.
  const plans = new Set(funds.map((f) => f.plan));
  if (plans.has('direct') && plans.has('regular')) out.caveats.push('The funds include both Direct and Regular plans, which carry different costs by design, so cost and return gaps are partly the plan, not the fund.');
  if (funds.some((f) => f.option === 'idcw')) out.caveats.push('An IDCW option pays money out, which lowers its NAV, so its price returns understate what an investor who received the payouts earned.');
  return out;
}

/** The medians of a peer group, for {@link fundVsPeers}. */
export interface PeerMedians {
  count: number;
  /** Median per metric (fractions). */
  metrics: Partial<Record<MetricKey, number | null>>;
  ter: number | null;
}

/**
 * Median of a peer group on the measures the fund page compares.
 *
 * @param peers - Funds in the same category, plan and option (the fund itself may be included).
 * @returns Medians, ignoring funds with no value.
 */
export function peerMedians(peers: readonly InsightFund[]): PeerMedians {
  const keys: MetricKey[] = ['r1y', 'r3y', 'r5y', 'vol3y', 'mdd3y', 'sharpe3y'];
  return {
    count: peers.length,
    metrics: Object.fromEntries(keys.map((k) => [k, median(peers.map((p) => p.metrics[k]))])),
    ter: median(peers.map((p) => p.ter)),
  };
}

/**
 * One fund against the middle of its peer group, in words.
 *
 * @param f - The fund.
 * @param med - Peer medians from {@link peerMedians}.
 * @param groupName - Words for the group, e.g. "Direct Growth Flexi Cap funds".
 * @returns Insights, each stating the fund's figure and the group's median; empty if there is nothing to compare.
 */
export function fundVsPeers(f: InsightFund, med: PeerMedians, groupName: string): Insight[] {
  const out: Insight[] = [];
  if (med.count < 3) return out;
  const rel = (v: number, m: number, higher: string, lower: string): string => (Math.abs(v - m) < EPS ? 'in line with' : v > m ? higher : lower);
  for (const [key, label] of PERIODS) {
    const v = f.metrics[key];
    const m = med.metrics[key];
    if (v === null || m === null || m === undefined) continue;
    out.push({ id: 'peer-returns', term: 'cagr', text: `Its ${label} return of ${formatPct(v)} a year is ${rel(v, m, 'above', 'below')} the median of ${formatPct(m)} for ${med.count} ${groupName}.` });
    break;
  }
  if (f.ter !== null && med.ter !== null) out.push({ id: 'peer-cost', term: 'ter', text: `Its expense ratio of ${formatTer(f.ter)} is ${rel(f.ter, med.ter, 'higher than', 'lower than')} the median of ${formatTer(med.ter)}.` });
  const vol = f.metrics.vol3y;
  const vm = med.metrics.vol3y;
  if (vol !== null && vm !== null && vm !== undefined) out.push({ id: 'peer-volatility', term: 'volatility', text: `Its volatility of ${formatPlainPct(vol, 1)} is ${rel(vol, vm, 'higher than', 'lower than')} the median of ${formatPlainPct(vm, 1)}.` });
  const dd = f.metrics.mdd3y;
  const dm = med.metrics.mdd3y;
  if (dd !== null && dm !== null && dm !== undefined) out.push({ id: 'peer-drawdown', term: 'drawdown', text: `Its worst fall in 3 years was ${formatPct(dd, 1)}, ${rel(dd, dm, 'milder than', 'deeper than')} the median of ${formatPct(dm, 1)}.` });
  return out;
}

/**
 * Build an {@link InsightFund} from one row of the columnar dataset.
 *
 * @param data - The dataset.
 * @param i - Row index.
 * @param newestNav - Day number of the newest NAV in the dataset (fund age is measured to it).
 * @returns The fund's figures for the insight functions.
 */
export function insightFundAt(data: ScreenerData, i: number, newestNav: number): InsightFund {
  return {
    name: data.name[i],
    category: data.dict.category[data.category[i]],
    plan: data.dict.plan[data.plan[i]],
    option: data.dict.option[data.option[i]],
    ter: data.ter?.[i] ?? null,
    aum: data.aum?.[i] ?? null,
    age: (newestNav - data.inception[i]) / 365.25,
    metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, data.metrics[k][i] ?? null])) as InsightFund['metrics'],
  };
}
