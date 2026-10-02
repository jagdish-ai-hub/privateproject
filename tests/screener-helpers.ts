import { METRIC_KEYS, type MetricKey, type ScreenerData } from '../src/lib/screener/types.ts';

/** One synthetic fund for tests. Unspecified metrics are null. */
export interface FakeFund {
  name: string;
  amc?: string;
  category?: string;
  assetClass?: string;
  plan?: string;
  option?: string;
  nav?: number;
  inception?: number;
  m?: Partial<Record<MetricKey, number | null>>;
}

/** Build a columnar ScreenerData from fake funds, mirroring the pipeline's output format. */
export function makeData(funds: FakeFund[], newest = 20_000): ScreenerData {
  const dict = (f: (x: FakeFund) => string): { list: string[]; idx: number[] } => {
    const list = [...new Set(funds.map(f))].sort();
    return { list, idx: funds.map((x) => list.indexOf(f(x))) };
  };
  const amc = dict((f) => f.amc ?? 'Alpha Mutual Fund');
  const category = dict((f) => f.category ?? 'Large Cap');
  const assetClass = dict((f) => f.assetClass ?? 'Equity');
  const plan = dict((f) => f.plan ?? 'direct');
  const option = dict((f) => f.option ?? 'growth');
  const schemeType = dict(() => 'Open Ended');
  const metrics = Object.fromEntries(METRIC_KEYS.map((k) => [k, funds.map((f) => f.m?.[k] ?? null)])) as ScreenerData['metrics'];
  return {
    asOf: '2026-10-01', generatedAt: '2026-10-02T00:00:00Z', count: funds.length,
    dict: { amc: amc.list, category: category.list, assetClass: assetClass.list, plan: plan.list, option: option.list, schemeType: schemeType.list },
    code: funds.map((_, i) => 1000 + i),
    slug: funds.map((f, i) => `${f.name.toLowerCase().replace(/\W+/g, '-')}-${1000 + i}`),
    name: funds.map((f) => f.name),
    amc: amc.idx, category: category.idx, assetClass: assetClass.idx, plan: plan.idx, option: option.idx, schemeType: schemeType.idx,
    nav: funds.map((f) => f.nav ?? 10),
    navDate: funds.map(() => newest),
    inception: funds.map((f) => f.inception ?? newest - 365 * 5),
    isin: funds.map(() => null),
    metrics,
    ranks: {},
  };
}
