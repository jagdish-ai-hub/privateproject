import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { loanEligibility } from '../../lib/loans.ts';
import { NumberField } from './NumberField.tsx';
import { Tile } from './shared.tsx';

const rs = (n: number): string => formatRupees(Math.round(n));

/** Home loan eligibility from income. English only. The maths is in src/lib/loans.ts. */
export function EligibilityCalculator() {
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
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label="Eligibility inputs">
        <NumberField label="Monthly take-home income" value={income} onChange={setIncome} min={5_000} max={100_000_000} sliderMax={500_000} step={1_000} rupee />
        <NumberField label="EMIs you already pay each month" value={existing} onChange={setExisting} min={0} max={100_000_000} sliderMax={200_000} step={500} rupee />
        <NumberField label="Share of income allowed for all EMIs" value={share} onChange={setShare} min={10} max={80} step={1} unit="%" />
        <NumberField label="Interest rate (per year)" value={rate} onChange={setRate} min={0} max={30} step={0.05} unit="%" />
        <NumberField label="Loan tenure" value={years} onChange={setYears} min={1} max={30} step={1} unit="years" />
        <NumberField label="Down payment you can pay" value={down} onChange={setDown} min={0} max={1_000_000_000} sliderMax={10_000_000} step={50_000} rupee />
        <p class="text-xs leading-relaxed text-muted">The share of income is a common rule of thumb, not a rule every lender follows. Change it to what your lender tells you.</p>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="elig-verdict">
          {none
            ? 'Your existing EMIs already use up the share of income allowed, so on these figures there is no room for a new loan.'
            : `On these figures a lender may offer a loan of about ${rs(r.maxLoan)}, with an EMI of ${rs(r.maxEmi)} a month for ${years} years.`}
        </p>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label="Loan you may be eligible for" value={rs(r.maxLoan)} strong testid="elig-loan" />
          <Tile label="EMI for that loan" value={rs(r.maxEmi)} testid="elig-emi" />
          <Tile label="Limit for all your EMIs together" value={rs(r.emiLimit)} testid="elig-limit" />
          <Tile label="Total interest if you borrow it all" value={rs(r.totalInterest)} />
          <Tile label="Home budget (loan + down payment)" value={rs(r.maxLoan + down)} testid="elig-budget" />
        </div>
        <p class="text-xs leading-relaxed text-muted">This is an estimate from income alone. Lenders also look at your age, credit score, the kind of income you have and the value of the property, and usually lend only part of the property price.</p>
      </div>
    </div>
  );
}
