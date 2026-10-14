import { useState } from 'preact/hooks';
import { cagrBetween, lumpsumProjection, requiredSip, sipProjection, swpProjection } from '../../lib/calculators.ts';
import { formatPct, formatRupees } from '../../lib/format.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';

/** Which calculator to show. */
export type CalcKind = 'sip' | 'stepup' | 'lumpsum' | 'goal' | 'swp' | 'cagr';

type Lang = 'en' | 'hi';

interface Props {
  kind: CalcKind;
  lang?: Lang;
}

const T = {
  en: {
    inv: 'Invested', monthlySip: 'Monthly SIP amount', startSip: 'Starting monthly SIP', stepUp: 'Yearly step-up', ret: 'Expected return (p.a.)', period: 'Time period', years: 'years',
    invested: 'Invested amount', returns: 'Estimated returns', total: 'Total value', amountInvested: 'Amount invested', target: 'Target amount', goalTime: 'Time to reach the goal',
    sipNeeded: 'Monthly SIP needed', totalInvested: 'Total invested', corpus: 'Starting corpus', withdrawal: 'Monthly withdrawal', totalWithdrawn: 'Total withdrawn', endBalance: 'Balance at the end',
    lasts: 'Money lasts', runsOut: 'Money runs out after', fullYears: (y: number) => `the full ${y} years`, startValue: 'Starting value', endValue: 'Ending value', numYears: 'Number of years',
    absolute: 'Absolute return', multiple: 'Growth multiple', yearByYear: 'Year-by-year breakdown', year: 'Year', value: 'Value', withdrawnYear: 'Withdrawn in year', balance: 'Balance',
    inputsLabel: 'Calculator inputs', chart: { year: 'Year', value: 'Value', invested: 'Invested' },
    dur: (y: number, m: number) => [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ') || '0 months',
  },
  hi: {
    inv: 'निवेश', monthlySip: 'हर महीने की SIP राशि', startSip: 'शुरुआती मासिक SIP', stepUp: 'सालाना स्टेप-अप', ret: 'अपेक्षित रिटर्न (सालाना)', period: 'अवधि', years: 'साल',
    invested: 'निवेश की गई राशि', returns: 'अनुमानित रिटर्न', total: 'कुल मूल्य', amountInvested: 'निवेश की रकम', target: 'लक्ष्य की रकम', goalTime: 'लक्ष्य तक पहुँचने का समय',
    sipNeeded: 'ज़रूरी मासिक SIP', totalInvested: 'कुल निवेश', corpus: 'शुरुआती कोष', withdrawal: 'हर महीने की निकासी', totalWithdrawn: 'कुल निकाली गई रकम', endBalance: 'अंत में बचा बैलेंस',
    lasts: 'पैसा चलेगा', runsOut: 'पैसा ख़त्म होगा', fullYears: (y: number) => `पूरे ${y} साल`, startValue: 'शुरुआती मूल्य', endValue: 'अंतिम मूल्य', numYears: 'सालों की संख्या',
    absolute: 'कुल रिटर्न', multiple: 'कितने गुना बढ़ा', yearByYear: 'साल दर साल ब्योरा', year: 'साल', value: 'मूल्य', withdrawnYear: 'साल में निकाली रकम', balance: 'बैलेंस',
    inputsLabel: 'कैलकुलेटर की जानकारी', chart: { year: 'साल', value: 'मूल्य', invested: 'निवेश' },
    dur: (y: number, m: number) => [y ? `${y} साल` : '', m ? `${m} महीने` : ''].filter(Boolean).join(' ') || '0 महीने',
  },
} as const;

const Tile = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div class="rounded-md border border-line p-4">
    <p class="text-xs text-muted">{label}</p>
    <p class={`num mt-1 text-left ${strong ? 'text-2xl font-semibold' : 'text-lg'}`}>{value}</p>
  </div>
);


/**
 * One component for all calculators. Inputs are validated by NumberField (only in-range numbers
 * are accepted), so the maths functions never see NaN.
 */
