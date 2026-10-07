/**
 * JSON-LD (schema.org) builders. Pure functions returning plain objects; BaseLayout turns them
 * into `<script type="application/ld+json">` tags.
 */

/** One FAQ entry. */
export interface Faq {
  question: string;
  answer: string;
}

/** A breadcrumb step. `url` is absolute. */
export interface Crumb {
  name: string;
  url: string;
}

/** Site name used in structured data and titles. */
export const SITE_NAME = 'Mutual Fund Compare';

/**
 * `Organization` + `WebSite` markup for the home page.
 *
 * @param siteUrl - Absolute site root, e.g. "https://example.com/".
 * @returns Two JSON-LD objects.
 */
export function siteLd(siteUrl: string): Record<string, unknown>[] {
  return [
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: siteUrl, logo: new URL('/favicon.svg', siteUrl).toString() },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: siteUrl },
  ];
}

/**
 * `BreadcrumbList` markup. Positions start at 1, in order.
 *
 * @param crumbs - Steps from the home page down to the current page.
 * @returns A JSON-LD object.
 */
export function breadcrumbLd(crumbs: readonly Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };
}

/**
 * `FAQPage` markup. Google stopped showing FAQ rich results in May 2026, but still reads the
 * markup and AI answer engines use it. The visible page must contain the same questions and
 * answers (the FAQ component renders from the same list).
 *
 * @param faqs - Questions and plain-text answers.
 * @returns A JSON-LD object.
 */
export function faqLd(faqs: readonly Faq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
}

/** Fields needed to describe a fund in structured data. */
export interface FundLdInput {
  name: string;
  url: string;
  description: string;
  amc: string;
  category: string;
  isin: string | null;
  code: number;
}

/**
 * `InvestmentFund` markup (schema.org, a kind of `FinancialProduct`).
 *
 * Only facts we actually have are included: no price, rating or yield claims.
 *
 * @param f - Fund facts.
 * @returns A JSON-LD object.
 */
export function fundLd(f: FundLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'InvestmentFund',
    name: f.name,
    url: f.url,
    description: f.description,
    category: f.category,
    provider: { '@type': 'Organization', name: f.amc },
    identifier: f.isin ?? String(f.code),
  };
}

/** Fields needed for an `Article`. */
export interface ArticleLdInput {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  siteUrl: string;
}

/**
 * `Article` markup for guides.
 *
 * @param a - Article facts (dates as ISO `YYYY-MM-DD`).
 * @returns A JSON-LD object.
 */
export function articleLd(a: ArticleLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.headline,
    description: a.description,
    mainEntityOfPage: a.url,
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    author: { '@type': 'Organization', name: SITE_NAME, url: a.siteUrl },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: a.siteUrl },
  };
}

/**
 * `WebApplication` markup for the calculators.
 *
 * @param name - Calculator name.
 * @param url - Absolute URL.
 * @param description - One-sentence description.
 * @returns A JSON-LD object.
 */
export function calculatorLd(name: string, url: string, description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    url,
    description,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };
}
