import { describe, expect, it } from 'vitest';
import { PURITIES, jewelleryPrice, metalReturn } from '../src/lib/metals.ts';

const base = { ratePerGram: 10_000, weightGrams: 10, purity: 22 / 24, makingType: 'percent' as const, making: 0.1, gst: 0.03, buybackDeduction: 0 };

describe('jewelleryPrice', () => {
  it('22 carat: metal value = rate × grams × 22/24; making then GST on the total', () => {
    const r = jewelleryPrice(base);
    expect(r.metalValue).toBeCloseTo(10_000 * 10 * (22 / 24), 6); // 91,666.67
    expect(r.makingCharges).toBeCloseTo(r.metalValue * 0.1, 6);
    expect(r.gst).toBeCloseTo((r.metalValue + r.makingCharges) * 0.03, 6);
    expect(r.total).toBeCloseTo(r.metalValue * 1.1 * 1.03, 6);
  });
  it('making per gram is rupees × grams', () => {
    expect(jewelleryPrice({ ...base, makingType: 'perGram', making: 500 }).makingCharges).toBe(5_000);
  });
  it('premium and loss on selling back: making and GST are not recovered', () => {
    const r = jewelleryPrice(base);
    expect(r.premium).toBeCloseTo(1.1 * 1.03 - 1, 10);
    expect(r.sellBackValue).toBeCloseTo(r.metalValue, 6);
    expect(r.lostOnSelling).toBeCloseTo(r.total - r.metalValue, 6);
    expect(r.breakEvenRise).toBeCloseTo(1.1 * 1.03 - 1, 10);
  });
  it('a buy-back deduction raises the break-even rise', () => {
    const a = jewelleryPrice(base).breakEvenRise!;
    const b = jewelleryPrice({ ...base, buybackDeduction: 0.05 }).breakEvenRise!;
    expect(b).toBeGreaterThan(a);
    expect(b).toBeCloseTo((1.1 * 1.03) / 0.95 - 1, 10);
  });
  it('purity options are proportional to the entered price', () => {
    expect(PURITIES.gold[0].fraction).toBe(1);
    expect(PURITIES.gold[1].fraction).toBeCloseTo(22 / 24, 12);
    expect(PURITIES.silver[1].fraction).toBeCloseTo(925 / 999, 12);
  });
  it('zero weight does not give NaN', () => {
    const r = jewelleryPrice({ ...base, weightGrams: 0 });
    expect(r.total).toBe(0);
    expect(r.breakEvenRise).toBeNull();
    expect(r.premium).toBeNull();
  });
});

describe('metalReturn', () => {
  const p = { amount: 100_000, buyPrice: 5_000, sellPrice: 8_000, years: 5, buyCost: 0, sellCost: 0, holdingCostPerYear: 0 };
  it('with no costs the net CAGR equals the price CAGR', () => {
    const r = metalReturn(p);
    expect(r.grams).toBeCloseTo(20, 10);
    expect(r.finalValue).toBeCloseTo(160_000, 6);
    expect(r.priceCagr).toBeCloseTo((8000 / 5000) ** (1 / 5) - 1, 12);
    expect(r.netCagr).toBeCloseTo(r.priceCagr!, 10);
    expect(r.breakEvenPrice).toBeCloseTo(5_000, 6);
  });
  it('costs lower the return: buy and sell costs and a yearly holding cost', () => {
    const r = metalReturn({ ...p, buyCost: 0.05, sellCost: 0.02, holdingCostPerYear: 0.01 });
    expect(r.grams).toBeCloseTo((100_000 * 0.95) / 5_000, 10);
    expect(r.proceeds).toBeCloseTo(19 * 8_000 * 0.98, 6);
    expect(r.holdingCost).toBeCloseTo(100_000 * 0.95 * 0.01 * 5, 6);
    expect(r.netCagr!).toBeLessThan(r.priceCagr!);
    // selling at the break-even price returns exactly the money invested
    const be = metalReturn({ ...p, buyCost: 0.05, sellCost: 0.02, holdingCostPerYear: 0.01, sellPrice: r.breakEvenPrice! });
    expect(be.finalValue).toBeCloseTo(100_000, 4);
  });
  it('a price fall gives a negative return, and a total loss gives no CAGR', () => {
    expect(metalReturn({ ...p, sellPrice: 4_000 }).netCagr!).toBeLessThan(0);
    expect(metalReturn({ ...p, sellPrice: 0 }).netCagr).toBeNull();
  });
});
