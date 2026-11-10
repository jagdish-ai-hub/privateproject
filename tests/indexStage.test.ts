import { describe, expect, it } from 'vitest';
import { DEFAULT_STAGE, DEFAULT_TOP_FUNDS, GROUPS, STAGES, groupOf, hreflangAllowed, isIndexable, parseStage, parseTopFunds, topFundSlugs, type Stage } from '../src/lib/indexStage.ts';
import { fundSlug } from '../src/lib/slug.ts';
import type { ScreenerData } from '../src/lib/screener/types.ts';

describe('parseStage', () => {
  it('an unset or empty setting is the default, which is the English pages only', () => {
    expect(DEFAULT_STAGE).toBe('en');
    expect(parseStage(undefined)).toBe('en');
    expect(parseStage('')).toBe('en');
    expect(parseStage('   ')).toBe('en');
  });
  it('accepts every stage, ignoring case and spaces', () => {
    for (const s of STAGES) expect(parseStage(s)).toBe(s);
    expect(parseStage(' CORE ')).toBe('core');
  });
  it('a typo fails loudly instead of picking another stage', () => {
    expect(() => parseStage('everything')).toThrow(/INDEX_STAGE must be one of/);
    expect(() => parseStage('none')).toThrow();
  });
});

describe('parseTopFunds', () => {
  it('defaults to 250 and accepts whole numbers', () => {
    expect(parseTopFunds(undefined)).toBe(DEFAULT_TOP_FUNDS);
    expect(parseTopFunds('')).toBe(250);
    expect(parseTopFunds('700')).toBe(700);
    expect(parseTopFunds('0')).toBe(0);
  });
  it('rejects anything else', () => {
    for (const bad of ['-1', '2.5', 'many', '1e3']) expect(() => parseTopFunds(bad), bad).toThrow(/INDEX_FUNDS/);
  });
});

describe('groupOf', () => {
  it('sorts every kind of page into its group', () => {
    expect(groupOf('/')).toBe('en');
    expect(groupOf('/tools/sip-calculator/')).toBe('en');
    expect(groupOf('/schemes/')).toBe('en');
    expect(groupOf('/learn/what-is-sip/')).toBe('en');
    expect(groupOf('/author/omm/')).toBe('en');
    expect(groupOf('/compare/')).toBe('en');
    expect(groupOf('/hi/')).toBe('hi');
    expect(groupOf('/hi/tools/sip-calculator/')).toBe('hi');
    expect(groupOf('/hi/author/omm/')).toBe('hi');
    expect(groupOf('/category/flexi-cap/')).toBe('lists');
    expect(groupOf('/amc/hdfc-mutual-fund/')).toBe('lists');
    expect(groupOf('/fund/parag-parikh-flexi-cap-fund-direct-plan-growth-122639/')).toBe('funds');
    expect(groupOf('/fund/')).toBe('ondemand');
  });
  it('ignores a missing trailing slash, a query and a fragment', () => {
    expect(groupOf('/hi/tools')).toBe('hi');
    expect(groupOf('/fund')).toBe('ondemand');
    expect(groupOf('/fund/?code=122640')).toBe('ondemand');
    expect(groupOf('/category/arbitrage#top')).toBe('lists');
    expect(groupOf('/hindi-guide/')).toBe('en');
  });
});

const PAGES = {
  en: '/tools/sip-calculator/',
  hi: '/hi/tools/sip-calculator/',
  lists: '/category/flexi-cap/',
  top: '/fund/big-fund-direct-growth-1/',
  other: '/fund/small-fund-direct-growth-2/',
  ondemand: '/fund/',
};
const TOP = new Set(['big-fund-direct-growth-1']);
/** What each stage opens: en, hi, lists, a top fund, any other fund. */
const OPEN: Record<Stage, [boolean, boolean, boolean, boolean, boolean]> = {
  en: [true, false, false, false, false],
  core: [true, true, false, false, false],
  lists: [true, true, true, false, false],
  funds: [true, true, true, true, false],
  all: [true, true, true, true, true],
};

