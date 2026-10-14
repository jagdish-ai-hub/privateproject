import { describe, expect, it } from 'vitest';
import { EV_DEFAULT, PETROL_DEFAULT, blendedRate, compareCars, runningCost } from '../src/lib/vehicle.ts';

describe('runningCost', () => {
  it('petrol: price ÷ mileage plus maintenance', () => {
    const r = runningCost({ fuel: 'petrol', fuelPrice: 100, kmPerUnit: 20, maintenancePerKm: 1 }, 1000);
    expect(r.energyPerKm).toBeCloseTo(5, 10);
    expect(r.perKm).toBeCloseTo(6, 10);
    expect(r.perMonth).toBeCloseTo(6000, 6);
    expect(r.perYear).toBeCloseTo(72_000, 6);
  });
  it('CNG uses price per kg and km per kg the same way', () => {
    expect(runningCost({ fuel: 'cng', fuelPrice: 80, kmPerUnit: 20, maintenancePerKm: 0 }, 1).energyPerKm).toBeCloseTo(4, 10);
  });
  it('EV: kWh per km, grossed up for charging loss, at the blended unit price', () => {
    // 30 kWh over 200 km = 0.15 kWh/km; 10% loss -> 0.15/0.9; rate 8 (no public) -> 1.3333 per km
    const r = runningCost({ fuel: 'ev', batteryKwh: 30, rangeKm: 200, chargingLoss: 0.1, homeRate: 8, publicRate: 18, publicShare: 0, maintenancePerKm: 0 }, 1000);
    expect(r.energyPerKm).toBeCloseTo((0.15 / 0.9) * 8, 10);
    expect(r.perMonth).toBeCloseTo(1333.33, 1);
  });
  it('public charging share raises the blended rate in proportion', () => {
    expect(blendedRate({ ...EV_DEFAULT, publicShare: 0 })).toBe(8);
    expect(blendedRate({ ...EV_DEFAULT, publicShare: 1 })).toBe(18);
    expect(blendedRate({ ...EV_DEFAULT, publicShare: 0.5 })).toBe(13);
  });
  it('zero mileage or range does not produce NaN or Infinity', () => {
    expect(runningCost({ ...PETROL_DEFAULT, kmPerUnit: 0 }, 1000).perKm).toBe(PETROL_DEFAULT.maintenancePerKm);
    expect(Number.isFinite(runningCost({ ...EV_DEFAULT, rangeKm: 0 }, 1000).perKm)).toBe(true);
  });
});

describe('compareCars', () => {
  const km = 1000;
  it('payback = extra upfront ÷ monthly saving, and the km driven by then', () => {
    const c = compareCars(PETROL_DEFAULT, EV_DEFAULT, km, 5, 1_000_000, 1_500_000);
    expect(c.monthlySaving).toBeCloseTo(c.a.perMonth - c.b.perMonth, 6);
    expect(c.extraUpfront).toBe(500_000);
    expect(c.paybackMonths).toBeCloseTo(500_000 / c.monthlySaving, 6);
    expect(c.paybackKm).toBeCloseTo(c.paybackMonths! * km, 6);
  });
  it('a subsidy shortens the payback; a cheaper B pays back at once', () => {
    const base = compareCars(PETROL_DEFAULT, EV_DEFAULT, km, 5, 1_000_000, 1_500_000).paybackMonths!;
    expect(compareCars(PETROL_DEFAULT, EV_DEFAULT, km, 5, 1_000_000, 1_500_000, 100_000).paybackMonths!).toBeLessThan(base);
    expect(compareCars(PETROL_DEFAULT, EV_DEFAULT, km, 5, 1_000_000, 900_000).paybackMonths).toBe(0);
  });
  it('never pays back when B is dearer to run', () => {
    const c = compareCars(EV_DEFAULT, PETROL_DEFAULT, km, 5, 1_000_000, 1_500_000);
    expect(c.monthlySaving).toBeLessThan(0);
    expect(c.paybackMonths).toBeNull();
    expect(c.paybackKm).toBeNull();
  });
  it('total cost = price + running + other yearly costs over the years', () => {
    const c = compareCars(PETROL_DEFAULT, EV_DEFAULT, km, 5, 1_000_000, 1_500_000, 50_000, 30_000, 25_000);
    expect(c.totalA).toBeCloseTo(1_000_000 + c.a.perYear * 5 + 30_000 * 5, 4);
    expect(c.totalB).toBeCloseTo(1_450_000 + c.b.perYear * 5 + 25_000 * 5, 4);
  });
});
