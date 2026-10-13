import { describe, expect, it } from 'vitest';
import { SMALL_SAVINGS, ratesMayBeStale } from '../src/data/small-savings.ts';
import { impliedDoublingRate, kvp, mis, nsc, ppf, rd, scss, ssy, timeDeposit } from '../src/lib/schemes.ts';

const r = (pct: number) => pct / 100;
const R = SMALL_SAVINGS.rates;

describe('published figures are reproduced exactly', () => {
  it('PPF: ₹1.5 lakh a year by 5 April, 15 years at 7.1% → ₹40,68,209 (the figure 5paisa and others publish)', () => {
    expect(Math.round(ppf(150_000, r(7.1), 15).maturity)).toBe(4_068_209);
  });
  it('SSY: ₹1.5 lakh a year by 5 April at 8.2%, deposits 15 years, matures at 21 → ₹71,82,119 (stockcalc.in publishes the same)', () => {
    const x = ssy(150_000, r(8.2));
    expect(Math.round(x.maturity)).toBe(7_182_119);
    expect(x.invested).toBe(2_250_000);
  });
  it('RD: ₹100 a month for 5 years at 6.7%, compounded quarterly → ₹7,136.58', () => {
    expect(rd(100, r(6.7)).maturity.toFixed(2)).toBe('7136.58');
  });
  it('NSC: ₹1,000 for 5 years at 7.7% → ₹1,449.03', () => {
    expect(nsc(1_000, r(7.7)).maturity.toFixed(2)).toBe('1449.03');
  });
  it('MIS: ₹9 lakh at 7.4% → ₹5,550 a month', () => {
    expect(mis(900_000, r(7.4)).perPeriod).toBeCloseTo(5_550, 2);
  });
  it('SCSS: ₹30 lakh at 8.2% → ₹61,500 a quarter', () => {
    expect(scss(3_000_000, r(8.2)).perPeriod).toBeCloseTo(61_500, 2);
  });
  it('KVP: the notified 115 months and 7.5% agree (money doubles)', () => {
    expect(impliedDoublingRate(SMALL_SAVINGS.kvpMonths) * 100).toBeCloseTo(R.kvp, 1);
    expect(kvp(10_000, 115).maturity).toBe(20_000);
  });
});

describe('conventions', () => {
  it('PPF deposits made monthly earn less than one deposit by 5 April (less time invested)', () => {
    const yearly = ppf(150_000, r(7.1), 15, 'yearly-start').maturity;
    const monthly = ppf(150_000, r(7.1), 15, 'monthly').maturity;
    expect(monthly).toBeLessThan(yearly);
    expect(ppf(150_000, r(7.1), 15, 'monthly').invested).toBeCloseTo(2_250_000, 6);
  });
  it('PPF first-year interest with a 5 April deposit is exactly deposit × rate (credited once at year end)', () => {
    expect(ppf(100_000, r(7.1), 15).rows[0].interest).toBeCloseTo(7_100, 6);
  });
  it('SSY: deposits for 15 years only, account runs 21 years, balance keeps growing after deposits stop', () => {
    const s = ssy(150_000, r(8.2));
    expect(s.rows).toHaveLength(21);
    expect(s.invested).toBe(2_250_000);
    expect(s.rows[15].deposit).toBe(0);
    expect(s.rows[20].balance).toBeGreaterThan(s.rows[14].balance);
  });
  it('Time deposit: quarterly compounding paid yearly (₹1,000 at 7.5% → ₹77.14 a year)', () => {
    expect(timeDeposit(1_000, r(7.5), 5).perPeriod.toFixed(2)).toBe('77.14');
    expect(timeDeposit(1_000, r(7.5), 5).totalInterest).toBeCloseTo(77.135 * 5, 1);
  });
  it('RD yearly rows add up to the maturity value', () => {
    const x = rd(1_000, r(6.7));
    expect(x.rows).toHaveLength(5);
    expect(x.rows[4].balance).toBeCloseTo(x.maturity, 6);
    expect(x.rows.reduce((s, row) => s + row.deposit + row.interest, 0)).toBeCloseTo(x.maturity, 6);
  });
  it('payout schemes do not compound: total interest is payout × number of payouts', () => {
    expect(mis(100_000, r(7.4)).totalInterest).toBeCloseTo((100_000 * 0.074 / 12) * 60, 6);
    expect(scss(100_000, r(8.2)).totalInterest).toBeCloseTo(100_000 * 0.082 * 5, 6);
  });
});

describe('rate data', () => {
  it('has every scheme rate as a sensible percent and a dated notice', () => {
    for (const v of Object.values(R)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(15);
    }
    expect(SMALL_SAVINGS.notice.date <= SMALL_SAVINGS.period.from).toBe(true);
    expect(SMALL_SAVINGS.period.from < SMALL_SAVINGS.period.to).toBe(true);
  });
  it('knows when the stored quarter is over', () => {
    expect(ratesMayBeStale('2026-12-31')).toBe(false);
    expect(ratesMayBeStale('2027-01-01')).toBe(true);
  });
});
