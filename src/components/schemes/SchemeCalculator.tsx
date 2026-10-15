import { useState } from 'preact/hooks';
import { kvp, LIMITS, mis, nsc, ppf, rd, scss, ssy, timeDeposit, type BuildUp, type DepositTiming } from '../../lib/schemes.ts';
import type { SchemeKind } from '../../lib/schemeContent.ts';
import { formatRupees } from '../../lib/format.ts';
import { MiniChart } from '../calculators/MiniChart.tsx';
import { NumberField } from '../calculators/NumberField.tsx';

/** Notified rates (percent), passed from the page so the island and the page text use the same data. */
export interface SchemeRates {
  ppf: number; ssy: number; scss: number; nsc: number; kvp: number; mis: number; rd5: number;
  td1: number; td2: number; td3: number; td5: number;
}

interface Props {
  kind: SchemeKind;
  rates: SchemeRates;
  kvpMonths: number;
  lang?: 'en' | 'hi';
}

const T = {
  en: {
    yearly: 'Deposit per year', monthly: 'Deposit per month', amount: 'Amount', years: 'Years of deposits', rate: 'Interest rate (p.a.)',
    girlAge: 'Girl’s age when opening', timing: 'When you deposit', byApril: 'Once a year, by 5 April', everyMonth: 'Every month, by the 5th',
    single: 'Single account', joint: 'Joint account', term: 'Term',
    invested: 'Total deposited', interest: 'Interest earned', maturity: 'Maturity value', perMonth: 'Monthly income', perQuarter: 'Interest every quarter',
    perYear: 'Interest every year', totalInterest: 'Total interest', returned: 'Deposit returned at maturity', doubles: 'Doubles in',
    months: 'months', yr: 'year', yrs: 'years', maturesAt: 'Matures when she is', yearCol: 'Year', depositCol: 'Deposit', interestCol: 'Interest', balanceCol: 'Balance',
    tableCaption: 'Year-by-year growth', notified: 'notified', chartInvested: 'Deposited', chartValue: 'Balance',
  },
  hi: {
    yearly: 'हर साल जमा', monthly: 'हर महीने जमा', amount: 'राशि', years: 'जमा के साल', rate: 'ब्याज दर (सालाना)',
    girlAge: 'खाता खोलते समय बेटी की उम्र', timing: 'आप कब जमा करते हैं', byApril: 'साल में एक बार, 5 अप्रैल तक', everyMonth: 'हर महीने, 5 तारीख तक',
    single: 'सिंगल खाता', joint: 'जॉइंट खाता', term: 'अवधि',
    invested: 'कुल जमा', interest: 'कमाया गया ब्याज', maturity: 'मैच्योरिटी राशि', perMonth: 'हर महीने की आय', perQuarter: 'हर तिमाही ब्याज',
    perYear: 'हर साल ब्याज', totalInterest: 'कुल ब्याज', returned: 'मैच्योरिटी पर जमा राशि वापस', doubles: 'दोगुना होने में',
    months: 'महीने', yr: 'साल', yrs: 'साल', maturesAt: 'मैच्योरिटी पर बेटी की उम्र', yearCol: 'साल', depositCol: 'जमा', interestCol: 'ब्याज', balanceCol: 'बैलेंस',
    tableCaption: 'साल-दर-साल बढ़त', notified: 'अधिसूचित', chartInvested: 'जमा', chartValue: 'बैलेंस',
  },
} as const;

const money = (v: number): string => formatRupees(v, v < 10_000 && Math.abs(v - Math.round(v)) > 0.004 ? 2 : 0);

const Tile = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div class="rounded-md border border-line p-4">
    <p class="text-xs text-muted">{label}</p>
    <p class={`num mt-1 whitespace-normal break-words text-left ${strong ? 'text-2xl font-semibold' : 'text-lg'}`} data-testid={strong ? 'scheme-result' : undefined}>{value}</p>
  </div>
);

