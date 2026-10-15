import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { RENT_VS_BUY_DEFAULTS as D, breakEvenRent, rentVsBuy } from '../../lib/rentVsBuy.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';
import { Tile } from './shared.tsx';

type Lang = 'en' | 'hi';

const T = {
  en: {
    inputs: 'Rent vs buy inputs', price: 'Home price', down: 'Down payment', rent: 'Rent for a similar home (per month)', horizon: 'Years before you would sell', loanRate: 'Home loan interest rate', loanYears: 'Loan tenure',
    more: 'More assumptions', rentGrowth: 'Rent increase (per year)', appreciation: 'Home price growth (per year)', invest: 'Return on investments (per year)', stamp: 'Stamp duty and registration',
    holding: 'Maintenance and property tax (per year, % of home value)', selling: 'Cost of selling', tax: 'Tax on gains (home and investments)', yrs: 'years',
    buyer: (h: number) => `If you buy: what you own after ${h} years`, renter: (h: number) => `If you rent: what you own after ${h} years`, emi: 'Monthly EMI', upfront: 'Cash needed on day one', yieldLabel: 'Yearly rent as % of price',
    breakEven: 'Rent at which buying breaks even', notReached: 'Not reached', aMonth: 'a month',
    never: (h: number) => `Buying does not catch up with renting within ${h} years.`, ahead: (y: number) => `Buying is ahead from year ${y} onwards.`,
    after: (h: number, v: string, l: string) => `Home price after ${h} years: ${v}; loan still owed then: ${l}.`,
    tie: (h: number) => `Over ${h} years, buying and renting end up level with these assumptions.`,
    buy: (h: number, a: string) => `Over ${h} years, buying leaves you ${a} ahead of renting and investing the difference.`,
    rentWins: (h: number, a: string) => `Over ${h} years, renting and investing the difference leaves you ${a} ahead of buying.`,
    chart: { year: 'Year', value: 'If you buy', invested: 'If you rent' }, byYear: 'Year-by-year breakdown', year: 'Year', ifBuy: 'If you buy', ifRent: 'If you rent',
  },
  hi: {
    inputs: 'किराया बनाम ख़रीद की जानकारी', price: 'घर की कीमत', down: 'डाउन पेमेंट', rent: 'ऐसे ही घर का किराया (हर महीने)', horizon: 'कितने साल बाद बेचेंगे', loanRate: 'होम लोन की ब्याज दर', loanYears: 'लोन की अवधि',
    more: 'और मान्यताएँ', rentGrowth: 'किराये में बढ़ोतरी (सालाना)', appreciation: 'घर की कीमत में बढ़त (सालाना)', invest: 'निवेश पर रिटर्न (सालाना)', stamp: 'स्टाम्प ड्यूटी और रजिस्ट्रेशन',
    holding: 'रखरखाव और प्रॉपर्टी टैक्स (सालाना, घर की कीमत का %)', selling: 'बेचने का खर्च', tax: 'मुनाफ़े पर टैक्स (घर और निवेश)', yrs: 'साल',
    buyer: (h: number) => `ख़रीदने पर: ${h} साल बाद आपके पास`, renter: (h: number) => `किराये पर रहने पर: ${h} साल बाद आपके पास`, emi: 'हर महीने की EMI', upfront: 'पहले दिन चाहिए रकम', yieldLabel: 'सालाना किराया (कीमत का %)',
    breakEven: 'वह किराया जिस पर ख़रीद बराबरी पर आती है', notReached: 'नहीं पहुँचता', aMonth: 'हर महीने',
    never: (h: number) => `${h} साल में ख़रीद किराये की बराबरी नहीं कर पाती।`, ahead: (y: number) => `साल ${y} के बाद से ख़रीदना आगे है।`,
    after: (h: number, v: string, l: string) => `${h} साल बाद घर की कीमत: ${v}; तब बाकी लोन: ${l}।`,
    tie: (h: number) => `इन मान्यताओं पर ${h} साल में ख़रीदना और किराये पर रहना बराबर रहते हैं।`,
    buy: (h: number, a: string) => `${h} साल में ख़रीदने पर आप किराये पर रहकर फ़र्क़ निवेश करने से ${a} आगे रहते हैं।`,
    rentWins: (h: number, a: string) => `${h} साल में किराये पर रहकर फ़र्क़ निवेश करने पर आप ख़रीदने से ${a} आगे रहते हैं।`,
    chart: { year: 'साल', value: 'ख़रीदने पर', invested: 'किराये पर' }, byYear: 'साल दर साल ब्योरा', year: 'साल', ifBuy: 'ख़रीदने पर', ifRent: 'किराये पर',
  },
} as const;

const pct = (f: number): number => Math.round(f * 10_000) / 100;

/**
 * Rent vs buy. The maths is in src/lib/rentVsBuy.ts (unit tested); this component collects the
 * assumptions, which all start at the defaults there, and shows the outcome. Percent inputs are
 * shown as percentages and converted to fractions here.
 */
