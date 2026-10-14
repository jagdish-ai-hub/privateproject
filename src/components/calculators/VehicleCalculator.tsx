import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { EV_DEFAULT, compareCars, runningCost, type Car } from '../../lib/vehicle.ts';
import { NumberField } from './NumberField.tsx';
import { Choice, Tile } from './shared.tsx';

type Lang = 'en' | 'hi';
type Conv = 'petrol' | 'diesel' | 'cng';
export type VehicleKind = 'car' | 'evpetrol';

const T = {
  en: {
    fuel: 'Fuel', petrol: 'Petrol', diesel: 'Diesel', cng: 'CNG', ev: 'Electric',
    km: 'Distance driven per month', kmUnit: 'km',
    price: { petrol: 'Petrol price per litre', diesel: 'Diesel price per litre', cng: 'CNG price per kg' },
    mileage: { petrol: 'Mileage (km per litre)', diesel: 'Mileage (km per litre)', cng: 'Mileage (km per kg)' },
    maintenance: 'Maintenance (₹ per km)', battery: 'Battery size (kWh)', range: 'Real-world range on a full charge', loss: 'Energy lost while charging',
    home: 'Home electricity price (₹ per unit)', pub: 'Public charger price (₹ per unit)', share: 'Share of charging at public chargers',
    perKm: 'Running cost per km', perMonth: 'Per month', perYear: 'Per year', energy: 'Fuel / electricity per km', maint: 'Maintenance per km',
    years: 'Years you will keep the car', carA: 'Petrol / diesel / CNG car', carB: 'Electric car', priceA: 'Price of the fuel car', priceB: 'Price of the electric car', subsidy: 'Subsidy or discount on the electric car',
    otherA: 'Insurance and other yearly costs (fuel car)', otherB: 'Insurance and other yearly costs (electric car)',
    perKmA: 'Fuel car, per km', perKmB: 'Electric car, per km', monthA: 'Fuel car, per month', monthB: 'Electric car, per month',
    saving: 'Monthly saving with the electric car', extra: 'Extra price of the electric car', payback: 'Price paid back after', never: 'Not within any period: the electric car costs more to run',
    now: 'At once: the electric car does not cost more', months: 'months', km2: 'km driven', totalA: (y: number) => `Fuel car: total cost over ${y} years`, totalB: (y: number) => `Electric car: total cost over ${y} years`,
    moreAssumptions: 'Costs and prices', yrs: 'years',
    verdictEv: (m: string, y: number, d: string) => `The electric car costs ${m} less to run each month. Over ${y} years, including the price, it comes out ${d} cheaper.`,
    verdictFuel: (m: string, y: number, d: string) => `The electric car costs ${m} more to run each month. Over ${y} years, including the price, the fuel car comes out ${d} cheaper.`,
    verdictEvTotalFuel: (m: string, y: number, d: string) => `The electric car costs ${m} less to run each month, but over ${y} years, including the higher price, the fuel car is still ${d} cheaper.`,
    verdictFuelTotalEv: (m: string, y: number, d: string) => `The electric car costs ${m} more to run each month, but the lower price makes it ${d} cheaper over ${y} years.`,
    tie: 'The two cars cost about the same.',
    inputsLabel: 'Car cost inputs',
  },
  hi: {
    fuel: 'ईंधन', petrol: 'पेट्रोल', diesel: 'डीज़ल', cng: 'सीएनजी', ev: 'इलेक्ट्रिक',
    km: 'हर महीने कितने किलोमीटर चलाते हैं', kmUnit: 'किमी',
    price: { petrol: 'पेट्रोल का दाम (₹ प्रति लीटर)', diesel: 'डीज़ल का दाम (₹ प्रति लीटर)', cng: 'सीएनजी का दाम (₹ प्रति किलो)' },
    mileage: { petrol: 'माइलेज (किमी प्रति लीटर)', diesel: 'माइलेज (किमी प्रति लीटर)', cng: 'माइलेज (किमी प्रति किलो)' },
    maintenance: 'रखरखाव (₹ प्रति किमी)', battery: 'बैटरी का आकार (kWh)', range: 'फुल चार्ज पर असल रेंज', loss: 'चार्जिंग में बर्बाद होने वाली ऊर्जा',
    home: 'घर की बिजली का दाम (₹ प्रति यूनिट)', pub: 'पब्लिक चार्जर का दाम (₹ प्रति यूनिट)', share: 'पब्लिक चार्जर से होने वाली चार्जिंग का हिस्सा',
    perKm: 'प्रति किमी चलाने का खर्च', perMonth: 'हर महीने', perYear: 'हर साल', energy: 'प्रति किमी ईंधन / बिजली', maint: 'प्रति किमी रखरखाव',
    years: 'कार कितने साल रखेंगे', carA: 'पेट्रोल / डीज़ल / सीएनजी कार', carB: 'इलेक्ट्रिक कार', priceA: 'ईंधन वाली कार की कीमत', priceB: 'इलेक्ट्रिक कार की कीमत', subsidy: 'इलेक्ट्रिक कार पर सब्सिडी या छूट',
    otherA: 'बीमा और दूसरे सालाना खर्च (ईंधन वाली कार)', otherB: 'बीमा और दूसरे सालाना खर्च (इलेक्ट्रिक कार)',
    perKmA: 'ईंधन वाली कार, प्रति किमी', perKmB: 'इलेक्ट्रिक कार, प्रति किमी', monthA: 'ईंधन वाली कार, हर महीने', monthB: 'इलेक्ट्रिक कार, हर महीने',
    saving: 'इलेक्ट्रिक कार से हर महीने बचत', extra: 'इलेक्ट्रिक कार की अतिरिक्त कीमत', payback: 'कीमत का फ़र्क़ वसूल होने में लगेगा', never: 'किसी भी अवधि में नहीं: इलेक्ट्रिक कार चलाना महँगा पड़ता है',
    now: 'तुरंत: इलेक्ट्रिक कार महँगी नहीं है', months: 'महीने', km2: 'किमी चलने पर', totalA: (y: number) => `ईंधन वाली कार: ${y} साल का कुल खर्च`, totalB: (y: number) => `इलेक्ट्रिक कार: ${y} साल का कुल खर्च`,
    moreAssumptions: 'खर्च और कीमतें', yrs: 'साल',
    verdictEv: (m: string, y: number, d: string) => `इलेक्ट्रिक कार चलाने में हर महीने ${m} कम खर्च होता है। कीमत जोड़कर ${y} साल में यह ${d} सस्ती पड़ती है।`,
    verdictFuel: (m: string, y: number, d: string) => `इलेक्ट्रिक कार चलाने में हर महीने ${m} ज़्यादा खर्च होता है। कीमत जोड़कर ${y} साल में ईंधन वाली कार ${d} सस्ती पड़ती है।`,
    verdictEvTotalFuel: (m: string, y: number, d: string) => `इलेक्ट्रिक कार चलाने में हर महीने ${m} कम खर्च होता है, लेकिन ऊँची कीमत जोड़ने पर ${y} साल में ईंधन वाली कार अब भी ${d} सस्ती है।`,
    verdictFuelTotalEv: (m: string, y: number, d: string) => `इलेक्ट्रिक कार चलाने में हर महीने ${m} ज़्यादा खर्च होता है, पर कम कीमत के कारण ${y} साल में यह ${d} सस्ती पड़ती है।`,
    tie: 'दोनों कारों का खर्च लगभग बराबर है।',
    inputsLabel: 'कार के खर्च की जानकारी',
  },
} as const;

