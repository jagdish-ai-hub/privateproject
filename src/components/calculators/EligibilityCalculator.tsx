import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { loanEligibility } from '../../lib/loans.ts';
import { NumberField } from './NumberField.tsx';
import { Tile } from './shared.tsx';

const rs = (n: number): string => formatRupees(Math.round(n));

const T = {
  en: {
    form: 'Eligibility inputs', income: 'Monthly take-home income', existing: 'EMIs you already pay each month', share: 'Share of income allowed for all EMIs',
    rate: 'Interest rate (per year)', tenure: 'Loan tenure', years: 'years', down: 'Down payment you can pay',
    shareNote: 'The share of income is a common rule of thumb, not a rule every lender follows. Change it to what your lender tells you.',
    none: 'Your existing EMIs already use up the share of income allowed, so on these figures there is no room for a new loan.',
    verdict: (loan: string, emi: string, y: number) => `On these figures a lender may offer a loan of about ${loan}, with an EMI of ${emi} a month for ${y} years.`,
    loan: 'Loan you may be eligible for', emi: 'EMI for that loan', limit: 'Limit for all your EMIs together', interest: 'Total interest if you borrow it all', budget: 'Home budget (loan + down payment)',
    note: 'This is an estimate from income alone. Lenders also look at your age, credit score, the kind of income you have and the value of the property, and usually lend only part of the property price.',
  },
  hi: {
    form: 'पात्रता के इनपुट', income: 'हर महीने की हाथ में आने वाली आय', existing: 'अभी हर महीने चल रही EMI', share: 'सभी EMI के लिए आय का अनुमत हिस्सा',
    rate: 'ब्याज दर (सालाना)', tenure: 'लोन की अवधि', years: 'साल', down: 'आप कितना डाउन पेमेंट दे सकते हैं',
    shareNote: 'आय का हिस्सा एक आम अनुमान है, हर बैंक का नियम नहीं। आपका बैंक जो बताए, वही डालें।',
    none: 'आपकी मौजूदा EMI पहले ही आय का अनुमत हिस्सा ले रही हैं, इसलिए इन आँकड़ों पर नए लोन की गुंजाइश नहीं है।',
    verdict: (loan: string, emi: string, y: number) => `इन आँकड़ों पर बैंक लगभग ${loan} का लोन दे सकता है, ${y} साल के लिए ${emi} महीने की EMI पर।`,
    loan: 'आपको मिल सकने वाला लोन', emi: 'उस लोन की EMI', limit: 'सभी EMI की कुल सीमा', interest: 'पूरा लोन लेने पर कुल ब्याज', budget: 'घर का बजट (लोन + डाउन पेमेंट)',
    note: 'यह सिर्फ़ आय से अनुमान है। बैंक आपकी उम्र, क्रेडिट स्कोर, आय का प्रकार और संपत्ति का मूल्य भी देखते हैं, और आमतौर पर संपत्ति की क़ीमत का सिर्फ़ एक हिस्सा उधार देते हैं।',
  },
} as const;

/** Home loan eligibility from income, in English or Hindi. The maths is in src/lib/loans.ts. */
export function EligibilityCalculator({ lang = 'en' }: { lang?: 'en' | 'hi' }) {
  const t = T[lang];
  const [income, setIncome] = useState(100_000);
  const [existing, setExisting] = useState(0);
  const [share, setShare] = useState(50);
  const [rate, setRate] = useState(8.75);
  const [years, setYears] = useState(20);
  const [down, setDown] = useState(1_000_000);
  const r = useMemo(() => loanEligibility({ income, existingEmi: existing, emiShare: share / 100, rate: rate / 100, years }), [income, existing, share, rate, years]);
  const none = r.maxEmi <= 0;

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.form}>
        <NumberField label={t.income} value={income} onChange={setIncome} min={5_000} max={100_000_000} sliderMax={500_000} step={1_000} rupee />
        <NumberField label={t.existing} value={existing} onChange={setExisting} min={0} max={100_000_000} sliderMax={200_000} step={500} rupee />
        <NumberField label={t.share} value={share} onChange={setShare} min={10} max={80} step={1} unit="%" />
        <NumberField label={t.rate} value={rate} onChange={setRate} min={0} max={30} step={0.05} unit="%" />
        <NumberField label={t.tenure} value={years} onChange={setYears} min={1} max={30} step={1} unit={t.years} />
        <NumberField label={t.down} value={down} onChange={setDown} min={0} max={1_000_000_000} sliderMax={10_000_000} step={50_000} rupee />
        <p class="text-xs leading-relaxed text-muted">{t.shareNote}</p>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="elig-verdict">
          {none ? t.none : t.verdict(rs(r.maxLoan), rs(r.maxEmi), years)}
        </p>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.loan} value={rs(r.maxLoan)} strong testid="elig-loan" />
          <Tile label={t.emi} value={rs(r.maxEmi)} testid="elig-emi" />
          <Tile label={t.limit} value={rs(r.emiLimit)} testid="elig-limit" />
          <Tile label={t.interest} value={rs(r.totalInterest)} />
          <Tile label={t.budget} value={rs(r.maxLoan + down)} testid="elig-budget" />
        </div>
        <p class="text-xs leading-relaxed text-muted">{t.note}</p>
      </div>
    </div>
  );
}
