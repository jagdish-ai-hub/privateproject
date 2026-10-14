import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { deposit, inflation } from '../../lib/loans.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';
import { Choice, Tile } from './shared.tsx';

type Lang = 'en' | 'hi';
export type DepositKind = 'fd' | 'inflation';

const T = {
  en: {
    amount: 'Amount', rate: 'Interest rate (per year)', years: 'Time', yrs: 'years', comp: 'Interest is added', monthly: 'Monthly', quarterly: 'Quarterly', half: 'Half-yearly', yearly: 'Yearly',
    tax: 'Tax rate on the interest', infl: 'Inflation (per year)', more: 'Tax and inflation', maturity: 'Maturity amount', interest: 'Interest earned', taxAmt: 'Tax on the interest', after: 'Maturity amount after tax',
    eff: 'Yearly yield with compounding', afterRate: 'Yearly return after tax', real: 'Yearly return after tax and inflation', todays: 'Maturity amount (after tax) in today’s money', year: 'Year', value: 'Value', byYear: 'Year-by-year breakdown',
    chart: { year: 'Year', value: 'Value', invested: 'Deposited' }, inputs: 'Deposit inputs',
    fdVerdict: (real: string) => (real.startsWith('-') ? `After tax and inflation your money loses buying power: the real return is ${real} a year.` : `After tax and inflation your money grows its buying power by ${real} a year.`),
    inflAmount: 'Amount today', inflRate: 'Inflation (per year)', inflYears: 'Number of years', future: 'The same things will cost', power: 'The same amount will buy what this buys today', lost: 'Buying power lost',
    inflVerdict: (amount: string, years: number, cost: string, power: string) => `What costs ${amount} today will cost about ${cost} in ${years} years. And ${amount} then will only buy what ${power} buys today.`,
  },
  hi: {
    amount: 'रकम', rate: 'ब्याज दर (सालाना)', years: 'अवधि', yrs: 'साल', comp: 'ब्याज जुड़ता है', monthly: 'हर महीने', quarterly: 'हर तिमाही', half: 'हर छह महीने', yearly: 'हर साल',
    tax: 'ब्याज पर टैक्स दर', infl: 'महँगाई (सालाना)', more: 'टैक्स और महँगाई', maturity: 'परिपक्वता की रकम', interest: 'कमाया ब्याज', taxAmt: 'ब्याज पर टैक्स', after: 'टैक्स के बाद परिपक्वता की रकम',
    eff: 'चक्रवृद्धि के साथ सालाना यील्ड', afterRate: 'टैक्स के बाद सालाना रिटर्न', real: 'टैक्स और महँगाई के बाद सालाना रिटर्न', todays: 'टैक्स के बाद परिपक्वता की रकम, आज के पैसों में', year: 'साल', value: 'मूल्य', byYear: 'साल दर साल ब्योरा',
    chart: { year: 'साल', value: 'मूल्य', invested: 'जमा' }, inputs: 'जमा की जानकारी',
    fdVerdict: (real: string) => (real.startsWith('-') ? `टैक्स और महँगाई के बाद आपके पैसे की क्रय शक्ति घटती है: असल रिटर्न ${real} सालाना है।` : `टैक्स और महँगाई के बाद आपके पैसे की क्रय शक्ति सालाना ${real} बढ़ती है।`),
    inflAmount: 'आज की रकम', inflRate: 'महँगाई (सालाना)', inflYears: 'सालों की संख्या', future: 'वही चीज़ें इतने की होंगी', power: 'उतनी ही रकम से वह मिलेगा जो आज इतने में मिलता है', lost: 'घटी क्रय शक्ति',
    inflVerdict: (amount: string, years: number, cost: string, power: string) => `जो चीज़ आज ${amount} की है, वह ${years} साल बाद लगभग ${cost} की होगी। और तब के ${amount} से सिर्फ़ वही मिलेगा जो आज ${power} में मिलता है।`,
  },
} as const;

const rs = (n: number): string => formatRupees(Math.round(n));
const pc = (f: number): string => `${(f * 100).toFixed(2)}%`;

