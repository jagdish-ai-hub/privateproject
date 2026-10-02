import { formatDay, formatNav, formatPct } from './format.ts';
import type { Fund } from './data.ts';
import type { Faq } from './seo.ts';

const PLAN_TEXT: Record<string, string> = {
  direct: 'a Direct plan: it is bought straight from the fund house with no distributor commission, so its expense ratio is lower than the Regular plan of the same scheme.',
  regular: 'a Regular plan: it is bought through a distributor or advisor, and a commission is built into its expense ratio, so the expense ratio is higher than the Direct plan of the same scheme.',
};
const OPTION_TEXT: Record<string, string> = {
  growth: 'the Growth option, which reinvests all returns in the fund so the NAV keeps rising and no income is paid out.',
  idcw: 'an IDCW (Income Distribution cum Capital Withdrawal, formerly Dividend) option, which pays out part of the fund value from time to time and so reduces the NAV when it does.',
};

/**
 * Plain-text FAQ for a fund page, written from the fund's own numbers. Every answer states
 * facts only (no recommendation) and says plainly when a figure is not available.
 *
 * @param f - The fund.
 * @returns Questions and answers; the same list feeds the visible FAQ and the JSON-LD.
 */
export function fundFaqs(f: Fund): Faq[] {
  const m = f.metrics;
  const out: Faq[] = [
    {
      question: `What is the latest NAV of ${f.name}?`,
      answer: `The latest NAV of ${f.name} is ₹${formatNav(f.nav)} as on ${formatDay(f.navDate)}. NAV is the price of one unit of the fund, published by AMFI after each business day.`,
    },
  ];
  const ret = (label: string, v: number | null, kind: string): string =>
    v === null ? `${label}: not available yet, the fund is younger than that period.` : `${label}: ${formatPct(v)} (${kind}).`;
  out.push({
    question: `What are the returns of ${f.name}?`,
    answer: [ret('1 year', m.r1y, 'CAGR'), ret('3 years', m.r3y, 'CAGR'), ret('5 years', m.r5y, 'CAGR')].join(' ') + ' Returns are calculated from NAV history and are not a prediction of future returns.',
  });
  if (m.sip3y !== null) {
    out.push({
      question: `What is the SIP return of ${f.name}?`,
      answer: `A monthly SIP in ${f.name} over the last 3 years would have given an annualised return (XIRR) of ${formatPct(m.sip3y)}.${m.sip5y !== null ? ` Over 5 years the SIP XIRR is ${formatPct(m.sip5y)}.` : ''} SIP returns differ from lump sum returns because each instalment is invested for a different length of time.`,
    });
  }
  if (PLAN_TEXT[f.plan] || OPTION_TEXT[f.option]) {
    out.push({
      question: `Is ${f.name} a Direct or Regular plan, Growth or IDCW?`,
      answer: `${f.name} is ${PLAN_TEXT[f.plan] ?? 'a plan whose type is not stated in the data we use.'}${OPTION_TEXT[f.option] ? ` It is ${OPTION_TEXT[f.option]}` : ''}`,
    });
  }
  out.push({
    question: `Which category is ${f.name} in?`,
    answer: `${f.name} is classified by AMFI as ${f.category} (${f.assetClass}) and is offered by ${f.amc}.`,
  });
  return out;
}
