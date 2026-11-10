import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { goldSip } from '../../lib/metals.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';
import { Tile } from './shared.tsx';

const rs = (n: number): string => formatRupees(Math.round(n));
const grams = (n: number): string => `${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;

/** Monthly investment in gold at an assumed price growth. English only. The maths is in src/lib/metals.ts. */
export function GoldSipCalculator() {
  const [monthly, setMonthly] = useState(5_000);
  // Rough example price: replace it with today's rate.
  const [price, setPrice] = useState(10_000);
  const [growth, setGrowth] = useState(8);
  const [years, setYears] = useState(10);
  const [cost, setCost] = useState(3);
  const r = useMemo(() => goldSip({ monthly, pricePerGram: price, growth: growth / 100, years, buyCost: cost / 100 }), [monthly, price, growth, years, cost]);

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label="Gold SIP inputs">
        <NumberField label="Amount invested every month" value={monthly} onChange={setMonthly} min={100} max={10_000_000} sliderMax={100_000} step={100} rupee />
        <NumberField label="Gold price per gram today" value={price} onChange={setPrice} min={100} max={1_000_000} sliderMax={30_000} step={10} rupee />
        <NumberField label="Assumed rise in the gold price (per year)" value={growth} onChange={setGrowth} min={-10} max={30} step={0.5} unit="%" />
        <NumberField label="Time period" value={years} onChange={setYears} min={1} max={40} step={1} unit="years" />
        <NumberField label="Cost on every purchase (GST, spread)" value={cost} onChange={setCost} min={0} max={15} step={0.1} unit="%" />
        <p class="text-xs leading-relaxed text-muted">The gold price shown at first is an example, not today’s rate. The yearly rise is an assumption: gold has had long stretches of falling and flat prices.</p>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="goldsip-verdict">
          {rs(monthly)} a month for {years} years puts in {rs(r.invested)} and collects about {grams(r.grams)} of gold, worth {rs(r.value)} if the price rises {growth}% a year.
        </p>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label="Value at the end" value={rs(r.value)} strong testid="goldsip-value" />
          <Tile label="Amount invested" value={rs(r.invested)} testid="goldsip-invested" />
          <Tile label="Estimated gain" value={rs(r.gain)} testid="goldsip-gain" />
          <Tile label="Gold collected" value={grams(r.grams)} testid="goldsip-grams" />
          <Tile label="Average cost per gram" value={rs(r.averageCost)} />
          <Tile label="Price per gram at the end" value={rs(r.finalPrice)} />
        </div>
        <MiniChart rows={r.years} />
        <details class="rounded-md border border-line">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">Year-by-year breakdown</summary>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-sm">
              <thead><tr class="border-y border-line text-xs text-muted">
                <th scope="col" class="px-4 py-2 text-left font-medium">Year</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">Invested</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">Gold</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">Value</th>
              </tr></thead>
              <tbody>{r.years.map((y) => (
                <tr key={y.year} class="border-b border-line last:border-0">
                  <td class="px-4 py-2">{y.year}</td>
                  <td class="num px-4 py-2">{rs(y.invested)}</td>
                  <td class="num px-4 py-2">{grams(y.grams)}</td>
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