export function Calculator({ kind, lang = 'en' }: Props) {
  const t = T[lang];
  const duration = (months: number): string => t.dur(Math.floor(months / 12), months % 12);
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
      <NumberField label={kind === 'stepup' ? t.startSip : t.monthlySip} value={monthly} onChange={setMonthly} min={500} max={1_000_000} sliderMax={100_000} step={500} rupee />
      {kind === 'stepup' && <NumberField label={t.stepUp} value={stepUp} onChange={setStepUp} min={0} max={50} step={1} unit="%" />}
      <NumberField label={t.ret} value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label={t.period} value={years} onChange={setYears} min={1} max={40} step={1} unit={t.years} />
    </>);
    results = (<>
      <Tile label={t.invested} value={formatRupees(p.invested)} />
      <Tile label={t.returns} value={formatRupees(p.gain)} />
      <Tile label={t.total} value={formatRupees(p.value)} strong />
    </>);
    chartRows = p.years;
    table = { head: [t.year, t.inv, t.value], rows: p.years.map((y) => [y.year, formatRupees(y.invested), formatRupees(y.value)]) };
  } else if (kind === 'lumpsum') {
    const p = lumpsumProjection(lump, r, years);
    inputs = (<>
      <NumberField label={t.amountInvested} value={lump} onChange={setLump} min={1000} max={100_000_000} sliderMax={5_000_000} step={1000} rupee />
      <NumberField label={t.ret} value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label={t.period} value={years} onChange={setYears} min={1} max={40} step={1} unit={t.years} />
    </>);
    results = (<>
      <Tile label={t.invested} value={formatRupees(p.invested)} />
      <Tile label={t.returns} value={formatRupees(p.gain)} />
      <Tile label={t.total} value={formatRupees(p.value)} strong />
    </>);
    chartRows = p.years;
    table = { head: [t.year, t.inv, t.value], rows: p.years.map((y) => [y.year, formatRupees(y.invested), formatRupees(y.value)]) };
  } else if (kind === 'goal') {
    const sip = requiredSip(target, r, years);
    const p = sipProjection(sip, r, years);
    inputs = (<>
      <NumberField label={t.target} value={target} onChange={setTarget} min={10_000} max={1_000_000_000} sliderMax={50_000_000} step={10_000} rupee />
      <NumberField label={t.ret} value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label={t.goalTime} value={years} onChange={setYears} min={1} max={40} step={1} unit={t.years} />
    </>);
    results = (<>
      <Tile label={t.sipNeeded} value={formatRupees(Math.ceil(sip))} strong />
      <Tile label={t.totalInvested} value={formatRupees(p.invested)} />
      <Tile label={t.returns} value={formatRupees(p.gain)} />
    </>);
    chartRows = p.years;
    table = { head: [t.year, t.inv, t.value], rows: p.years.map((y) => [y.year, formatRupees(y.invested), formatRupees(y.value)]) };
  } else if (kind === 'swp') {
    const p = swpProjection(corpus, withdrawal, r, years);
    inputs = (<>
      <NumberField label={t.corpus} value={corpus} onChange={setCorpus} min={10_000} max={1_000_000_000} sliderMax={50_000_000} step={10_000} rupee />
      <NumberField label={t.withdrawal} value={withdrawal} onChange={setWithdrawal} min={500} max={10_000_000} sliderMax={500_000} step={500} rupee />
      <NumberField label={t.ret} value={ret} onChange={setRet} min={1} max={30} step={0.5} unit="%" />
      <NumberField label={t.period} value={years} onChange={setYears} min={1} max={40} step={1} unit={t.years} />
    </>);
    results = (<>
      <Tile label={t.totalWithdrawn} value={formatRupees(p.totalWithdrawn)} />
      <Tile label={t.endBalance} value={formatRupees(p.finalBalance)} strong />
      <Tile label={p.lastedFullTerm ? t.lasts : t.runsOut} value={p.lastedFullTerm ? t.fullYears(years) : duration(p.monthsLasted)} />
    </>);
    chartRows = p.years.map((y) => ({ year: y.year, invested: corpus, value: y.balance }));
    table = { head: [t.year, t.withdrawnYear, t.balance], rows: p.years.map((y) => [y.year, formatRupees(y.withdrawn), formatRupees(y.balance)]) };
  } else {
    const c = cagrBetween(start, end, years);
    inputs = (<>
      <NumberField label={t.startValue} value={start} onChange={setStart} min={1} max={10_000_000_000} sliderMax={10_000_000} step={1000} rupee />
      <NumberField label={t.endValue} value={end} onChange={setEnd} min={0} max={10_000_000_000} sliderMax={10_000_000} step={1000} rupee />
      <NumberField label={t.numYears} value={years} onChange={setYears} min={0.1} max={60} step={0.5} unit={t.years} />
    </>);
    results = (<>
      <Tile label="CAGR" value={c === null ? '—' : formatPct(c)} strong />
      <Tile label={t.absolute} value={start > 0 ? formatPct(end / start - 1) : '—'} />
      <Tile label={t.multiple} value={start > 0 ? `${(end / start).toFixed(2)}x` : '—'} />
    </>);
  }

  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputsLabel}>{inputs}</form>
      <div class="space-y-4" aria-live="polite">
        <div class="grid gap-3 sm:grid-cols-3" data-testid="results">{results}</div>
        {chartRows.length > 1 && <MiniChart rows={chartRows} labels={t.chart} />}
        {table && (
          <details class="rounded-md border border-line">
            <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.yearByYear}</summary>
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
