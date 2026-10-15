import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { flatEmi, loan, rateFromEmi } from '../../lib/loans.ts';
import { MiniChart } from './MiniChart.tsx';
import { NumberField } from './NumberField.tsx';
import { Choice, Tile } from './shared.tsx';

type Lang = 'en' | 'hi';
export type LoanKind = 'homeloan' | 'carloan' | 'personalloan';

const T = {
  en: {
    amount: 'Loan amount', rateType: 'Interest rate is quoted as', reducing: 'Reducing balance', flat: 'Flat rate', rate: 'Interest rate (per year)', years: 'Loan tenure', yrs: 'years',
    fee: 'Processing fee (% of loan)', more: 'Prepayment and fees', extra: 'Extra payment every month', lump: 'One-time prepayment', lumpMonth: 'Prepay in month number',
    emi: 'Monthly EMI', interest: 'Total interest', total: 'Total you pay (loan + interest + fee)', share: 'Interest as % of the loan', eff: 'Equivalent reducing-balance rate', feeAmt: 'Processing fee',
    saved: 'Interest saved by prepaying', timeSaved: 'Time saved', newTenure: 'Loan ends after', none: '—', year: 'Year', principal: 'Principal paid', interestPaid: 'Interest paid', balance: 'Balance left', byYear: 'Year-by-year breakdown',
    chart: { year: 'Year', value: 'Balance left', invested: 'Interest paid so far' }, inputs: 'Loan inputs', cannot: 'These figures cannot repay the loan: check the amount, rate and tenure.',
    dur: (m: number) => { const y = Math.floor(m / 12), r = m % 12; return [y ? `${y} year${y > 1 ? 's' : ''}` : '', r ? `${r} month${r > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ') || '0 months'; },
    verdict: (emi: string, interest: string, pct: string) => `Your EMI is ${emi} a month. Over the loan you pay ${interest} in interest, which is ${pct} of the amount you borrow.`,
  },
  hi: {
    amount: 'लोन की रकम', rateType: 'ब्याज दर बताई गई है', reducing: 'घटते बैलेंस पर', flat: 'फ़्लैट दर', rate: 'ब्याज दर (सालाना)', years: 'लोन की अवधि', yrs: 'साल',
    fee: 'प्रोसेसिंग फ़ीस (लोन का %)', more: 'प्रीपेमेंट और फ़ीस', extra: 'हर महीने अतिरिक्त भुगतान', lump: 'एकमुश्त प्रीपेमेंट', lumpMonth: 'किस महीने में प्रीपे करेंगे',
    emi: 'हर महीने की EMI', interest: 'कुल ब्याज', total: 'कुल आप देंगे (लोन + ब्याज + फ़ीस)', share: 'लोन के मुक़ाबले ब्याज (%)', eff: 'बराबर की घटते बैलेंस वाली दर', feeAmt: 'प्रोसेसिंग फ़ीस',
    saved: 'प्रीपेमेंट से बचा ब्याज', timeSaved: 'बचा समय', newTenure: 'लोन ख़त्म होगा', none: '—', year: 'साल', principal: 'चुकाया मूलधन', interestPaid: 'चुकाया ब्याज', balance: 'बाकी बैलेंस', byYear: 'साल दर साल ब्योरा',
    chart: { year: 'साल', value: 'बाकी बैलेंस', invested: 'अब तक चुकाया ब्याज' }, inputs: 'लोन की जानकारी', cannot: 'इन आँकड़ों से लोन नहीं चुक सकता: रकम, दर और अवधि जाँचें।',
    dur: (m: number) => { const y = Math.floor(m / 12), r = m % 12; return [y ? `${y} साल` : '', r ? `${r} महीने` : ''].filter(Boolean).join(' ') || '0 महीने'; },
    verdict: (emi: string, interest: string, pct: string) => `आपकी EMI ${emi} महीना है। पूरे लोन में आप ${interest} ब्याज देते हैं, जो उधार ली रकम का ${pct} है।`,
  },
} as const;

const DEFAULTS: Record<LoanKind, { amount: number; rate: number; years: number; fee: number; maxYears: number; sliderMax: number }> = {
  homeloan: { amount: 5_000_000, rate: 8.75, years: 20, fee: 0.5, maxYears: 30, sliderMax: 30_000_000 },
  carloan: { amount: 800_000, rate: 9, years: 5, fee: 1, maxYears: 10, sliderMax: 5_000_000 },
  personalloan: { amount: 300_000, rate: 14, years: 3, fee: 2, maxYears: 10, sliderMax: 3_000_000 },
};

const rs = (n: number): string => formatRupees(Math.round(n));
const pc = (f: number): string => `${(f * 100).toFixed(2)}%`;

/** EMI calculator for a home, car or personal loan, with prepayment. The maths is in src/lib/loans.ts. */
export function LoanCalculator({ kind, lang = 'en' }: { kind: LoanKind; lang?: Lang }) {
  const t = T[lang];
  const d = DEFAULTS[kind];
  const [amount, setAmount] = useState(d.amount);
  const [rateType, setRateType] = useState<'reducing' | 'flat'>('reducing');
  const [rate, setRate] = useState(d.rate);
  const [years, setYears] = useState(d.years);
  const [fee, setFee] = useState(d.fee);
  const [extra, setExtra] = useState(0);
  const [lump, setLump] = useState(0);
  const [lumpMonth, setLumpMonth] = useState(12);

  const flat = rateType === 'flat';
  const effective = useMemo(() => (flat ? rateFromEmi(amount, flatEmi(amount, rate / 100, years), years) : rate / 100), [flat, amount, rate, years]);
  const r = useMemo(
    () => (effective === null ? null : loan({ amount, rate: effective, years, extraMonthly: extra, lump, lumpMonth, feePct: fee / 100 })),
    [effective, amount, years, extra, lump, lumpMonth, fee],
  );
  const emiShown = flat ? flatEmi(amount, rate / 100, years) : r?.emi ?? 0;
  const prepaying = extra > 0 || lump > 0;
  const chart = r ? (() => { let paid = 0; return r.years.map((y) => { paid += y.interestPaid; return { year: y.year, value: y.balance, invested: paid }; }); })() : [];

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputs}>
        <NumberField label={t.amount} value={amount} onChange={setAmount} min={10_000} max={1_000_000_000} sliderMax={d.sliderMax} step={10_000} rupee />
        <Choice label={t.rateType} value={rateType} options={[['reducing', t.reducing], ['flat', t.flat]]} onChange={setRateType} testid="rate-type" />
        <NumberField label={t.rate} value={rate} onChange={setRate} min={0} max={40} step={0.05} unit="%" />
        <NumberField label={t.years} value={years} onChange={setYears} min={1} max={d.maxYears} step={1} unit={t.yrs} />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.more}</summary>
          <div class="space-y-5 p-4">
            <NumberField label={t.fee} value={fee} onChange={setFee} min={0} max={10} step={0.1} unit="%" />
            <NumberField label={t.extra} value={extra} onChange={setExtra} min={0} max={10_000_000} sliderMax={200_000} step={500} rupee />
            <NumberField label={t.lump} value={lump} onChange={setLump} min={0} max={1_000_000_000} sliderMax={d.sliderMax} step={10_000} rupee />
            <NumberField label={t.lumpMonth} value={lumpMonth} onChange={setLumpMonth} min={1} max={d.maxYears * 12} step={1} />
          </div>
        </details>
      </form>
      <div class="space-y-4" aria-live="polite">
        {r === null ? <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium">{t.cannot}</p> : (<>
          <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="loan-verdict">{t.verdict(rs(emiShown), rs(r.totalInterest), pc(r.interestShare))}</p>
          <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
            <Tile label={t.emi} value={rs(emiShown)} strong testid="loan-emi" />
            <Tile label={t.interest} value={rs(r.totalInterest)} testid="loan-interest" />
            <Tile label={t.total} value={rs(r.totalPaid)} testid="loan-total" />
            <Tile label={t.share} value={pc(r.interestShare)} />
            {flat && effective !== null && <Tile label={t.eff} value={pc(effective)} testid="loan-effrate" />}
            {fee > 0 && <Tile label={t.feeAmt} value={rs(r.processingFee)} />}
            {prepaying && <Tile label={t.saved} value={rs(r.interestSaved)} testid="loan-saved" />}
            {prepaying && <Tile label={t.timeSaved} value={t.dur(r.monthsSaved)} testid="loan-timesaved" />}
            {prepaying && <Tile label={t.newTenure} value={t.dur(r.months)} testid="loan-newtenure" />}
          </div>
          <MiniChart rows={chart} labels={t.chart} />
          <details class="rounded-md border border-line">
            <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.byYear}</summary>
            <div class="max-h-80 overflow-auto">
              <table class="w-full text-sm">
                <thead><tr class="border-y border-line text-xs text-muted">
                  <th scope="col" class="px-4 py-2 text-left font-medium">{t.year}</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">{t.principal}</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">{t.interestPaid}</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">{t.balance}</th>
                </tr></thead>
                <tbody>{r.years.map((y) => (
                  <tr key={y.year} class="border-b border-line last:border-0">
                    <td class="px-4 py-2">{y.year}</td>
                    <td class="num px-4 py-2">{rs(y.principalPaid)}</td>
                    <td class="num px-4 py-2">{rs(y.interestPaid)}</td>
                    <td class="num px-4 py-2">{rs(y.balance)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </>)}
      </div>
    </div>
  );
}