/** Fixed deposit return after tax and inflation, and the inflation calculator. The maths is in src/lib/loans.ts. */
export function DepositCalculator({ kind, lang = 'en' }: { kind: DepositKind; lang?: Lang }) {
  const t = T[lang];
  const [amount, setAmount] = useState(kind === 'fd' ? 100_000 : 100_000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(kind === 'fd' ? 5 : 10);
  const [perYear, setPerYear] = useState<1 | 2 | 4 | 12>(4);
  const [tax, setTax] = useState(30);
  const [infl, setInfl] = useState(kind === 'fd' ? 5 : 6);

  const fd = useMemo(() => deposit({ amount, rate: rate / 100, years, perYear, taxRate: tax / 100, inflation: infl / 100 }), [amount, rate, years, perYear, tax, infl]);
  const inf = useMemo(() => inflation(amount, infl / 100, years), [amount, infl, years]);

  if (kind === 'inflation') {
    return (
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputs}>
          <NumberField label={t.inflAmount} value={amount} onChange={setAmount} min={1} max={1_000_000_000} sliderMax={5_000_000} step={1000} rupee />
          <NumberField label={t.inflRate} value={infl} onChange={setInfl} min={0} max={30} step={0.5} unit="%" />
          <NumberField label={t.inflYears} value={years} onChange={setYears} min={1} max={60} step={1} unit={t.yrs} />
        </form>
        <div class="space-y-4" aria-live="polite">
          <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="infl-verdict">{t.inflVerdict(rs(amount), years, rs(inf.futureCost), rs(inf.buyingPower))}</p>
          <div class="grid gap-3 sm:grid-cols-3" data-testid="results">
            <Tile label={t.future} value={rs(inf.futureCost)} strong testid="infl-future" />
            <Tile label={t.power} value={rs(inf.buyingPower)} testid="infl-power" />
            <Tile label={t.lost} value={pc(inf.lostShare)} testid="infl-lost" />
          </div>
        </div>
      </div>
    );
  }

  const chart = fd.years.map((y) => ({ year: y.year, value: y.value, invested: amount }));
  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputs}>
        <NumberField label={t.amount} value={amount} onChange={setAmount} min={1000} max={1_000_000_000} sliderMax={5_000_000} step={1000} rupee />
        <NumberField label={t.rate} value={rate} onChange={setRate} min={0} max={20} step={0.05} unit="%" />
        <NumberField label={t.years} value={years} onChange={setYears} min={1} max={30} step={1} unit={t.yrs} />
        <Choice label={t.comp} value={perYear} options={[[12, t.monthly], [4, t.quarterly], [2, t.half], [1, t.yearly]]} onChange={setPerYear} testid="compounding" />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.more}</summary>
          <div class="space-y-5 p-4">
            <NumberField label={t.tax} value={tax} onChange={setTax} min={0} max={50} step={1} unit="%" />
            <NumberField label={t.infl} value={infl} onChange={setInfl} min={0} max={30} step={0.5} unit="%" />
          </div>
        </details>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="fd-verdict">{t.fdVerdict(pc(fd.realRate))}</p>
        <div class="grid gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.maturity} value={rs(fd.maturity)} strong testid="fd-maturity" />
          <Tile label={t.interest} value={rs(fd.interest)} testid="fd-interest" />
          <Tile label={t.taxAmt} value={rs(fd.tax)} testid="fd-tax" />
          <Tile label={t.after} value={rs(fd.maturityAfterTax)} testid="fd-after" />
          <Tile label={t.eff} value={pc(fd.effectiveRate)} testid="fd-eff" />
          <Tile label={t.afterRate} value={pc(fd.afterTaxRate)} testid="fd-afterrate" />
          <Tile label={t.real} value={pc(fd.realRate)} testid="fd-real" />
          <Tile label={t.todays} value={rs(fd.maturityInTodaysMoney)} testid="fd-todays" />
        </div>
        <MiniChart rows={chart} labels={t.chart} />
        <details class="rounded-md border border-line">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.byYear}</summary>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-sm">
              <thead><tr class="border-y border-line text-xs text-muted">
                <th scope="col" class="px-4 py-2 text-left font-medium">{t.year}</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">{t.value}</th>
              </tr></thead>
              <tbody>{fd.years.map((y) => (<tr key={y.year} class="border-b border-line last:border-0"><td class="px-4 py-2">{y.year}</td><td class="num px-4 py-2">{rs(y.value)}</td></tr>))}</tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
