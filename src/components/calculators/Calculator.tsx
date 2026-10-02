import { useState } from 'preact/hooks';
import { cagrBetween, lumpsumProjection, requiredSip, sipProjection, swpProjection } from '../../lib/calculators.ts';
import { formatPct, formatRupees } from '../../lib/format.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';

/** Which calculator to show. */
export type CalcKind = 'sip' | 'stepup' | 'lumpsum' | 'goal' | 'swp' | 'cagr';

interface Props {
  kind: CalcKind;
}

const Tile = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div class="rounded-md border border-line p-4">
    <p class="text-xs text-muted">{label}</p>
    <p class={`num mt-1 text-left ${strong ? 'text-2xl font-semibold' : 'text-lg'}`}>{value}</p>
  </div>
);

/** "20 years 3 months" from a month count. */
function duration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ') || '0 months';
}

/**
 * One component for all calculators. Inputs are validated by NumberField (only in-range numbers
 * are accepted), so the maths functions never see NaN.
 */
export function Calculator({ kind }: Props) {
  const [monthly, setMonthly] = useState(10_000);
  const [stepUp, setStepUp] = useState(10);
  const [lump, setLump] = useState(100_000);
  const [target, setTarget] = useState(5_000_000);
  const [corpus, setCorpus] = useState(5_000_000);
  const [withdrawal, setWithdrawal] = useState(30_000);
  const [ret, setRet] = useState(kind === 'swp' ? 8 : 12);
  const [years, setYears] = useState(kind === 'swp' ? 20 : 10);
  const [start, setStart] = useState(100_000);
  const [end, setEnd] = useState(250_000);
  const r = ret / 100;

  let inputs;
  let results;
  let chartRows: { year: number; invested: number; value: number }[] = [];
  let table: { head: string[]; rows: (string | number)[][] } | null = null;

  if (kind === 'sip' || kind === 'stepup') {
    const p = sipProjection(monthly, r, years, kind === 'stepup' ? stepUp / 100 : 0);
    inputs = (<>
      <NumberField label={kind === 'stepup' ? 'Starting monthly SIP' : 'Monthly SIP amount'} value={monthly} onChange={setMonthly} min={500} max={1_000_000} sliderMax={100_000} step={500} rupee />
      {kind === 'stepup' && <NumberField label="Yearly step-up" value={stepUp} onChange={setStepUp} min={0} max={50} step={1} unit="%" />}
      <NumberField label="Expected return (p.a.)" value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label="Time period" value={years} onChange={setYears} min={1} max={40} step={1} unit="years" />
    </>);
    results = (<>
      <Tile label="Invested amount" value={formatRupees(p.invested)} />
      <Tile label="Estimated returns" value={formatRupees(p.gain)} />
      <Tile label="Total value" value={formatRupees(p.value)} strong />
    </>);
    chartRows = p.years;
    table = { head: ['Year', 'Invested', 'Value'], rows: p.years.map((y) => [y.year, formatRupees(y.invested), formatRupees(y.value)]) };
  } else if (kind === 'lumpsum') {
    const p = lumpsumProjection(lump, r, years);
    inputs = (<>
      <NumberField label="Amount invested" value={lump} onChange={setLump} min={1000} max={100_000_000} sliderMax={5_000_000} step={1000} rupee />
      <NumberField label="Expected return (p.a.)" value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label="Time period" value={years} onChange={setYears} min={1} max={40} step={1} unit="years" />
    </>);
    results = (<>
      <Tile label="Invested amount" value={formatRupees(p.invested)} />
      <Tile label="Estimated returns" value={formatRupees(p.gain)} />
      <Tile label="Total value" value={formatRupees(p.value)} strong />
    </>);
    chartRows = p.years;
    table = { head: ['Year', 'Invested', 'Value'], rows: p.years.map((y) => [y.year, formatRupees(y.invested), formatRupees(y.value)]) };
  } else if (kind === 'goal') {
    const sip = requiredSip(target, r, years);
    const p = sipProjection(sip, r, years);
    inputs = (<>
      <NumberField label="Target amount" value={target} onChange={setTarget} min={10_000} max={1_000_000_000} sliderMax={50_000_000} step={10_000} rupee />
      <NumberField label="Expected return (p.a.)" value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label="Time to reach the goal" value={years} onChange={setYears} min={1} max={40} step={1} unit="years" />
    </>);
    results = (<>
      <Tile label="Monthly SIP needed" value={formatRupees(Math.ceil(sip))} strong />
      <Tile label="Total invested" value={formatRupees(p.invested)} />
      <Tile label="Estimated returns" value={formatRupees(p.gain)} />
    </>);
    chartRows = p.years;
    table = { head: ['Year', 'Invested', 'Value'], rows: p.years.map((y) => [y.year, formatRupees(y.invested), formatRupees(y.value)]) };
  } else if (kind === 'swp') {
    const p = swpProjection(corpus, withdrawal, r, years);
    inputs = (<>
      <NumberField label="Starting corpus" value={corpus} onChange={setCorpus} min={10_000} max={1_000_000_000} sliderMax={50_000_000} step={10_000} rupee />
      <NumberField label="Monthly withdrawal" value={withdrawal} onChange={setWithdrawal} min={500} max={10_000_000} sliderMax={500_000} step={500} rupee />
      <NumberField label="Expected return (p.a.)" value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label="Time period" value={years} onChange={setYears} min={1} max={40} step={1} unit="years" />
    </>);
    results = (<>
      <Tile label="Total withdrawn" value={formatRupees(p.totalWithdrawn)} />
      <Tile label="Balance at the end" value={formatRupees(p.finalBalance)} strong />
      <Tile label={p.lastedFullTerm ? 'Money lasts' : 'Money runs out after'} value={p.lastedFullTerm ? `the full ${years} years` : duration(p.monthsLasted)} />
    </>);
    chartRows = p.years.map((y) => ({ year: y.year, invested: corpus, value: y.balance }));
    table = { head: ['Year', 'Withdrawn in year', 'Balance'], rows: p.years.map((y) => [y.year, formatRupees(y.withdrawn), formatRupees(y.balance)]) };
  } else {
    const c = cagrBetween(start, end, years);
    inputs = (<>
      <NumberField label="Starting value" value={start} onChange={setStart} min={1} max={10_000_000_000} sliderMax={10_000_000} step={1000} rupee />
      <NumberField label="Ending value" value={end} onChange={setEnd} min={0} max={10_000_000_000} sliderMax={10_000_000} step={1000} rupee />
      <NumberField label="Number of years" value={years} onChange={setYears} min={0.1} max={60} step={0.5} unit="years" />
    </>);
    results = (<>
      <Tile label="CAGR" value={c === null ? '—' : formatPct(c)} strong />
      <Tile label="Absolute return" value={start > 0 ? formatPct(end / start - 1) : '—'} />
      <Tile label="Growth multiple" value={start > 0 ? `${(end / start).toFixed(2)}x` : '—'} />
    </>);
  }

  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label="Calculator inputs">{inputs}</form>
      <div class="space-y-4" aria-live="polite">
        <div class="grid gap-3 sm:grid-cols-3" data-testid="results">{results}</div>
        {chartRows.length > 1 && <MiniChart rows={chartRows} />}
        {table && (
          <details class="rounded-md border border-line">
            <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">Year-by-year breakdown</summary>
            <div class="max-h-80 overflow-auto">
              <table class="w-full text-sm">
                <thead><tr class="border-y border-line text-xs text-muted">{table.head.map((h, i) => <th key={h} scope="col" class={`px-4 py-2 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr></thead>
                <tbody>{table.rows.map((row) => <tr key={row[0]} class="border-b border-line last:border-0">{row.map((c, i) => <td key={i} class={`px-4 py-2 ${i === 0 ? '' : 'num'}`}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
