import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { fuelCost, mileage } from '../../lib/vehicle.ts';
import { NumberField } from './NumberField.tsx';
import { Choice, Tile } from './shared.tsx';

type FuelType = 'petrol' | 'diesel' | 'cng';
type Lang = 'en' | 'hi';
/** Starting examples only: the visitor replaces them with today's price and their own mileage. */
const EXAMPLES: Record<FuelType, { price: number; kmPerUnit: number; kg: boolean }> = {
  petrol: { price: 100, kmPerUnit: 18, kg: false },
  diesel: { price: 90, kmPerUnit: 20, kg: false },
  cng: { price: 80, kmPerUnit: 25, kg: true },
};
const rs = (n: number): string => formatRupees(Math.round(n));
const rs2 = (n: number): string => formatRupees(n, 2);
const num = (n: number, dp = 1): string => n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const T = {
  en: {
    fuels: [['petrol', 'Petrol'], ['diesel', 'Diesel'], ['cng', 'CNG']] as [FuelType, string][],
    fuel: 'Fuel', unit: (kg: boolean) => (kg ? 'kg' : 'litre'), units: (kg: boolean) => (kg ? 'kg' : 'litres'), per: (kg: boolean) => (kg ? 'km/kg' : 'km/l'),
    mileageForm: 'Mileage inputs', costForm: 'Fuel cost inputs',
    driven: 'Distance driven between two full tanks', filled: (kg: boolean) => `Fuel needed to fill up again (${kg ? 'kg' : 'litres'})`,
    price: (kg: boolean) => `Fuel price per ${kg ? 'kg' : 'litre'}`, pricedNote: 'The fuel price shown at first is an example. Enter what you paid.',
    enter: 'Enter the distance driven and the fuel filled.',
    mVerdict: (k: string, per: string, c: string) => `Your vehicle gives ${k} ${per}, which costs ${c} in fuel for every kilometre.`,
    mileage: (per: string) => `Mileage (${per})`, costPerKm: 'Fuel cost per km', per100: (kg: boolean) => `${kg ? 'Kg' : 'Litres'} used per 100 km`, tank: 'Cost of this tank',
    trip: 'Trip distance', month: 'Distance driven in a month', more: 'Real-world mileage and sharing', cut: 'Lower the mileage for real driving by', people: 'People sharing the trip cost',
    note: 'The price and mileage shown at first are examples, not today’s figures. Enter the price at your pump and the mileage you actually get.',
    fVerdict: (km: string, f: string, u: string, c: string, pk: string) => `A ${km} km trip uses about ${f} ${u} and costs ${c} in fuel, which is ${pk} a kilometre.`,
    tripCost: 'Fuel cost of the trip', tripFuel: (u: string) => `Fuel used on the trip (${u})`, perPerson: 'Trip cost per person', perMonth: 'Fuel cost per month', perYear: 'Fuel cost per year', used: (per: string) => `Mileage used (${per})`,
    fuelOnly: 'Fuel only. Tolls, parking, servicing and tyres are not included; the car running cost calculator adds maintenance.',
  },
  hi: {
    fuels: [['petrol', 'पेट्रोल'], ['diesel', 'डीज़ल'], ['cng', 'CNG']] as [FuelType, string][],
    fuel: 'ईंधन', unit: (kg: boolean) => (kg ? 'किलो' : 'लीटर'), units: (kg: boolean) => (kg ? 'किलो' : 'लीटर'), per: (kg: boolean) => (kg ? 'किमी/किलो' : 'किमी/लीटर'),
    mileageForm: 'माइलेज के इनपुट', costForm: 'ईंधन ख़र्च के इनपुट',
    driven: 'दो बार टंकी फ़ुल करने के बीच चली दूरी', filled: (kg: boolean) => `दोबारा फ़ुल करने में लगा ईंधन (${kg ? 'किलो' : 'लीटर'})`,
    price: (kg: boolean) => `ईंधन की क़ीमत प्रति ${kg ? 'किलो' : 'लीटर'}`, pricedNote: 'शुरू में दिखी क़ीमत सिर्फ़ उदाहरण है। आपने जो चुकाया, वह डालें।',
    enter: 'चली हुई दूरी और भरा गया ईंधन डालें।',
    mVerdict: (k: string, per: string, c: string) => `आपकी गाड़ी ${k} ${per} देती है, यानी हर किलोमीटर पर ${c} का ईंधन।`,
    mileage: (per: string) => `माइलेज (${per})`, costPerKm: 'प्रति किमी ईंधन ख़र्च', per100: (kg: boolean) => `हर 100 किमी पर ${kg ? 'किलो' : 'लीटर'}`, tank: 'इस टंकी का ख़र्च',
    trip: 'यात्रा की दूरी', month: 'महीने में चली दूरी', more: 'असली माइलेज और ख़र्च बाँटना', cut: 'असली ड्राइविंग के लिए माइलेज इतना घटाएँ', people: 'यात्रा का ख़र्च बाँटने वाले लोग',
    note: 'शुरू में दिखी क़ीमत और माइलेज उदाहरण हैं, आज के आँकड़े नहीं। अपने पंप की क़ीमत और अपनी गाड़ी का असली माइलेज डालें।',
    fVerdict: (km: string, f: string, u: string, c: string, pk: string) => `${km} किमी की यात्रा में लगभग ${f} ${u} ईंधन लगता है और ख़र्च ${c} आता है, यानी ${pk} प्रति किलोमीटर।`,
    tripCost: 'यात्रा का ईंधन ख़र्च', tripFuel: (u: string) => `यात्रा में लगा ईंधन (${u})`, perPerson: 'हर व्यक्ति का हिस्सा', perMonth: 'हर महीने ईंधन ख़र्च', perYear: 'हर साल ईंधन ख़र्च', used: (per: string) => `इस्तेमाल हुआ माइलेज (${per})`,
    fuelOnly: 'सिर्फ़ ईंधन। टोल, पार्किंग, सर्विसिंग और टायर शामिल नहीं हैं; कार चलाने के ख़र्च वाला कैलकुलेटर रखरखाव भी जोड़ता है।',
  },
} as const;

