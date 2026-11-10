import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { fuelCost, mileage } from '../../lib/vehicle.ts';
import { NumberField } from './NumberField.tsx';
import { Choice, Tile } from './shared.tsx';

type FuelType = 'petrol' | 'diesel' | 'cng';
/** Starting examples only: the visitor replaces them with today's price and their own mileage. */
const EXAMPLES: Record<FuelType, { price: number; kmPerUnit: number; unit: string; per: string }> = {
  petrol: { price: 100, kmPerUnit: 18, unit: 'litre', per: 'km/l' },
  diesel: { price: 90, kmPerUnit: 20, unit: 'litre', per: 'km/l' },
  cng: { price: 80, kmPerUnit: 25, unit: 'kg', per: 'km/kg' },
};
const FUELS: [FuelType, string][] = [['petrol', 'Petrol'], ['diesel', 'Diesel'], ['cng', 'CNG']];
const rs = (n: number): string => formatRupees(Math.round(n));
const rs2 = (n: number): string => formatRupees(n, 2);
const num = (n: number, dp = 1): string => n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const NOTE = 'The price and mileage shown at first are examples, not today’s figures. Enter the price at your pump and the mileage you actually get.';

/** Fuel cost of a trip and a month, or mileage from a tank-to-tank reading. English only. The maths is in src/lib/vehicle.ts. */
export function FuelCalculator({ kind }: { kind: 'fuelcost' | 'mileage' }) {
  const [fuel, setFuel] = useState<FuelType>('petrol');
  const [price, setPrice] = useState(EXAMPLES.petrol.price);
  const [kmPerUnit, setKmPerUnit] = useState(EXAMPLES.petrol.kmPerUnit);
  const [cut, setCut] = useState(0);
  const [trip, setTrip] = useState(300);
  const [month, setMonth] = useState(1_000);
  const [people, setPeople] = useState(1);
  const [driven, setDriven] = useState(450);
  const [filled, setFilled] = useState(30);
  const ex = EXAMPLES[fuel];
  const pick = (f: FuelType): void => { setFuel(f); setPrice(EXAMPLES[f].price); setKmPerUnit(EXAMPLES[f].kmPerUnit); };
  const cost = useMemo(() => fuelCost({ fuelPrice: price, kmPerUnit, mileageCut: cut / 100, tripKm: trip, kmPerMonth: month, people }), [price, kmPerUnit, cut, trip, month, people]);
  const m = useMemo(() => mileage(driven, filled, price), [driven, filled, price]);

  if (kind === 'mileage') {
    return (
      <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label="Mileage inputs">
          <Choice label="Fuel" value={fuel} options={FUELS} onChange={pick} testid="fuel-type" />
          <NumberField label="Distance driven between two full tanks" value={driven} onChange={setDriven} min={1} max={100_000} sliderMax={1_500} step={1} unit="km" />
          <NumberField label={`Fuel needed to fill up again (${ex.unit}s)`} value={filled} onChange={setFilled} min={0.1} max={1_000} sliderMax={100} step={0.1} unit={ex.unit === 'kg' ? 'kg' : 'l'} />
          <NumberField label={`Fuel price per ${ex.unit}`} value={price} onChange={setPrice} min={1} max={1_000} sliderMax={200} step={0.1} rupee />
          <p class="text-xs leading-relaxed text-muted">The fuel price shown at first is an example. Enter what you paid.</p>
        </form>
        <div class="space-y-4" aria-live="polite">
          {m === null ? <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium">Enter the distance driven and the fuel filled.</p> : (<>
            <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="mileage-verdict">Your vehicle gives {num(m.kmPerUnit)} {ex.per}, which costs {rs2(m.costPerKm)} in fuel for every kilometre.</p>
            <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
              <Tile label={`Mileage (${ex.per})`} value={num(m.kmPerUnit, 2)} strong testid="mileage-kmpl" />
              <Tile label="Fuel cost per km" value={rs2(m.costPerKm)} testid="mileage-perkm" />
              <Tile label={`${ex.unit === 'kg' ? 'Kg' : 'Litres'} used per 100 km`} value={num(m.per100Km, 2)} testid="mileage-per100" />
              <Tile label="Cost of this tank" value={rs(filled * price)} />
            </div>
          </>)}
        </div>
      </div>
    );
  }

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label="Fuel cost inputs">
        <Choice label="Fuel" value={fuel} options={FUELS} onChange={pick} testid="fuel-type" />
        <NumberField label={`Fuel price per ${ex.unit}`} value={price} onChange={setPrice} min={1} max={1_000} sliderMax={200} step={0.1} rupee />
        <NumberField label={`Mileage (${ex.per})`} value={kmPerUnit} onChange={setKmPerUnit} min={1} max={200} sliderMax={50} step={0.1} />
        <NumberField label="Trip distance" value={trip} onChange={setTrip} min={1} max={100_000} sliderMax={2_000} step={1} unit="km" />
        <NumberField label="Distance driven in a month" value={month} onChange={setMonth} min={0} max={100_000} sliderMax={5_000} step={10} unit="km" />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">Real-world mileage and sharing</summary>
          <div class="space-y-5 p-4">
            <NumberField label="Lower the mileage for real driving by" value={cut} onChange={setCut} min={0} max={50} step={1} unit="%" />
            <NumberField label="People sharing the trip cost" value={people} onChange={setPeople} min={1} max={20} step={1} />
          </div>
        </details>
        <p class="text-xs leading-relaxed text-muted">{NOTE}</p>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="fuel-verdict">A {num(trip, 0)} km trip uses about {num(cost.tripFuel)} {ex.unit === 'kg' ? 'kg' : 'litres'} and costs {rs(cost.tripCost)} in fuel, which is {rs2(cost.perKm)} a kilometre.</p>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label="Fuel cost of the trip" value={rs(cost.tripCost)} strong testid="fuel-trip" />
          <Tile label="Fuel cost per km" value={rs2(cost.perKm)} testid="fuel-perkm" />
          <Tile label={`Fuel used on the trip (${ex.unit === 'kg' ? 'kg' : 'litres'})`} value={num(cost.tripFuel, 2)} testid="fuel-tripfuel" />
          {people > 1 && <Tile label="Trip cost per person" value={rs(cost.tripCostPerPerson)} testid="fuel-perperson" />}
          <Tile label="Fuel cost per month" value={rs(cost.perMonth)} testid="fuel-month" />
          <Tile label="Fuel cost per year" value={rs(cost.perYear)} testid="fuel-year" />
          {cut > 0 && <Tile label={`Mileage used (${ex.per})`} value={num(cost.mileageUsed, 2)} testid="fuel-mileageused" />}
        </div>
        <p class="text-xs leading-relaxed text-muted">Fuel only. Tolls, parking, servicing and tyres are not included; the car running cost calculator adds maintenance.</p>
      </div>
    </div>
  );
}