describe('isIndexable', () => {
  for (const stage of STAGES) {
    it(`stage ${stage} opens exactly its groups`, () => {
      const got = [PAGES.en, PAGES.hi, PAGES.lists, PAGES.top, PAGES.other].map((p) => isIndexable(p, stage, TOP));
      expect(got).toEqual(OPEN[stage]);
    });
  }
  it('the shared on-demand page is never open, at any stage', () => {
    for (const stage of STAGES) expect(isIndexable(PAGES.ondemand, stage, TOP)).toBe(false);
  });
  it('without a list of top funds, stage funds opens no fund page, and stage all opens all', () => {
    expect(isIndexable(PAGES.top, 'funds')).toBe(false);
    expect(isIndexable(PAGES.top, 'all')).toBe(true);
  });
  it('each stage opens everything the one before it opened', () => {
    const paths = Object.values(PAGES);
    for (let i = 1; i < STAGES.length; i++) {
      for (const p of paths) if (isIndexable(p, STAGES[i - 1], TOP)) expect(isIndexable(p, STAGES[i], TOP), `${p} at ${STAGES[i]}`).toBe(true);
    }
  });
  it('every group is covered, so the sitemap files add up to the open pages', () => {
    expect([...GROUPS].sort()).toEqual(['en', 'funds', 'hi', 'lists']);
  });
});

describe('hreflangAllowed', () => {
  it('ties English and Hindi pages together only once Hindi is open', () => {
    const pair = ['/tools/sip-calculator/', '/hi/tools/sip-calculator/'];
    expect(hreflangAllowed(pair, 'en')).toBe(false);
    for (const s of ['core', 'lists', 'funds', 'all'] as const) expect(hreflangAllowed(pair, s), s).toBe(true);
  });
  it('a page with no alternates is trivially fine', () => {
    expect(hreflangAllowed(['/tools/sip-calculator/'], 'en')).toBe(true);
  });
});

/** A small columnar dataset: [name, code, plan, option, aum]. */
function data(rows: [string, number, string, string, number | null][]): ScreenerData {
  const dict = { plan: ['direct', 'regular', 'na'], option: ['growth', 'idcw'] };
  return {
    count: rows.length,
    name: rows.map((r) => r[0]),
    code: rows.map((r) => r[1]),
    plan: rows.map((r) => dict.plan.indexOf(r[2])),
    option: rows.map((r) => dict.option.indexOf(r[3])),
    aum: rows.map((r) => r[4]),
    dict,
  } as unknown as ScreenerData;
}

describe('topFundSlugs', () => {
  const d = data([
    ['Alpha Fund Direct Growth', 1, 'direct', 'growth', 500],
    ['Beta Fund Direct Growth', 2, 'direct', 'growth', 9_000],
    ['Beta Fund Regular Growth', 3, 'regular', 'growth', 99_999],
    ['Gamma Fund Direct IDCW', 4, 'direct', 'idcw', 99_999],
    ['Delta ETF', 5, 'na', 'growth', 1_000],
    ['Eps Fund Direct Growth', 6, 'direct', 'growth', null],
    ['Zeta Fund Direct Growth', 7, 'direct', 'growth', 1_000],
  ]);
  it('picks the largest by fund size, and only schemes that have a page of their own', () => {
    expect([...topFundSlugs(d, 2)]).toEqual([fundSlug('Beta Fund Direct Growth', 2), fundSlug('Delta ETF', 5)]);
  });
  it('breaks ties by scheme code and puts funds with no size last', () => {
    const all = [...topFundSlugs(d, 99)];
    expect(all).toEqual([2, 5, 7, 1, 6].map((c) => fundSlug(d.name[d.code.indexOf(c)], c)));
  });
  it('n = 0 opens none, and a large n opens all pages that exist', () => {
    expect(topFundSlugs(d, 0).size).toBe(0);
    expect(topFundSlugs(d, 1000).size).toBe(5);
  });
});
