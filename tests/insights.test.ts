import { describe, expect, it } from 'vitest';
import { compareInsights, fundVsPeers, labelsFor, peerMedians, type InsightFund } from '../src/lib/insights.ts';
import { METRIC_KEYS } from '../src/lib/screener/types.ts';

const none = Object.fromEntries(METRIC_KEYS.map((k) => [k, null])) as InsightFund['metrics'];
const fund = (name: string, over: Partial<InsightFund> & { m?: Partial<InsightFund['metrics']> } = {}): InsightFund => {
  const { m, ...rest } = over;
  return { name, category: 'Flexi Cap', plan: 'direct', option: 'growth', ter: null, aum: null, age: 10, metrics: { ...none, ...m }, ...rest };
};

// Real figures from the compare page (6 Oct 2026).
const ppfas = fund('Parag Parikh Flexi Cap Fund - Direct Plan - Growth', { ter: 0.69, aum: 147064, age: 13.4, m: { r1y: -0.0456, r3y: 0.1195, r5y: 0.1116, vol3y: 0.098, mdd3y: -0.1098, sharpe3y: 0.57, roll1yPos: 0.896 } });
const uti = fund('UTI - Nifty Next 50 Index Fund - Direct Plan - Growth', { category: 'Index Fund', ter: 0.46, aum: 5806, age: 8.3, m: { r1y: 0.0194, r3y: 0.1582, r5y: 0.1073, vol3y: 0.185, mdd3y: -0.2645, sharpe3y: 0.56, roll1yPos: 0.743 } });
const sbi = fund('SBI Nifty Smallcap 250 Index Fund - Direct Plan - Growth', { category: 'Index Fund', ter: 0.51, aum: 1759, age: 4.0, m: { r1y: 0.0416, r3y: 0.1276, r5y: null, vol3y: 0.19, mdd3y: -0.2619, sharpe3y: 0.39, roll1yPos: 0.76 } });

describe('compareInsights', () => {
  const r = compareInsights([ppfas, uti]);
  const text = (id: string) => r.items.find((i) => i.id === id)?.text ?? '';
  it('compares returns over the longest period both funds have, and names the leader and the gap', () => {
    expect(text('returns')).toContain('Over 5 years, Parag Parikh Flexi Cap Fund grew the most');
    expect(text('returns')).toContain('+11.16%');
    expect(text('returns')).toContain('0.4 percentage points ahead of UTI');
  });
  it('finds the steadier and the cheaper fund from the real figures', () => {
    expect(text('volatility')).toContain('Parag Parikh Flexi Cap Fund had the smoother ride');
    expect(text('drawdown')).toContain('Parag Parikh Flexi Cap Fund (-11.0%), UTI - Nifty Next 50 Index Fund (-26.4%)');
    expect(text('cost')).toContain('UTI - Nifty Next 50 Index Fund costs the least');
    expect(text('cost')).toContain('0.23 percentage points');
    expect(text('cost')).toContain('₹2,300 a year on ₹10 lakh');
    expect(text('size')).toContain('Parag Parikh Flexi Cap Fund is the largest fund');
  });
  it('the headline says who leads on what', () => {
    expect(r.headline).toBe('Parag Parikh Flexi Cap Fund leads on returns and steadiness and consistency and size; UTI - Nifty Next 50 Index Fund leads on low cost.');
  });
  it('attaches an explainer term to each insight', () => {
    expect(r.items.find((i) => i.id === 'cost')?.term).toBe('ter');
    expect(r.items.find((i) => i.id === 'volatility')?.term).toBe('volatility');
  });
  it('uses a shorter common period when one fund is too young, and mentions the young fund', () => {
    const s = compareInsights([ppfas, sbi]);
    expect(s.items.find((i) => i.id === 'returns')?.text).toContain('Over 3 years');
    expect(s.items.find((i) => i.id === 'history')?.text).toContain('SBI Nifty Smallcap 250 Index Fund has only 4.0 years of history');
  });
  it('never compares a measure that any fund lacks, and never invents a leader on a tie', () => {
    const blank = compareInsights([fund('A Fund - Direct Plan - Growth'), fund('B Fund - Direct Plan - Growth')]);
    expect(blank.items).toEqual([]);
    expect(blank.headline).toBeNull();
    expect(blank.caveats.join(' ')).toContain('returns are not compared');
    const tie = compareInsights([fund('A Fund', { ter: 0.5 }), fund('B Fund', { ter: 0.5 })]);
    expect(tie.items.some((i) => i.id === 'cost')).toBe(false);
  });
  it('handles one fund or none', () => {
    expect(compareInsights([ppfas]).items).toEqual([]);
    expect(compareInsights([]).headline).toBeNull();
  });
  it('caveats: mixed plans and IDCW', () => {
    const c = compareInsights([ppfas, fund('X Fund - Regular Plan - IDCW', { plan: 'regular', option: 'idcw', category: 'Large Cap' })]).caveats.join(' ');
    expect(c).toContain('both Direct and Regular');
    expect(c).toContain('IDCW');
  });
  it('contains no advice words', () => {
    const all = [r.headline ?? '', ...r.items.map((i) => i.text), ...r.caveats].join(' ');
    expect(all).not.toMatch(/\b(buy|sell|avoid|recommend|best|worst fund|should|better fund)\b/i);
  });
});

describe('labelsFor', () => {
  it('adds plan and option only when names would collide', () => {
    expect(labelsFor([ppfas, uti])).toEqual(['Parag Parikh Flexi Cap Fund', 'UTI - Nifty Next 50 Index Fund']);
    const regular = fund('Parag Parikh Flexi Cap Fund - Regular Plan - Growth', { plan: 'regular' });
    expect(labelsFor([ppfas, regular])).toEqual(['Parag Parikh Flexi Cap Fund (Direct Growth)', 'Parag Parikh Flexi Cap Fund (Regular Growth)']);
  });
});

describe('fundVsPeers', () => {
  const peers = [ppfas, uti, sbi, fund('D', { ter: 1, m: { r5y: 0.09, vol3y: 0.15, mdd3y: -0.2 } })];
  const med = peerMedians(peers);
  it('states the fund figure and the group median, with above / below worded from the numbers', () => {
    const out = fundVsPeers(ppfas, med, 'Direct Growth funds');
    const t = (id: string) => out.find((i) => i.id === id)?.text ?? '';
    expect(t('peer-returns')).toContain('11.16%');
    expect(t('peer-returns')).toContain('4 Direct Growth funds');
    expect(t('peer-cost')).toContain('higher than the median of 0.60%'); // median of 0.69, 0.46, 0.51, 1.00
    expect(t('peer-volatility')).toContain('lower than the median');
    expect(t('peer-drawdown')).toContain('milder than');
  });
  it('says nothing for a tiny peer group', () => {
    expect(fundVsPeers(ppfas, peerMedians([ppfas, uti]), 'x')).toEqual([]);
  });
  it('skips measures the fund does not have', () => {
    expect(fundVsPeers(fund('E'), med, 'x')).toEqual([]);
  });
});