const DEFAULTS: Record<Conv, { price: number; mileage: number; maintenance: number }> = {
  petrol: { price: 100, mileage: 15, maintenance: 0.8 },
  diesel: { price: 90, mileage: 18, maintenance: 0.9 },
  cng: { price: 80, mileage: 22, maintenance: 0.8 },
};

const rs = (n: number, dp: 0 | 2 = 0): string => formatRupees(n, dp);
const pct = (f: number): number => Math.round(f * 10_000) / 100;

/** Inputs for one electric car, shared by both calculator modes. */
function EvFields({ t, v, set }: { t: (typeof T)[Lang]; v: EvState; set: (p: Partial<EvState>) => void }) {
  return (<>
    <NumberField label={t.battery} value={v.battery} onChange={(battery) => set({ battery })} min={1} max={200} step={1} unit="kWh" />
    <NumberField label={t.range} value={v.range} onChange={(range) => set({ range })} min={20} max={1000} step={5} unit={t.kmUnit} />
    <NumberField label={t.loss} value={v.loss} onChange={(loss) => set({ loss })} min={0} max={40} step={1} unit="%" />
    <NumberField label={t.home} value={v.home} onChange={(home) => set({ home })} min={0} max={50} step={0.5} rupee />
    <NumberField label={t.pub} value={v.pub} onChange={(pub) => set({ pub })} min={0} max={100} step={0.5} rupee />
    <NumberField label={t.share} value={v.share} onChange={(share) => set({ share })} min={0} max={100} step={5} unit="%" />
    <NumberField label={t.maintenance} value={v.maint} onChange={(maint) => set({ maint })} min={0} max={20} step={0.1} rupee />
  </>);
}
interface EvState { battery: number; range: number; loss: number; home: number; pub: number; share: number; maint: number }
const EV0: EvState = { battery: EV_DEFAULT.batteryKwh, range: EV_DEFAULT.rangeKm, loss: pct(EV_DEFAULT.chargingLoss), home: EV_DEFAULT.homeRate, pub: EV_DEFAULT.publicRate, share: pct(EV_DEFAULT.publicShare), maint: EV_DEFAULT.maintenancePerKm };
const toEv = (v: EvState): Car => ({ fuel: 'ev', batteryKwh: v.battery, rangeKm: v.range, chargingLoss: v.loss / 100, homeRate: v.home, publicRate: v.pub, publicShare: v.share / 100, maintenancePerKm: v.maint });

