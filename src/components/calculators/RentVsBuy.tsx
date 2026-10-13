import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { RENT_VS_BUY_DEFAULTS as D, breakEvenRent, rentVsBuy } from '../../lib/rentVsBuy.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';

const Tile = ({ label, value, strong, testid }: { label: string; value: string; strong?: boolean; testid?: string }) => (
  <div class="rounded-md border border-line p-4">
    <p class="text-xs text-muted">{label}</p>
    <p class={`num mt-1 text-left ${strong ? 'text-2xl font-semibold' : 'text-lg'}`} data-testid={testid}>{value}</p>
  </div>
);

const pct = (f: number): number => Math.round(f * 10_000) / 100;

/**
 * Rent vs buy. The maths is in src/lib/rentVsBuy.ts (unit tested); this component collects the
 * assumptions, which all start at the defaults there, and shows the outcome. Percent inputs are
 * shown as percentages and converted to fractions here.
 */
export function RentVsBuy() {
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
  const verdict = r.winner === 'tie'
    ? `Over ${horizon} years, buying and renting end up level with these assumptions.`
    : r.winner === 'buy'
      ? `Over ${horizon} years, buying leaves you ${abs} ahead of renting and investing the difference.`
      : `Over ${horizon} years, renting and investing the difference leaves you ${abs} ahead of buying.`;
  const chartRows = r.years.map((y) => ({ year: y.year, value: Math.max(0, y.buyer), invested: Math.max(0, y.renter) }));

  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label="Rent vs buy inputs">
        <NumberField label="Home price" value={price} onChange={setPrice} min={100_000} max={1_000_000_000} sliderMax={50_000_000} step={100_000} rupee />
        <NumberField label="Down payment" value={down} onChange={setDown} min={0} max={100} step={1} unit="%" />
        <NumberField label="Rent for a similar home (per month)" value={rent} onChange={setRent} min={0} max={5_000_000} sliderMax={200_000} step={500} rupee />
        <NumberField label="Years before you would sell" value={horizon} onChange={setHorizon} min={1} max={40} step={1} unit="years" />
        <NumberField label="Home loan interest rate" value={loanRate} onChange={setLoanRate} min={0} max={20} step={0.05} unit="%" />
        <NumberField label="Loan tenure" value={loanYears} onChange={setLoanYears} min={1} max={30} step={1} unit="years" />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">More assumptions</summary>
          <div class="space-y-5 p-4">
            <NumberField label="Rent increase (per year)" value={rentGrowth} onChange={setRentGrowth} min={0} max={20} step={0.5} unit="%" />
            <NumberField label="Home price growth (per year)" value={appreciation} onChange={setAppreciation} min={-10} max={20} step={0.5} unit="%" />
            <NumberField label="Return on investments (per year)" value={invest} onChange={setInvest} min={0} max={30} step={0.5} unit="%" />
            <NumberField label="Stamp duty and registration" value={stamp} onChange={setStamp} min={0} max={15} step={0.5} unit="%" />
            <NumberField label="Maintenance and property tax (per year, % of home value)" value={holding} onChange={setHolding} min={0} max={5} step={0.1} unit="%" />
            <NumberField label="Cost of selling" value={selling} onChange={setSelling} min={0} max={10} step={0.5} unit="%" />
            <NumberField label="Tax on gains (home and investments)" value={tax} onChange={setTax} min={0} max={40} step={0.5} unit="%" />
          </div>
        </details>
      </form>

      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="rvb-verdict">{verdict}</p>
        <div class="grid gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={`If you buy: what you own after ${horizon} years`} value={formatRupees(r.buyerNetWorth)} strong testid="rvb-buyer" />
          <Tile label={`If you rent: what you own after ${horizon} years`} value={formatRupees(r.renterNetWorth)} strong testid="rvb-renter" />
          <Tile label="Monthly EMI" value={formatRupees(Math.round(r.emi))} />
          <Tile label="Cash needed on day one" value={formatRupees(Math.round(r.upfront))} />
          <Tile label="Yearly rent as % of price" value={`${(r.grossYield * 100).toFixed(2)}%`} />
          <Tile label="Rent at which buying breaks even" value={be === null ? 'Not reached' : `${formatRupees(Math.round(be))} a month`} testid="rvb-breakeven" />
        </div>
        <p class="text-sm text-muted" data-testid="rvb-note">
          {r.breakEvenYear === null
            ? `Buying does not catch up with renting within ${horizon} years.`
            : `Buying is ahead from year ${r.breakEvenYear} onwards.`}
          {' '}Home price after {horizon} years: {formatRupees(Math.round(r.finalPropertyValue))}; loan still owed then: {formatRupees(Math.round(r.loanOutstanding))}.
        </p>
        <MiniChart rows={chartRows} labels={{ year: 'Year', value: 'If you buy', invested: 'If you rent' }} />
        <details class="rounded-md border border-line">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">Year-by-year breakdown</summary>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-sm">
              <thead><tr class="border-y border-line text-xs text-muted">
                <th scope="col" class="px-4 py-2 text-left font-medium">Year</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">If you buy</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">If you rent</th>
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
