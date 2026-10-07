/** Metric columns computed by the pipeline, in the order they appear in screener.json. */
export const METRIC_KEYS = [
  'r1m', 'r3m', 'r6m', 'r1y', 'r3y', 'r5y', 'r10y', 'rInc',
  'sip1y', 'sip3y', 'sip5y',
  'vol3y', 'sharpe3y', 'sortino3y', 'mdd3y',
  'roll1yPos', 'roll1yAvg', 'roll1yMin', 'roll3yAvg', 'roll3yMin',
] as const;

/** One of {@link METRIC_KEYS}. */
export type MetricKey = (typeof METRIC_KEYS)[number];

/** Contents of `public/data/screener.json`: columnar (one array per field, same length). */
export interface ScreenerData {
  /** Date most schemes report a NAV for, ISO `YYYY-MM-DD`. */
  asOf: string;
  generatedAt: string;
  count: number;
  /** Lookup tables for the small-integer categorical columns below. */
  dict: { amc: string[]; category: string[]; assetClass: string[]; plan: string[]; option: string[]; schemeType: string[] };
  code: number[];
  name: string[];
  amc: number[];
  category: number[];
  assetClass: number[];
  plan: number[];
  option: number[];
  schemeType: number[];
  nav: number[];
  /** Day numbers (days since 1970-01-01). */
  navDate: number[];
  inception: number[];
  /** 0 = plain history, 1 = adjusted for unit splits, 2 = history before an unexplained NAV jump was dropped. */
  adj: number[];
  /** Expense ratio, percent a year, of the scheme's own plan (null = not available). */
  ter: (number | null)[];
  /** Average AUM in Rs crore for `aumPeriod` (null = not available). */
  aum: (number | null)[];
  /** Newest TER disclosure date used, ISO. */
  terAsOf: string | null;
  /** Quarter the AUM refers to, e.g. "April - June 2026". */
  aumPeriod: string | null;
  metrics: Record<MetricKey, (number | null)[]>;
  /** `r1yRank`, `r1yOf`, `r3yRank`, ... : rank within same category + plan + option. */
  ranks: Record<string, (number | null)[]>;
}

/** Keys the table can sort by. */
export type SortKey = 'name' | 'amc' | 'category' | 'nav' | 'age' | 'ter' | 'aum' | MetricKey;

/** Numeric range filter; either end may be omitted. */
export interface Range {
  min?: number;
  max?: number;
}

/** Keys a numeric range filter can target. */
export type RangeKey = 'age' | 'ter' | 'aum' | MetricKey;

/** All user-controlled filters. Categorical values are the human-readable strings from `dict`. */
export interface Filters {
  /** Free-text search over fund name and fund house; every word must match. */
  q: string;
  amc: string[];
  assetClass: string[];
  category: string[];
  plan: string[];
  option: string[];
  /** Range filters in display units: percent for returns/volatility/drawdown/TER, plain for Sharpe/Sortino, years for age, Rs crore for AUM. */
  ranges: Partial<Record<RangeKey, Range>>;
}

/** Everything that defines what the table shows. Mirrored in the URL. */
export interface ViewState {
  filters: Filters;
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  /** 1-based page. */
  page: number;
  size: 25 | 50 | 100;
}
