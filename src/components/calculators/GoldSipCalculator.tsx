import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { goldSip } from '../../lib/metals.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';
import { Tile } from './shared.tsx';

const rs = (n: number): string => formatRupees(Math.round(n));
const grams = (n: number, g: string): string => `${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${g}`;

const T = {
  en: {
    form: 'Gold SIP inputs', monthly: 'Amount invested every month', price: 'Gold price per gram today', growth: 'Assumed rise in the gold price (per year)',
    period: 'Time period', years: 'years', cost: 'Cost on every purchase (GST, spread)', g: 'g',
    note: 'The gold price shown at first is an example, not today’s rate. The yearly rise is an assumption: gold has had long stretches of falling and flat prices.',
    verdict: (m: string, y: number, inv: string, gr: string, v: string, gro: number) => `${m} a month for ${y} years puts in ${inv} and collects about ${gr} of gold, worth ${v} if the price rises ${gro}% a year.`,
    value: 'Value at the end', invested: 'Amount invested', gain: 'Estimated gain', gold: 'Gold collected', avg: 'Average cost per gram', end: 'Price per gram at the end',
    breakdown: 'Year-by-year breakdown', year: 'Year', goldCol: 'Gold', valueCol: 'Value', investedCol: 'Invested',
  },
  hi: {
    form: 'गोल्ड SIP के इनपुट', monthly: 'हर महीने लगाई जाने वाली रकम', price: 'आज सोने का भाव प्रति ग्राम', growth: 'सोने के भाव में मानी गई बढ़त (सालाना)',
    period: 'अवधि', years: 'साल', cost: 'हर ख़रीद पर ख़र्च (GST, स्प्रेड)', g: 'ग्राम',
    note: 'शुरू में दिखा भाव सिर्फ़ उदाहरण है, आज का भाव नहीं। सालाना बढ़त एक अनुमान है: सोने के भाव लंबे समय तक गिरे और सपाट भी रहे हैं।',
    verdict: (m: string, y: number, inv: string, gr: string, v: string, gro: number) => `${y} साल तक हर महीने ${m} लगाने पर कुल ${inv} लगते हैं और लगभग ${gr} सोना जमा होता है, जिसकी क़ीमत ${v} होगी अगर भाव हर साल ${gro}% बढ़े।`,
    value: 'अंत में क़ीमत', invested: 'लगाई गई रकम', gain: 'अनुमानित मुनाफ़ा', gold: 'जमा हुआ सोना', avg: 'प्रति ग्राम औसत लागत', end: 'अंत में प्रति ग्राम भाव',
    breakdown: 'साल-दर-साल ब्योरा', year: 'साल', goldCol: 'सोना', valueCol: 'क़ीमत', investedCol: 'निवेश',
  },
} as const;

/** Monthly investment in gold at an assumed price growth, in English or Hindi. The maths is in src/lib/metals.ts. */
export function GoldSipCalculator({ lang = 'en' }: { lang?: 'en' | 'hi' }) {
  const t = T[lang];
  const [monthly, setMonthly] = useState(5_000);
  // Rough example price: replace it with today's rate.
  const [price, setPrice] = useState(10_000);
  const [growth, setGrowth] = useState(8);
  const [years, setYears] = useState(10);
  const [cost, setCost] = useState(3);
  const r = useMemo(() => goldSip({ monthly, pricePerGram: price, growth: growth / 100, years, buyCost: cost / 100 }), [monthly, price, growth, years, cost]);

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.form}>
        <NumberField label={t.monthly} value={monthly} onChange={setMonthly} min={100} max={10_000_000} sliderMax={100_000} step={100} rupee />
        <NumberField label={t.price} value={price} onChange={setPrice} min={100} max={1_000_000} sliderMax={30_000} step={10} rupee />
        <NumberField label={t.growth} value={growth} onChange={setGrowth} min={-10} max={30} step={0.5} unit="%" />
        <NumberField label={t.period} value={years} onChange={setYears} min={1} max={40} step={1} unit={t.years} />
        <NumberField label={t.cost} value={cost} onChange={setCost} min={0} max={15} step={0.1} unit="%" />
        <p class="text-xs leading-relaxed text-muted">{t.note}</p>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="goldsip-verdict">
          {t.verdict(rs(monthly), years, rs(r.invested), grams(r.grams, t.g), rs(r.value), growth)}
        </p>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.value} value={rs(r.value)} strong testid="goldsip-value" />
          <Tile label={t.invested} value={rs(r.invested)} testid="goldsip-invested" />
          <Tile label={t.gain} value={rs(r.gain)} testid="goldsip-gain" />
          <Tile label={t.gold} value={grams(r.grams, t.g)} testid="goldsip-grams" />
          <Tile label={t.avg} value={rs(r.averageCost)} />
          <Tile label={t.end} value={rs(r.finalPrice)} />
        </div>
        <MiniChart rows={r.years} labels={{ year: t.year, value: t.valueCol, invested: t.investedCol }} />
        <details class="rounded-md border border-line">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.breakdown}</summary>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-sm">
              <thead><tr class="border-y border-line text-xs text-muted">
                <th scope="col" class="px-4 py-2 text-left font-medium">{t.year}</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">{t.investedCol}</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">{t.goldCol}</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">{t.valueCol}</th>
              </tr></thead>
              <tbody>{r.years.map((y) => (
                <tr key={y.year} class="border-b border-line last:border-0">
                  <td class="px-4 py-2">{y.year}</td>
                  <td class="num px-4 py-2">{rs(y.invested)}</td>
                  <td class="num px-4 py-2">{grams(y.grams, t.g)}</td>
                  <td class="num px-4 py-2">{rs(y.value)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
