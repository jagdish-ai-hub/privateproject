/** Broad asset class used for the first-level filter. */
export type AssetClass = 'Equity' | 'Debt' | 'Hybrid' | 'Solution Oriented' | 'Index Fund' | 'ETF' | 'Fund of Funds' | 'Other';
/** Direct / Regular plan; `na` for products with no plans (ETFs); `unknown` when no source says. */
export type Plan = 'direct' | 'regular' | 'na' | 'unknown';
/** Growth / IDCW (dividend) option; `other` when the name does not say. */
export type Option = 'growth' | 'idcw' | 'bonus' | 'other';

/** Normalised category info for one scheme. */
export interface Classification {
  schemeType: 'Open Ended' | 'Close Ended' | 'Interval';
  assetClass: AssetClass;
  /** Canonical display name, e.g. "Small Cap". Merges AMFI's old and new naming. */
  category: string;
}

type Rule = [test: RegExp, assetClass: AssetClass, category: string];

/**
 * Ordered rules applied to the text inside the AMFI category brackets. First match wins,
 * so more specific patterns come before general ones. This merges the pre- and post-2018
 * SEBI naming ("Hybrid Scheme -" vs "Hybrid Schemes -", "Short Term" vs "Short Duration").
 */
const RULES: Rule[] = [
  // Equity
  [/large\s*&\s*mid/i, 'Equity', 'Large & Mid Cap'],
  [/large cap/i, 'Equity', 'Large Cap'],
  [/mid cap/i, 'Equity', 'Mid Cap'],
  [/small cap/i, 'Equity', 'Small Cap'],
  [/multi cap/i, 'Equity', 'Multi Cap'],
  [/flexi cap/i, 'Equity', 'Flexi Cap'],
  [/elss/i, 'Equity', 'ELSS (Tax Saver)'],
  [/focused/i, 'Equity', 'Focused'],
  [/contra/i, 'Equity', 'Contra'],
  [/dividend yield/i, 'Equity', 'Dividend Yield'],
  [/equity.*(sectoral|thematic)|^sectoral|^thematic/i, 'Equity', 'Sectoral / Thematic'],
  [/equity.*value|^value/i, 'Equity', 'Value'],
  // Hybrid
  [/aggressive hybrid/i, 'Hybrid', 'Aggressive Hybrid'],
  [/conservative hybrid/i, 'Hybrid', 'Conservative Hybrid'],
  [/balanced hybrid/i, 'Hybrid', 'Balanced Hybrid'],
  [/balanced advantage|dynamic asset allocation/i, 'Hybrid', 'Balanced Advantage'],
  [/multi asset/i, 'Hybrid', 'Multi Asset Allocation'],
  [/equity savings/i, 'Hybrid', 'Equity Savings'],
  [/arbitrage/i, 'Hybrid', 'Arbitrage'],
  // Solution oriented, life cycle
  [/retirement/i, 'Solution Oriented', 'Retirement'],
  [/children/i, 'Solution Oriented', "Children's"],
  [/life cycle/i, 'Solution Oriented', 'Life Cycle'],
  // ETFs (before index funds: "Other Scheme - Other ETFs")
  [/gold etf/i, 'ETF', 'Gold ETF'],
  [/silver etf/i, 'ETF', 'Silver ETF'],
  [/overseas.*etf|etfs investing overseas/i, 'ETF', 'Overseas ETF'],
  [/debt etf/i, 'ETF', 'Debt ETF'],
  [/equity etf/i, 'ETF', 'Equity ETF'],
  [/hybrid etf/i, 'ETF', 'Hybrid ETF'],
  [/etf/i, 'ETF', 'Other ETF'],
  // Index funds, fund of funds
  [/index fund/i, 'Index Fund', 'Index Fund'],
  [/overseas fund of funds|fof overseas/i, 'Fund of Funds', 'FoF (Overseas)'],
  [/fund of funds|fof domestic/i, 'Fund of Funds', 'FoF (Domestic)'],
  // Debt
  [/overnight/i, 'Debt', 'Overnight'],
  [/liquid/i, 'Debt', 'Liquid'],
  [/ultra short/i, 'Debt', 'Ultra Short Duration'],
  [/low duration/i, 'Debt', 'Low Duration'],
  [/money market/i, 'Debt', 'Money Market'],
  [/short duration|short term/i, 'Debt', 'Short Duration'],
  [/medium to long/i, 'Debt', 'Medium to Long Duration'],
  [/medium duration|medium term/i, 'Debt', 'Medium Duration'],
  [/long duration|long term/i, 'Debt', 'Long Duration'],
  [/dynamic (bond|term)/i, 'Debt', 'Dynamic Bond'],
  [/corporate bond/i, 'Debt', 'Corporate Bond'],
  [/credit risk/i, 'Debt', 'Credit Risk'],
  [/banking and psu/i, 'Debt', 'Banking & PSU'],
  [/10-year constant maturity/i, 'Debt', 'Gilt (10-Year Constant Maturity)'],
  [/gilt/i, 'Debt', 'Gilt'],
  [/floating/i, 'Debt', 'Floater'],
  [/fixed term/i, 'Debt', 'Fixed Maturity Plan'],
  [/other debt|debt scheme|income\/debt/i, 'Debt', 'Other Debt'],
  // Legacy one-word headers (old closed-ended and pre-2018 schemes)
  [/^income$/i, 'Debt', 'Income (legacy)'],
  [/^growth$/i, 'Equity', 'Growth (legacy)'],
];

