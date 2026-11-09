import { fundSlug } from './slug.ts';
import type { ScreenerData } from './screener/types.ts';

/**
 * Which schemes get their own static, indexable page.
 *
 * Only the Growth option of a Direct plan (or of a scheme that has one plan only, such as an ETF) gets a
 * page of its own: that is the variant people search for, and the other variants (Regular, IDCW, payout,
 * bonus) are near-copies that would only dilute the site in search. Every other variant opens
 * `/fund/?code=…`, one page that loads the fund from the data file in the browser and is not indexed.
 * This also keeps the site well under the host's file limit.
 *
 * @param plan - Plan label from `dict.plan` ("direct", "regular", "na", "unknown").
 * @param option - Option label from `dict.option` ("growth", "idcw", ...).
 */
export function hasFundPage(plan: string, option: string): boolean {
  return option === 'growth' && (plan === 'direct' || plan === 'na');
}

/** Link to a fund: its own page when it has one, otherwise the on-demand page. */
export function fundHref(name: string, code: number, plan: string, option: string): string {
  return hasFundPage(plan, option) ? `/fund/${fundSlug(name, code)}/` : `/fund/?code=${code}`;
}

/** {@link fundHref} for row `i` of the columnar data. */
export function fundHrefAt(data: ScreenerData, i: number): string {
  return fundHref(data.name[i], data.code[i], data.dict.plan[data.plan[i]], data.dict.option[data.option[i]]);
}

/**
 * The scheme's base name without plan and option words, used to find the Direct Growth page of the
 * same scheme from one of its other variants.
 */
export function schemeStem(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(direct|regular|plan|growth|option|options|idcw|dividend|payout|pay out|reinvestment|reinvest|re-investment|transfer|bonus|daily|weekly|fortnightly|monthly|quarterly|half[- ]yearly|annual|yearly|of|income distribution cum capital withdrawal|cum|capital|withdrawal|distribution|income)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
