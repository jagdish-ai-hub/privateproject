import { describe, expect, it } from 'vitest';
import { formatIsoDate, terGap } from '../src/lib/costs.ts';
import { fundFaqs } from '../src/lib/faq.ts';
import { fund } from './seo-faq.test.ts';

const parts = (total: number) => ({ ber: total, brokerage: 0, transaction: 0, levies: 0, total });

describe('terGap', () => {
  it('is Regular minus Direct, with the rupees a year on one lakh', () => {
    expect(terGap({ date: '2026-09-30', regular: parts(1.7), direct: parts(0.77) })).toEqual({ regular: 1.7, direct: 0.77, gap: 0.93, perLakh: 930 });
  });
  it('is null unless both plans exist; a missing plan is never compared as 0', () => {
    expect(terGap({ date: 'x', regular: parts(1.7), direct: null })).toBeNull();
    expect(terGap({ date: 'x', regular: null, direct: parts(0.5) })).toBeNull();
    expect(terGap(null)).toBeNull();
  });
});

describe('formatIsoDate', () => {
  it('formats without time-zone drift', () => {
    expect(formatIsoDate('2026-09-30')).toBe('30 Sep 2026');
    expect(formatIsoDate('2026-01-01')).toBe('1 Jan 2026');
  });
  it('passes odd input through', () => {
    expect(formatIsoDate('')).toBe('');
    expect(formatIsoDate('n/a')).toBe('n/a');
  });
});

describe('TER and AUM FAQs', () => {
  it('state the numbers, both plans and the quarter', () => {
    const faqs = fundFaqs(fund);
    const t = faqs.find((f) => f.question.includes('expense ratio'))?.answer ?? '';
    expect(t).toContain('0.77%');
    expect(t).toContain('Regular plan is 1.70%');
    expect(t).toContain('0.93 percentage points');
    expect(t).toContain('30 Sep 2026');
    const a = faqs.find((f) => f.question.includes('AUM'))?.answer ?? '';
    expect(a).toContain('₹32,100 Cr');
    expect(a).toContain('July - September 2026');
  });
  it('an unmatched fund says so, never 0.00%, and has no AUM question', () => {
    const faqs = fundFaqs({ ...fund, ter: null, aum: null, terDetail: null });
    const t = faqs.find((f) => f.question.includes('expense ratio'))?.answer ?? '';
    expect(t).toContain('could not match');
    expect(t).not.toContain('0.00%');
    expect(faqs.some((f) => f.question.includes('AUM'))).toBe(false);
  });
  it('no advice words', () => {
    for (const f of fundFaqs(fund)) expect(f.answer).not.toMatch(/recommend|should buy|best/i);
  });
});
