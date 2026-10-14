/**
 * Running cost of a car, and petrol vs electric. Pure functions: no DOM, no network.
 *
 * Conventions (also shown on the calculator pages):
 * - Fuel cost per km for petrol, diesel and CNG is `price per litre (or kg) ÷ km per litre (or kg)`.
 * - Electric: energy used per km is `battery size ÷ real-world range`. Charging wastes some energy as
 *   heat, so the energy drawn from the socket is that divided by `(1 − charging loss)`. The price per
 *   unit is a mix of home and public charging, weighted by the share of units charged in public.
 * - Maintenance is a rupee amount per km that you enter (service, tyres, wear), and is the same for
 *   every km driven.
 * - Prices and mileage are entered, not looked up: they differ by city and by day.
 * - Insurance, road tax, parking, tolls, loan interest, resale value and battery replacement are NOT
 *   included unless you add them in the "other yearly costs" field.
 */

export type Fuel = 'petrol' | 'diesel' | 'cng' | 'ev';

export interface ConventionalCar {
  fuel: 'petrol' | 'diesel' | 'cng';
  /** Price of one litre (petrol, diesel) or one kg (CNG), in rupees. */
  fuelPrice: number;
  /** Real-world kilometres per litre (or per kg for CNG). */
  kmPerUnit: number;
}

export interface ElectricCar {
  fuel: 'ev';
  /** Usable battery size in kWh. */
  batteryKwh: number;
  /** Real-world range on a full battery, in km. */
  rangeKm: number;
  /** Fraction of the energy drawn from the socket that is lost while charging (0.1 = 10%). */
  chargingLoss: number;
  /** Price per unit (kWh) at home, in rupees. */
  homeRate: number;
  /** Price per unit (kWh) at a public charger, in rupees. */
  publicRate: number;
  /** Fraction of units charged at public chargers (0 to 1). */
  publicShare: number;
}

export type Car = (ConventionalCar | ElectricCar) & {
  /** Maintenance in rupees per km. */
  maintenancePerKm: number;
};

export interface RunningCost {
  /** Rupees of fuel or electricity per km. */
  energyPerKm: number;
  /** Maintenance, rupees per km. */
  maintenancePerKm: number;
  /** Total rupees per km. */
  perKm: number;
  /** Rupees per month at the given monthly distance. */
  perMonth: number;
  /** Rupees per year. */
  perYear: number;
}

/** Electricity price per unit after mixing home and public charging. */
export function blendedRate(c: ElectricCar): number {
  return c.homeRate * (1 - c.publicShare) + c.publicRate * c.publicShare;
}

/** Running cost per km, per month and per year. */
export function runningCost(car: Car, kmPerMonth: number): RunningCost {
  let energyPerKm: number;
  if (car.fuel === 'ev') {
    const kwhPerKm = car.rangeKm > 0 ? car.batteryKwh / car.rangeKm : 0;
    energyPerKm = (kwhPerKm / (1 - car.chargingLoss)) * blendedRate(car);
  } else {
    energyPerKm = car.kmPerUnit > 0 ? car.fuelPrice / car.kmPerUnit : 0;
  }
  const perKm = energyPerKm + car.maintenancePerKm;
  return { energyPerKm, maintenancePerKm: car.maintenancePerKm, perKm, perMonth: perKm * kmPerMonth, perYear: perKm * kmPerMonth * 12 };
}

export interface Comparison {
  a: RunningCost;
  b: RunningCost;
  /** `a.perMonth - b.perMonth`: positive means B is cheaper to run. */
  monthlySaving: number;
  /** Extra price of B over A, after any subsidy (can be negative). */
  extraUpfront: number;
  /** Months until B's lower running cost has paid back its higher price; null if it never does, 0 if B is not dearer. */
  paybackMonths: number | null;
  /** Kilometres driven by the payback point. */
  paybackKm: number | null;
  /** Total cost of ownership over the period (price + running + other yearly costs) for each car. */
  totalA: number;
  totalB: number;
}

/**
 * Compare car A with car B over a period.
 *
 * @param priceA - Purchase price of A.
 * @param priceB - Purchase price of B, before subsidy.
 * @param subsidyB - Subsidy or discount given on B.
 * @param otherYearlyA - Insurance and other yearly costs of A.
 * @param otherYearlyB - Same for B.
 */
export function compareCars(a: Car, b: Car, kmPerMonth: number, years: number, priceA: number, priceB: number, subsidyB = 0, otherYearlyA = 0, otherYearlyB = 0): Comparison {
  const ra = runningCost(a, kmPerMonth);
  const rb = runningCost(b, kmPerMonth);
  const monthlySaving = ra.perMonth - rb.perMonth;
  const extraUpfront = priceB - subsidyB - priceA;
  let paybackMonths: number | null;
  if (extraUpfront <= 0) paybackMonths = 0;
  else if (monthlySaving <= 0) paybackMonths = null;
  else paybackMonths = extraUpfront / monthlySaving;
  return {
    a: ra,
    b: rb,
    monthlySaving,
    extraUpfront,
    paybackMonths,
    paybackKm: paybackMonths === null ? null : paybackMonths * kmPerMonth,
    totalA: priceA + ra.perYear * years + otherYearlyA * years,
    totalB: priceB - subsidyB + rb.perYear * years + otherYearlyB * years,
  };
}

/** Starting values. Prices vary by city and change often: these are examples to replace. */
export const PETROL_DEFAULT: ConventionalCar & { maintenancePerKm: number } = { fuel: 'petrol', fuelPrice: 100, kmPerUnit: 15, maintenancePerKm: 0.8 };
export const EV_DEFAULT: ElectricCar & { maintenancePerKm: number } = { fuel: 'ev', batteryKwh: 30, rangeKm: 200, chargingLoss: 0.1, homeRate: 8, publicRate: 18, publicShare: 0.2, maintenancePerKm: 0.4 };
