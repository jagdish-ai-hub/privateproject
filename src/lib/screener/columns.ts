import type { MetricKey, RangeKey, SortKey } from './types.ts';

/** How a column's values are shown. */
export type ColumnKind = 'text' | 'nav' | 'pct' | 'plainPct' | 'num' | 'age';

/** A table column definition. */
export interface Column {
  key: SortKey;
  /** Header label. */
  label: string;
  /** Longer description for tooltips and the column picker. */
  help: string;
  kind: ColumnKind;
  /** Shown by default. */
  defaultVisible: boolean;
  /** Group heading in the column picker. */
  group: 'Fund' | 'Returns' | 'SIP returns' | 'Risk' | 'Rolling returns';
}

export const COLUMNS: Column[] = [
  { key: 'category', label: 'Category', help: 'SEBI category (old and new naming merged)', kind: 'text', defaultVisible: true, group: 'Fund' },
  { key: 'amc', label: 'Fund house', help: 'Asset management company', kind: 'text', defaultVisible: false, group: 'Fund' },
  { key: 'nav', label: 'NAV (₹)', help: 'Latest net asset value per unit', kind: 'nav', defaultVisible: true, group: 'Fund' },
  { key: 'age', label: 'Age', help: 'Years since the first NAV', kind: 'age', defaultVisible: false, group: 'Fund' },
  { key: 'r1m', label: '1M', help: '1-month absolute return', kind: 'pct', defaultVisible: false, group: 'Returns' },
  { key: 'r3m', label: '3M', help: '3-month absolute return', kind: 'pct', defaultVisible: false, group: 'Returns' },
  { key: 'r6m', label: '6M', help: '6-month absolute return', kind: 'pct', defaultVisible: false, group: 'Returns' },
  { key: 'r1y', label: '1Y', help: '1-year return (CAGR)', kind: 'pct', defaultVisible: true, group: 'Returns' },
  { key: 'r3y', label: '3Y', help: '3-year return (CAGR)', kind: 'pct', defaultVisible: true, group: 'Returns' },
  { key: 'r5y', label: '5Y', help: '5-year return (CAGR)', kind: 'pct', defaultVisible: true, group: 'Returns' },
  { key: 'r10y', label: '10Y', help: '10-year return (CAGR)', kind: 'pct', defaultVisible: false, group: 'Returns' },
  { key: 'rInc', label: 'Since launch', help: 'Return since the first NAV (CAGR if over a year)', kind: 'pct', defaultVisible: false, group: 'Returns' },
  { key: 'sip1y', label: 'SIP 1Y', help: 'XIRR of a monthly SIP over 1 year', kind: 'pct', defaultVisible: false, group: 'SIP returns' },
  { key: 'sip3y', label: 'SIP 3Y', help: 'XIRR of a monthly SIP over 3 years', kind: 'pct', defaultVisible: true, group: 'SIP returns' },
  { key: 'sip5y', label: 'SIP 5Y', help: 'XIRR of a monthly SIP over 5 years', kind: 'pct', defaultVisible: false, group: 'SIP returns' },
  { key: 'vol3y', label: 'Volatility 3Y', help: 'Annualised standard deviation of daily returns, last 3 years', kind: 'plainPct', defaultVisible: true, group: 'Risk' },
  { key: 'sharpe3y', label: 'Sharpe 3Y', help: 'Excess return over 6.5% risk-free per unit of volatility', kind: 'num', defaultVisible: false, group: 'Risk' },
  { key: 'sortino3y', label: 'Sortino 3Y', help: 'Excess return per unit of downside deviation', kind: 'num', defaultVisible: false, group: 'Risk' },
  { key: 'mdd3y', label: 'Max drawdown 3Y', help: 'Largest peak-to-trough fall in the last 3 years', kind: 'pct', defaultVisible: true, group: 'Risk' },
  { key: 'roll1yPos', label: '1Y rolling +ve', help: 'Share of 1-year rolling windows with a positive return', kind: 'plainPct', defaultVisible: false, group: 'Rolling returns' },
  { key: 'roll1yAvg', label: '1Y rolling avg', help: 'Average 1-year rolling return', kind: 'pct', defaultVisible: false, group: 'Rolling returns' },
  { key: 'roll1yMin', label: '1Y rolling min', help: 'Worst 1-year rolling return', kind: 'pct', defaultVisible: false, group: 'Rolling returns' },
  { key: 'roll3yAvg', label: '3Y rolling avg', help: 'Average 3-year rolling return (CAGR)', kind: 'pct', defaultVisible: false, group: 'Rolling returns' },
  { key: 'roll3yMin', label: '3Y rolling min', help: 'Worst 3-year rolling return (CAGR)', kind: 'pct', defaultVisible: false, group: 'Rolling returns' },
];

/**
 * Multiplier turning a stored value into the unit shown in range inputs.
 * Returns, volatility and drawdown are stored as fractions and filtered in percent;
 * Sharpe / Sortino are plain numbers.
 */
export const RANGE_SCALE: Record<RangeKey, number> = {
  age: 1, r1m: 100, r3m: 100, r6m: 100, r1y: 100, r3y: 100, r5y: 100, r10y: 100, rInc: 100,
  sip1y: 100, sip3y: 100, sip5y: 100, vol3y: 100, sharpe3y: 1, sortino3y: 1, mdd3y: 100,
  roll1yPos: 100, roll1yAvg: 100, roll1yMin: 100, roll3yAvg: 100, roll3yMin: 100,
};

/** Metric keys that make sense as range filters in the UI, with their labels and units. */
export const RANGE_FILTERS: { key: RangeKey; label: string; unit: '%' | '' | 'yrs' }[] = [
  { key: 'r1y', label: '1Y return', unit: '%' },
  { key: 'r3y', label: '3Y return', unit: '%' },
  { key: 'r5y', label: '5Y return', unit: '%' },
  { key: 'sip3y', label: 'SIP 3Y return', unit: '%' },
  { key: 'vol3y', label: 'Volatility 3Y', unit: '%' },
  { key: 'mdd3y', label: 'Max drawdown 3Y (negative)', unit: '%' },
  { key: 'sharpe3y', label: 'Sharpe 3Y', unit: '' },
  { key: 'age', label: 'Fund age', unit: 'yrs' },
];

/** Type guard: is this sort key a computed metric? */
export function isMetricKey(k: string): k is MetricKey {
  return k in RANGE_SCALE && k !== 'age';
}