/**
 * Turn an AMFI category header into a canonical {@link Classification}.
 *
 * @param rawCategory - e.g. "Open Ended Schemes(Equity Schemes - Small Cap Fund)".
 * @returns The normalised classification; unrecognised headers become `Other` with the
 *   bracket text as the category, so nothing is silently dropped.
 * @example
 * classifyCategory('Open Ended Schemes(Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage)').category;
 * // "Balanced Advantage"
 */
export function classifyCategory(rawCategory: string): Classification {
  const m = /^(Open Ended|Close Ended|Interval Fund) Schemes?\s*\((.*)\)\s*$/.exec(rawCategory.trim());
  const schemeType = m ? (m[1] === 'Interval Fund' ? 'Interval' : (m[1] as 'Open Ended' | 'Close Ended')) : 'Open Ended';
  const inner = (m ? m[2] : rawCategory).trim();
  for (const [test, assetClass, category] of RULES) {
    if (test.test(inner)) return { schemeType, assetClass, category };
  }
  return { schemeType, assetClass: 'Other', category: inner || 'Other' };
}

/** Day number of 1 Jan 2013, when SEBI introduced Direct plans. Older schemes without a label are Regular. */
export const DIRECT_PLANS_START_DAY = 15_706;

/**
 * Work out Direct / Regular from the Plan column and the scheme name.
 *
 * Rules, in order: "direct" in either means Direct; "regular" means Regular; ETFs have no
 * plans (`na`); a scheme that started before Direct plans existed (1 Jan 2013) and carries
 * no label is Regular; anything else is `unknown`. Unknown is shown as "-" in the UI and is
 * excluded from Direct / Regular filters rather than guessed.
 *
 * @param planCol - Raw Plan column.
 * @param name - Full scheme name.
 * @param assetClass - From {@link classifyCategory}.
 * @param firstNavDay - Day number of the scheme's first NAV, if known.
 * @returns The plan.
 */
export function classifyPlan(planCol: string, name: string, assetClass: AssetClass, firstNavDay?: number): Plan {
  // AMFI's own Plan column is authoritative whenever it says something.
  const fromCol = planFromText(planCol);
  if (fromCol) return fromCol;
  const fromName = planFromText(name);
  if (fromName) return fromName;
  if (assetClass === 'ETF') return 'na';
  if (firstNavDay !== undefined && firstNavDay < DIRECT_PLANS_START_DAY) return 'regular';
  return 'unknown';
}

/**
 * Read Direct / Regular from free text. An explicit "Direct Plan" / "Regular Plan" phrase wins.
 * Names such as "Kotak X Fund - Regular Plan - Payout of IDCW option- Direct" contain both words;
 * the phrase makes them Regular. If both words appear and neither is in a "... Plan" phrase the
 * text is ambiguous and yields `null`.
 *
 * @param text - Plan column text or scheme name.
 * @returns The plan, or `null` if the text does not say.
 */
function planFromText(text: string): 'direct' | 'regular' | null {
  const phrase = /\b(direct|regular)\s+plan\b/i.exec(text);
  if (phrase) return phrase[1].toLowerCase() as 'direct' | 'regular';
  const direct = /\bdirect\b/i.test(text);
  const regular = /\bregular\b/i.test(text);
  if (direct && regular) return null;
  return direct ? 'direct' : regular ? 'regular' : null;
}

/**
 * Work out Growth / IDCW from the Option column, falling back to the scheme name.
 *
 * IDCW covers every "dividend", "IDCW", "income distribution", "payout" or "reinvestment"
 * wording (all variants pay out or reinvest income, so NAV drops on distribution and the
 * point-to-point NAV return understates total return; see the methodology page).
 *
 * @param optionCol - Raw Option column.
 * @param name - Scheme name.
 * @param reinvestIsinOnly - True when the scheme has only a "dividend reinvestment" ISIN.
 * @returns The option, or `other` when nothing says.
 */
export function classifyOption(optionCol: string, name: string, reinvestIsinOnly = false): Option {
  // AMFI's Option column is authoritative whenever it says something; otherwise read the name.
  const found = optionFromText(optionCol) ?? optionFromText(name);
  if (found) return found;
  // Last resort: only the "dividend reinvestment" ISIN column is filled, so it is an IDCW option.
  return reinvestIsinOnly ? 'idcw' : 'other';
}

/**
 * Read an option from free text. IDCW wording wins over "growth" when both appear.
 *
 * @param text - Option column text or scheme name.
 * @returns The option, or `null` if the text does not say.
 */
function optionFromText(text: string): Option | null {
  if (/idcw|dividend|income distribution|payout|reinvest/i.test(text)) return 'idcw';
  if (/bonus/i.test(text)) return 'bonus';
  if (/growth/i.test(text)) return 'growth';
  return null;
}

/**
 * Best available full scheme name.
 *
 * MFapi's list carries the full name ("... - Direct Plan - Growth") for every code. AMFI's
 * NAVAll.txt now puts plan and option in separate columns and leaves them blank for many
 * rows, so it is only used as a fallback (name + plan column + option column).
 *
 * @param amfiName - Name from NAVAll.txt.
 * @param planCol - Plan column.
 * @param optionCol - Option column.
 * @param mfapiName - Name from MFapi's `/mf` list, if the code is present.
 * @returns The name to display and to classify from.
 */
export function resolveName(amfiName: string, planCol: string, optionCol: string, mfapiName?: string): string {
  if (mfapiName) return mfapiName.trim();
  return [amfiName, planCol, optionCol].filter(Boolean).join(' - ');
}

export { slugify } from '../../src/lib/slug.ts';