/** Running cost of one car (any fuel), or an electric car against a fuel car. Maths is in src/lib/vehicle.ts. */
export function VehicleCalculator({ kind, lang = 'en' }: { kind: VehicleKind; lang?: Lang }) {
  const t = T[lang];
  const [km, setKm] = useState(1000);
  const [fuel, setFuel] = useState<Conv | 'ev'>(kind === 'car' ? 'petrol' : 'petrol');
  const [conv, setConv] = useState(DEFAULTS.petrol);
  const [ev, setEv] = useState(EV0);
  const [years, setYears] = useState(5);
  const [priceA, setPriceA] = useState(1_000_000);
  const [priceB, setPriceB] = useState(1_400_000);
  const [subsidy, setSubsidy] = useState(0);
  const [otherA, setOtherA] = useState(25_000);
  const [otherB, setOtherB] = useState(35_000);
  const setEvP = (p: Partial<EvState>): void => setEv((e) => ({ ...e, ...p }));
  const pickFuel = (f: Conv | 'ev'): void => { setFuel(f); if (f !== 'ev') setConv(DEFAULTS[f]); };
  const convFuel: Conv = fuel === 'ev' ? 'petrol' : fuel;
  const convCar: Car = { fuel: convFuel, fuelPrice: conv.price, kmPerUnit: conv.mileage, maintenancePerKm: conv.maintenance };

  const convFields = (
    <>
      <NumberField label={t.price[convFuel]} value={conv.price} onChange={(price) => setConv((c) => ({ ...c, price }))} min={1} max={500} step={0.5} rupee />
      <NumberField label={t.mileage[convFuel]} value={conv.mileage} onChange={(mileage) => setConv((c) => ({ ...c, mileage }))} min={1} max={60} step={0.5} unit={t.kmUnit} />
      <NumberField label={t.maintenance} value={conv.maintenance} onChange={(maintenance) => setConv((c) => ({ ...c, maintenance }))} min={0} max={20} step={0.1} rupee />
    </>
  );
  const fuelChoice = (opts: [Conv | 'ev', string][], label: string) => <Choice label={label} value={fuel} options={opts} onChange={pickFuel} testid="fuel-choice" />;

  const single = useMemo(() => runningCost(fuel === 'ev' ? toEv(ev) : convCar, km), [fuel, conv, ev, km]);
  const cmp = useMemo(
    () => compareCars(convCar, toEv(ev), km, years, priceA, priceB, subsidy, otherA, otherB),
    [conv, convFuel, ev, km, years, priceA, priceB, subsidy, otherA, otherB],
  );

  if (kind === 'car') {
    return (
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputsLabel}>
          {fuelChoice([['petrol', t.petrol], ['diesel', t.diesel], ['cng', t.cng], ['ev', t.ev]], t.fuel)}
          <NumberField label={t.km} value={km} onChange={setKm} min={1} max={20_000} sliderMax={5000} step={50} unit={t.kmUnit} />
          {fuel === 'ev' ? <EvFields t={t} v={ev} set={setEvP} /> : convFields}
        </form>
        <div class="space-y-4" aria-live="polite">
          <div class="grid gap-3 sm:grid-cols-3" data-testid="results">
            <Tile label={t.perKm} value={rs(single.perKm, 2)} strong testid="veh-perkm" />
            <Tile label={t.perMonth} value={rs(single.perMonth)} testid="veh-permonth" />
            <Tile label={t.perYear} value={rs(single.perYear)} testid="veh-peryear" />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <Tile label={t.energy} value={rs(single.energyPerKm, 2)} testid="veh-energy" />
            <Tile label={t.maint} value={rs(single.maintenancePerKm, 2)} />
          </div>
        </div>
      </div>
    );
  }

  const diff = cmp.totalA - cmp.totalB; // positive: the electric car is cheaper overall
  const abs = rs(Math.abs(diff));
  const mAbs = rs(Math.abs(cmp.monthlySaving));
  const evRunsCheaper = cmp.monthlySaving > 0;
  let verdict: string;
  if (Math.abs(diff) < 1 && Math.abs(cmp.monthlySaving) < 1) verdict = t.tie;
  else if (evRunsCheaper) verdict = diff >= 0 ? t.verdictEv(mAbs, years, abs) : t.verdictEvTotalFuel(mAbs, years, abs);
  else verdict = diff >= 0 ? t.verdictFuelTotalEv(mAbs, years, abs) : t.verdictFuel(mAbs, years, abs);
  const pay = cmp.paybackMonths === null ? t.never : cmp.paybackMonths === 0 ? t.now : `${Math.ceil(cmp.paybackMonths)} ${t.months} (${Math.round(cmp.paybackKm ?? 0).toLocaleString('en-IN')} ${t.km2})`;

  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputsLabel}>
        <NumberField label={t.km} value={km} onChange={setKm} min={1} max={20_000} sliderMax={5000} step={50} unit={t.kmUnit} />
        <NumberField label={t.years} value={years} onChange={setYears} min={1} max={20} step={1} unit={t.yrs} />
        <h3 class="pt-1 text-sm font-semibold">{t.carA}</h3>
        {fuelChoice([['petrol', t.petrol], ['diesel', t.diesel], ['cng', t.cng]], t.fuel)}
        {convFields}
        <NumberField label={t.priceA} value={priceA} onChange={setPriceA} min={50_000} max={100_000_000} sliderMax={5_000_000} step={10_000} rupee />
        <h3 class="pt-1 text-sm font-semibold">{t.carB}</h3>
        <EvFields t={t} v={ev} set={setEvP} />
        <NumberField label={t.priceB} value={priceB} onChange={setPriceB} min={50_000} max={100_000_000} sliderMax={5_000_000} step={10_000} rupee />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.moreAssumptions}</summary>
          <div class="space-y-5 p-4">
            <NumberField label={t.subsidy} value={subsidy} onChange={setSubsidy} min={0} max={10_000_000} sliderMax={500_000} step={5_000} rupee />
            <NumberField label={t.otherA} value={otherA} onChange={setOtherA} min={0} max={1_000_000} sliderMax={100_000} step={1_000} rupee />
            <NumberField label={t.otherB} value={otherB} onChange={setOtherB} min={0} max={1_000_000} sliderMax={100_000} step={1_000} rupee />
          </div>
        </details>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="veh-verdict">{verdict}</p>
        <div class="grid gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.perKmA} value={rs(cmp.a.perKm, 2)} testid="veh-perkm-a" />
          <Tile label={t.perKmB} value={rs(cmp.b.perKm, 2)} testid="veh-perkm-b" />
          <Tile label={t.monthA} value={rs(cmp.a.perMonth)} />
          <Tile label={t.monthB} value={rs(cmp.b.perMonth)} />
          <Tile label={t.saving} value={rs(cmp.monthlySaving)} strong testid="veh-saving" />
          <Tile label={t.extra} value={rs(cmp.extraUpfront)} testid="veh-extra" />
          <Tile label={t.totalA(years)} value={rs(cmp.totalA)} testid="veh-total-a" />
          <Tile label={t.totalB(years)} value={rs(cmp.totalB)} testid="veh-total-b" />
          <Tile label={t.payback} value={pay} testid="veh-payback" />
        </div>
      </div>
    </div>
  );
}