/** Fuel cost of a trip and a month, or mileage from a tank-to-tank reading, in English or Hindi. The maths is in src/lib/vehicle.ts. */
export function FuelCalculator({ kind, lang = 'en' }: { kind: 'fuelcost' | 'mileage'; lang?: Lang }) {
  const t = T[lang];
  const [fuel, setFuel] = useState<FuelType>('petrol');
  const [price, setPrice] = useState(EXAMPLES.petrol.price);
  const [kmPerUnit, setKmPerUnit] = useState(EXAMPLES.petrol.kmPerUnit);
  const [cut, setCut] = useState(0);
  const [trip, setTrip] = useState(300);
  const [month, setMonth] = useState(1_000);
  const [people, setPeople] = useState(1);
  const [driven, setDriven] = useState(450);
  const [filled, setFilled] = useState(30);
  const kg = EXAMPLES[fuel].kg;
  const per = t.per(kg);
  const pick = (f: FuelType): void => { setFuel(f); setPrice(EXAMPLES[f].price); setKmPerUnit(EXAMPLES[f].kmPerUnit); };
  const cost = useMemo(() => fuelCost({ fuelPrice: price, kmPerUnit, mileageCut: cut / 100, tripKm: trip, kmPerMonth: month, people }), [price, kmPerUnit, cut, trip, month, people]);
  const m = useMemo(() => mileage(driven, filled, price), [driven, filled, price]);
  const km = lang === 'hi' ? 'किमी' : 'km';

  if (kind === 'mileage') {
    return (
      <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.mileageForm}>
          <Choice label={t.fuel} value={fuel} options={t.fuels} onChange={pick} testid="fuel-type" />
          <NumberField label={t.driven} value={driven} onChange={setDriven} min={1} max={100_000} sliderMax={1_500} step={1} unit={km} />
          <NumberField label={t.filled(kg)} value={filled} onChange={setFilled} min={0.1} max={1_000} sliderMax={100} step={0.1} unit={t.unit(kg)} />
          <NumberField label={t.price(kg)} value={price} onChange={setPrice} min={1} max={1_000} sliderMax={200} step={0.1} rupee />
          <p class="text-xs leading-relaxed text-muted">{t.pricedNote}</p>
        </form>
        <div class="space-y-4" aria-live="polite">
          {m === null ? <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium">{t.enter}</p> : (<>
            <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="mileage-verdict">{t.mVerdict(num(m.kmPerUnit), per, rs2(m.costPerKm))}</p>
            <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
              <Tile label={t.mileage(per)} value={num(m.kmPerUnit, 2)} strong testid="mileage-kmpl" />
              <Tile label={t.costPerKm} value={rs2(m.costPerKm)} testid="mileage-perkm" />
              <Tile label={t.per100(kg)} value={num(m.per100Km, 2)} testid="mileage-per100" />
              <Tile label={t.tank} value={rs(filled * price)} />
            </div>
          </>)}
        </div>
      </div>
    );
  }

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.costForm}>
        <Choice label={t.fuel} value={fuel} options={t.fuels} onChange={pick} testid="fuel-type" />
        <NumberField label={t.price(kg)} value={price} onChange={setPrice} min={1} max={1_000} sliderMax={200} step={0.1} rupee />
        <NumberField label={t.mileage(per)} value={kmPerUnit} onChange={setKmPerUnit} min={1} max={200} sliderMax={50} step={0.1} />
        <NumberField label={t.trip} value={trip} onChange={setTrip} min={1} max={100_000} sliderMax={2_000} step={1} unit={km} />
        <NumberField label={t.month} value={month} onChange={setMonth} min={0} max={100_000} sliderMax={5_000} step={10} unit={km} />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.more}</summary>
          <div class="space-y-5 p-4">
            <NumberField label={t.cut} value={cut} onChange={setCut} min={0} max={50} step={1} unit="%" />
            <NumberField label={t.people} value={people} onChange={setPeople} min={1} max={20} step={1} />
          </div>
        </details>
        <p class="text-xs leading-relaxed text-muted">{t.note}</p>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="fuel-verdict">{t.fVerdict(num(trip, 0), num(cost.tripFuel), t.units(kg), rs(cost.tripCost), rs2(cost.perKm))}</p>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.tripCost} value={rs(cost.tripCost)} strong testid="fuel-trip" />
          <Tile label={t.costPerKm} value={rs2(cost.perKm)} testid="fuel-perkm" />
          <Tile label={t.tripFuel(t.units(kg))} value={num(cost.tripFuel, 2)} testid="fuel-tripfuel" />
          {people > 1 && <Tile label={t.perPerson} value={rs(cost.tripCostPerPerson)} testid="fuel-perperson" />}
          <Tile label={t.perMonth} value={rs(cost.perMonth)} testid="fuel-month" />
          <Tile label={t.perYear} value={rs(cost.perYear)} testid="fuel-year" />
          {cut > 0 && <Tile label={t.used(per)} value={num(cost.mileageUsed, 2)} testid="fuel-mileageused" />}
        </div>
        <p class="text-xs leading-relaxed text-muted">{t.fuelOnly}</p>
      </div>
    </div>
  );
}
