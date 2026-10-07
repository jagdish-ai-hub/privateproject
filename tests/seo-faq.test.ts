import { describe, expect, it } from 'vitest';
import { fundFaqs } from '../src/lib/faq.ts';
import type { Fund } from '../src/lib/data.ts';
import { articleLd, breadcrumbLd, calculatorLd, faqLd, fundLd, siteLd } from '../src/lib/seo.ts';
import { iso } from './helpers.ts';
import { METRIC_KEYS } from '../src/lib/screener/types.ts';

const metrics = Object.fromEntries(METRIC_KEYS.map((k) => [k, null])) as Fund['metrics'];
export const fund: Fund = {
  index: 0, displayName: 'SBI Small Cap Fund - Direct Plan - Growth', code: 125497, slug: 'sbi-small-cap-fund-direct-plan-growth-125497', name: 'SBI Small Cap Fund - Direct Plan - Growth',
  amc: 'SBI Mutual Fund', category: 'Small Cap', assetClass: 'Equity', schemeType: 'Open Ended', plan: 'direct', option: 'growth',
  nav: 205.754, navDate: iso('2026-10-01'), inception: iso('2013-11-18'), isin: 'INF200K01T51',
  ter: 0.77, aum: 32100.4, aumPeriod: 'July - September 2026', terAsOf: '2026-10-06', terParts: null,
  terDetail: { date: '2026-09-30', regular: { ber: 1.4, brokerage: 0.06, transaction: 0.05, levies: 0.19, total: 1.7 }, direct: { ber: 0.6, brokerage: 0.06, transaction: 0.05, levies: 0.06, total: 0.77 } },
  metrics: { ...metrics, r1y: 0.0547, r3y: 0.1077, r5y: 0.1314, sip3y: 0.0652, sip5y: null },
  ranks: { r1y: null, r3y: null, r5y: null }, adj: 0,
};

describe('fundFaqs', () => {
  const faqs = fundFaqs(fund);
  it('states the NAV with its date', () => {
    expect(faqs[0].answer).toContain('₹205.7540');
    expect(faqs[0].answer).toContain('01 Oct 2026');
  });
  it('uses the real return numbers and says nothing about the missing ones', () => {
    const r = faqs.find((f) => f.question.includes('returns'))?.answer ?? '';
    expect(r).toContain('+5.47%');
    expect(r).toContain('+10.77%');
    expect(r).toContain('+13.14%');
    expect(r).not.toMatch(/recommend|best|should buy/i);
  });
  it('a young fund gets "not available", never 0%', () => {
    const young = fundFaqs({ ...fund, metrics: { ...metrics, r1y: 0.02 } });
    const r = young.find((f) => f.question.includes('returns'))?.answer ?? '';
    expect(r).toContain('3 years: not available yet');
    expect(r).not.toContain('0.00%');
  });
  it('omits the SIP question when there is no SIP figure', () => {
    expect(fundFaqs({ ...fund, metrics }).some((f) => f.question.includes('SIP'))).toBe(false);
  });
  it('explains plan and option', () => {
    const q = faqs.find((f) => f.question.includes('Direct or Regular'))?.answer ?? '';
    expect(q).toContain('Direct plan');
    expect(q).toContain('Growth option');
  });
});

describe('JSON-LD builders', () => {
  it('breadcrumbs are positioned from 1', () => {
    const b = breadcrumbLd([{ name: 'Home', url: 'https://x.test/' }, { name: 'Fund', url: 'https://x.test/f/' }]) as { itemListElement: { position: number }[] };
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
  it('FAQPage mirrors the questions', () => {
    const f = faqLd([{ question: 'Q?', answer: 'A.' }]) as { '@type': string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(f['@type']).toBe('FAQPage');
    expect(f.mainEntity[0]).toMatchObject({ name: 'Q?', acceptedAnswer: { text: 'A.' } });
  });
  it('fund markup uses only known facts (no price / rating / yield)', () => {
    const l = fundLd({ name: fund.name, url: 'https://x.test/fund/a/', description: 'd', amc: fund.amc, category: fund.category, isin: fund.isin, code: fund.code });
    expect(l['@type']).toBe('InvestmentFund');
    expect(l.identifier).toBe('INF200K01T51');
    expect(Object.keys(l)).not.toEqual(expect.arrayContaining(['aggregateRating', 'offers', 'interestRate']));
    expect(JSON.stringify(l)).not.toContain('undefined');
  });
  it('fund markup falls back to the scheme code when there is no ISIN', () => {
    expect(fundLd({ name: 'x', url: 'u', description: 'd', amc: 'a', category: 'c', isin: null, code: 7 }).identifier).toBe('7');
  });
  it('site, article and calculator markup have the right types', () => {
    expect(siteLd('https://x.test/').map((o) => o['@type'])).toEqual(['Organization', 'WebSite']);
    expect(articleLd({ headline: 'h', description: 'd', url: 'u', datePublished: '2026-01-01', dateModified: '2026-02-01', siteUrl: 'https://x.test/' })['@type']).toBe('Article');
    expect(calculatorLd('SIP', 'u', 'd')).toMatchObject({ '@type': 'WebApplication', applicationCategory: 'FinanceApplication', offers: { price: '0' } });
  });
});