/** Two-option toggle used for deposit timing, account type and term. */
function Choice<V extends string | number>({ label, value, options, onChange }: { label: string; value: V; options: [V, string][]; onChange: (v: V) => void }) {
  return (
    <fieldset>
      <legend class="text-sm">{label}</legend>
      <div class="mt-2 flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            class={`h-9 rounded-md border px-3 text-sm ${value === v ? 'border-fg bg-subtle font-medium' : 'border-line text-muted hover:bg-subtle'}`}
          >{text}</button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Calculator for one Government savings scheme. The maths lives in src/lib/schemes.ts and is unit
 * tested against published figures; this component only collects inputs and shows results.
 * The rate starts at the notified rate and can be changed to model a future rate change.
 */
export function SchemeCalculator({ kind, rates, kvpMonths, lang = 'en' }: Props) {
  const t = T[lang];
  const defaults: Record<SchemeKind, number> = { ppf: 150_000, ssy: 150_000, scss: 1_500_000, nsc: 100_000, kvp: 100_000, mis: 900_000, rd: 5_000, td: 100_000 };
  const [amount, setAmount] = useState(defaults[kind]);
  const [years, setYears] = useState(15);
  const [timing, setTiming] = useState<DepositTiming>('yearly-start');
  const [age, setAge] = useState(2);
  const [joint, setJoint] = useState(false);
  const [tdYears, setTdYears] = useState<1 | 2 | 3 | 5>(5);
  const notified = kind === 'rd' ? rates.rd5 : kind === 'td' ? rates[`td${tdYears}` as 'td5'] : rates[kind];
  const [rateOverride, setRateOverride] = useState<number | null>(null);
  const rate = rateOverride ?? notified;
  const r = rate / 100;

  let inputs = null;
  let tiles = null;
  let build: BuildUp | null = null;
  const rateField = kind === 'kvp' ? null : (
    <NumberField label={`${t.rate} · ${t.notified} ${notified}%`} value={rate} onChange={setRateOverride} min={1} max={15} step={0.1} unit="%" />
  );

  if (kind === 'ppf' || kind === 'ssy') {
    const lim = LIMITS[kind];
    inputs = (<>
      <NumberField label={t.yearly} value={amount} onChange={setAmount} min={lim.min} max={lim.max} step={500} rupee />
      {kind === 'ppf'
        ? <NumberField label={t.years} value={years} onChange={setYears} min={15} max={50} step={5} unit={t.yrs} />
        : <NumberField label={t.girlAge} value={age} onChange={setAge} min={0} max={10} step={1} unit={t.yrs} />}
      <Choice label={t.timing} value={timing} options={[['yearly-start', t.byApril], ['monthly', t.everyMonth]]} onChange={setTiming} />
      {rateField}
    </>);
    build = kind === 'ppf' ? ppf(amount, r, years, timing) : ssy(amount, r, timing);
    tiles = (<>
      <Tile label={t.invested} value={money(build.invested)} />
      <Tile label={t.interest} value={money(build.interest)} />
      <Tile label={t.maturity} value={money(build.maturity)} strong />
      {kind === 'ssy' && <Tile label={t.maturesAt} value={`${age + 21} ${t.yrs}`} />}
    </>);
  } else if (kind === 'nsc' || kind === 'rd') {
    inputs = (<>
      {kind === 'nsc'
        ? <NumberField label={t.amount} value={amount} onChange={setAmount} min={LIMITS.nsc.min} max={10_000_000} sliderMax={1_000_000} step={1_000} rupee />
        : <NumberField label={t.monthly} value={amount} onChange={setAmount} min={LIMITS.rd.min} max={1_000_000} sliderMax={50_000} step={10} rupee />}
      {rateField}
    </>);
    build = kind === 'nsc' ? nsc(amount, r) : rd(amount, r);
    tiles = (<>
      <Tile label={t.invested} value={money(build.invested)} />
      <Tile label={t.interest} value={money(build.interest)} />
      <Tile label={t.maturity} value={money(build.maturity)} strong />
    </>);
  } else if (kind === 'kvp') {
    const x = kvp(amount, kvpMonths);
    inputs = <NumberField label={t.amount} value={amount} onChange={setAmount} min={LIMITS.kvp.min} max={10_000_000} sliderMax={1_000_000} step={1_000} rupee />;
    tiles = (<>
      <Tile label={t.invested} value={money(x.invested)} />
      <Tile label={t.doubles} value={`${x.months} ${t.months}`} />
      <Tile label={t.maturity} value={money(x.maturity)} strong />
    </>);
  } else {
    const max = kind === 'scss' ? LIMITS.scss.max : kind === 'mis' ? (joint ? LIMITS.mis.maxJoint : LIMITS.mis.maxSingle) : 10_000_000;
    const step = kind === 'scss' ? 1_000 : 1_000;
    const x = kind === 'scss' ? scss(amount, r) : kind === 'mis' ? mis(Math.min(amount, max), r) : timeDeposit(amount, r, tdYears);
    const label = kind === 'scss' ? t.perQuarter : kind === 'mis' ? t.perMonth : t.perYear;
    inputs = (<>
      {kind === 'mis' && <Choice label={t.term} value={joint ? 'j' : 's'} options={[['s', t.single], ['j', t.joint]]} onChange={(v) => { setJoint(v === 'j'); if (v === 's') setAmount((a) => Math.min(a, LIMITS.mis.maxSingle)); }} />}
      {kind === 'td' && <Choice label={t.term} value={tdYears} options={[[1, `1 ${t.yr}`], [2, `2 ${t.yrs}`], [3, `3 ${t.yrs}`], [5, `5 ${t.yrs}`]]} onChange={(v) => { setTdYears(v); setRateOverride(null); }} />}
      <NumberField label={t.amount} value={Math.min(amount, max)} onChange={setAmount} min={kind === 'scss' ? LIMITS.scss.min : 1_000} max={max} sliderMax={Math.min(max, 2_000_000)} step={step} rupee />
      {rateField}
    </>);
    tiles = (<>
      <Tile label={label} value={money(x.perPeriod)} strong />
      <Tile label={t.totalInterest} value={money(x.totalInterest)} />
      <Tile label={t.returned} value={money(x.invested)} />
    </>);
  }

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" data-testid="scheme-calculator">
      <div class="space-y-5 rounded-md border border-line p-4">{inputs}</div>
      <div class="space-y-4">
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">{tiles}</div>
        {build && (
          <>
            <MiniChart rows={build.rows.map((row, i) => ({ year: row.year, invested: build!.rows.slice(0, i + 1).reduce((s, x) => s + x.deposit, 0), value: row.balance }))} labels={{ year: t.yearCol, value: t.chartValue, invested: t.chartInvested }} />
            <div class="max-h-80 overflow-auto rounded-md border border-line">
              <table class="w-full text-sm">
                <caption class="sr-only">{t.tableCaption}</caption>
                <thead class="sticky top-0 bg-bg"><tr class="border-b border-line text-xs text-muted">
                  <th scope="col" class="px-3 py-2 text-left font-medium">{t.yearCol}</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">{t.depositCol}</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">{t.interestCol}</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">{t.balanceCol}</th>
                </tr></thead>
                <tbody>
                  {build.rows.map((row) => (
                    <tr key={row.year} class="border-b border-line last:border-0">
                      <td class="px-3 py-1.5">{row.year}</td>
                      <td class="num px-3 py-1.5">{money(row.deposit)}</td>
                      <td class="num px-3 py-1.5">{money(row.interest)}</td>
                      <td class="num px-3 py-1.5">{money(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