export function RentVsBuy({ lang = 'en' }: { lang?: Lang }) {
  const t = T[lang];
  const [price, setPrice] = useState(D.price);
  const [down, setDown] = useState(pct(D.downPaymentPct));
  const [rent, setRent] = useState(D.monthlyRent);
  const [horizon, setHorizon] = useState(D.horizonYears);
  const [loanRate, setLoanRate] = useState(pct(D.loanRate));
  const [loanYears, setLoanYears] = useState(D.loanYears);
  const [rentGrowth, setRentGrowth] = useState(pct(D.rentGrowth));
  const [appreciation, setAppreciation] = useState(pct(D.appreciation));
  const [invest, setInvest] = useState(pct(D.investReturn));
  const [stamp, setStamp] = useState(pct(D.stampDutyPct));
  const [holding, setHolding] = useState(pct(D.holdingCostPct));
  const [selling, setSelling] = useState(pct(D.sellingCostPct));
  const [tax, setTax] = useState(pct(D.gainsTaxPct));

  const input = {
    price, downPaymentPct: down / 100, stampDutyPct: stamp / 100, loanRate: loanRate / 100, loanYears, monthlyRent: rent,
    rentGrowth: rentGrowth / 100, appreciation: appreciation / 100, investReturn: invest / 100, holdingCostPct: holding / 100,
    sellingCostPct: selling / 100, gainsTaxPct: tax / 100, horizonYears: horizon,
  };
  const r = useMemo(() => rentVsBuy(input), [price, down, rent, horizon, loanRate, loanYears, rentGrowth, appreciation, invest, stamp, holding, selling, tax]);
  const be = useMemo(() => breakEvenRent(input), [price, down, rent, horizon, loanRate, loanYears, rentGrowth, appreciation, invest, stamp, holding, selling, tax]);

  const abs = formatRupees(Math.abs(r.difference));
  const verdict = r.winner === 'tie' ? t.tie(horizon) : r.winner === 'buy' ? t.buy(horizon, abs) : t.rentWins(horizon, abs);
  const chartRows = r.years.map((y) => ({ year: y.year, value: Math.max(0, y.buyer), invested: Math.max(0, y.renter) }));

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputs}>
        <NumberField label={t.price} value={price} onChange={setPrice} min={100_000} max={1_000_000_000} sliderMax={50_000_000} step={100_000} rupee />
        <NumberField label={t.down} value={down} onChange={setDown} min={0} max={100} step={1} unit="%" />
        <NumberField label={t.rent} value={rent} onChange={setRent} min={0} max={5_000_000} sliderMax={200_000} step={500} rupee />
        <NumberField label={t.horizon} value={horizon} onChange={setHorizon} min={1} max={40} step={1} unit={t.yrs} />
        <NumberField label={t.loanRate} value={loanRate} onChange={setLoanRate} min={0} max={20} step={0.05} unit="%" />
        <NumberField label={t.loanYears} value={loanYears} onChange={setLoanYears} min={1} max={30} step={1} unit={t.yrs} />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.more}</summary>
          <div class="space-y-5 p-4">
            <NumberField label={t.rentGrowth} value={rentGrowth} onChange={setRentGrowth} min={0} max={20} step={0.5} unit="%" />
            <NumberField label={t.appreciation} value={appreciation} onChange={setAppreciation} min={-10} max={20} step={0.5} unit="%" />
            <NumberField label={t.invest} value={invest} onChange={setInvest} min={0} max={30} step={0.5} unit="%" />
            <NumberField label={t.stamp} value={stamp} onChange={setStamp} min={0} max={15} step={0.5} unit="%" />
            <NumberField label={t.holding} value={holding} onChange={setHolding} min={0} max={5} step={0.1} unit="%" />
            <NumberField label={t.selling} value={selling} onChange={setSelling} min={0} max={10} step={0.5} unit="%" />
            <NumberField label={t.tax} value={tax} onChange={setTax} min={0} max={40} step={0.5} unit="%" />
          </div>
        </details>
      </form>

      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="rvb-verdict">{verdict}</p>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.buyer(horizon)} value={formatRupees(r.buyerNetWorth)} strong testid="rvb-buyer" />
          <Tile label={t.renter(horizon)} value={formatRupees(r.renterNetWorth)} strong testid="rvb-renter" />
          <Tile label={t.emi} value={formatRupees(Math.round(r.emi))} />
          <Tile label={t.upfront} value={formatRupees(Math.round(r.upfront))} />
          <Tile label={t.yieldLabel} value={`${(r.grossYield * 100).toFixed(2)}%`} />
          <Tile label={t.breakEven} value={be === null ? t.notReached : `${formatRupees(Math.round(be))} ${t.aMonth}`} testid="rvb-breakeven" />
        </div>
        <p class="text-sm text-muted" data-testid="rvb-note">
          {r.breakEvenYear === null ? t.never(horizon) : t.ahead(r.breakEvenYear)}{' '}{t.after(horizon, formatRupees(Math.round(r.finalPropertyValue)), formatRupees(Math.round(r.loanOutstanding)))}
        </p>
        <MiniChart rows={chartRows} labels={t.chart} />
        <details class="rounded-md border border-line">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.byYear}</summary>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-sm">
              <thead><tr class="border-y border-line text-xs text-muted">
                <th scope="col" class="px-4 py-2 text-left font-medium">{t.year}</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">{t.ifBuy}</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">{t.ifRent}</th>
              </tr></thead>
              <tbody>{r.years.map((y) => (
                <tr key={y.year} class="border-b border-line last:border-0">
                  <td class="px-4 py-2">{y.year}</td>
                  <td class="num px-4 py-2">{formatRupees(Math.round(y.buyer))}</td>
                  <td class="num px-4 py-2">{formatRupees(Math.round(y.renter))}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
