import { shortName } from './compare.ts';
import { hasFundPage } from './fundLinks.ts';
import type { ScreenerData } from './screener/types.ts';

/** Month and year of a day number (days since 1970-01-01), e.g. `Nov 2026`. */
export function monthLabel(day: number): string {
  return new Date(day * 86_400_000).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * The part of a fund page title that names the fund: the scheme name without its plan and option words and
 * without bracketed notes, e.g. "ICICI Prudential Large Cap Fund (erstwhile Bluechip Fund) - Direct Plan - Growth"
 * becomes "ICICI Prudential Large Cap" (a trailing "Fund" is dropped to keep titles short).
 *
 * @param name - AMFI scheme name.
 */
export function fundTitleStem(name: string): string {
  return shortName(name).replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim().replace(/\s+Fund$/i, '');
}

/**
 * Title of a fund page: "Parag Parikh Flexi Cap Direct Growth: NAV, Returns, Expense Ratio (Nov 2026)".
 * The month shows searchers that the figures are current. The scheme code is added only when two funds
 * would otherwise get the same title (titles must be unique), see {@link duplicateStems}.
 *
 * @param f - The fund's name, plan, option, NAV date and scheme code.
 * @param duplicated - True when another fund page has the same stem, plan and option.
 */
export function fundTitle(f: { name: string; plan: string; option: string; navDate: number; code: number }, duplicated = false): string {
  const plan = f.plan === 'direct' ? 'Direct ' : f.plan === 'regular' ? 'Regular ' : '';
  const option = f.option === 'idcw' ? 'IDCW' : f.option === 'growth' ? 'Growth' : '';
  const stem = `${fundTitleStem(f.name)}${duplicated ? ` (${f.code})` : ''}`;
  return `${stem} ${plan}${option}: NAV, Returns, Expense Ratio (${monthLabel(f.navDate)})`.replace(/\s{2,}/g, ' ');
}

/**
 * Keys (stem + plan + option) used by more than one fund page, so those pages can add their scheme code.
 *
 * @param funds - Every fund that gets a page of its own.
 * @returns The set of duplicated keys; test a fund with {@link titleKey}.
 */
export function duplicateStems(funds: readonly { name: string; plan: string; option: string }[]): Set<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const f of funds) {
    const k = titleKey(f);
    if (seen.has(k)) dup.add(k);
    seen.add(k);
  }
  return dup;
}

/** Key that decides whether two funds would get the same title. */
export function titleKey(f: { name: string; plan: string; option: string }): string {
  return `${fundTitleStem(f.name).toLowerCase()}|${f.plan}|${f.option}`;
}

const cache = new WeakMap<ScreenerData, Set<string>>();

/**
 * {@link duplicateStems} for every fund page of a dataset, computed once per dataset (every fund page asks).
 *
 * @param data - The dataset.
 */
export function duplicateTitleKeys(data: ScreenerData): Set<string> {
  let out = cache.get(data);
  if (!out) {
    const funds: { name: string; plan: string; option: string }[] = [];
    for (let i = 0; i < data.count; i++) {
      const plan = data.dict.plan[data.plan[i]];
      const option = data.dict.option[data.option[i]];
      if (hasFundPage(plan, option)) funds.push({ name: data.name[i], plan, option });
    }
    out = duplicateStems(funds);
    cache.set(data, out);
  }
  return out;
}
