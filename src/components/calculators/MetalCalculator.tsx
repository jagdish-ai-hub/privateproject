import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { PURITIES, jewelleryPrice, metalReturn, type Metal } from '../../lib/metals.ts';
import { NumberField } from './NumberField.tsx';
import { Choice, Tile } from './shared.tsx';

type Lang = 'en' | 'hi';
export type MetalKind = 'jewellery' | 'return';

const T = {
  en: {
    metal: 'Metal', gold: 'Gold', silver: 'Silver',
    rate: (m: Metal) => (m === 'gold' ? 'Today’s price of 24 carat gold (₹ per gram)' : 'Today’s price of 999 silver (₹ per gram)'),
    rateHint: 'Enter the rate from your jeweller or a trusted rate board: it changes through the day and differs by city.',
    weight: 'Weight (grams)', purity: 'Purity', makingType: 'Making charges as', percent: '% of metal value', perGram: '₹ per gram', makingPct: 'Making charges (%)', makingGram: 'Making charges (₹ per gram)',
    gst: 'GST (%)', buyback: 'Deduction when the jeweller buys it back (%)',
    metalValue: 'Value of the metal', making: 'Making charges', gstAmt: 'GST', total: 'Total you pay', sellBack: 'Worth if you sell it back',
    lost: 'Paid but not recovered on selling', breakEven: 'Price must rise by', premium: 'Paid above the metal value', moreAssumptions: 'Making charges, GST and buy-back',
    amount: 'Amount to invest', buy: (m: Metal) => `Price per gram when you buy (${m === 'gold' ? 'gold' : 'silver'})`, sell: 'Price per gram when you sell', years: 'Years you hold it',
    buyCost: 'Costs when buying (GST, making charges, brokerage) (%)', sellCost: 'Costs when selling (buy-back deduction, brokerage) (%)', holding: 'Holding cost per year (locker, fund expenses) (%)',
    grams: 'Grams you get', finalValue: 'Money in hand at the end', gain: 'Gain or loss', priceCagr: 'Price growth per year', netCagr: 'Your return per year after costs', breakEvenPrice: 'Price per gram needed to get your money back',
    yrs: 'years', g: 'g', none: '—', inputs: 'Gold and silver inputs', costsH: 'Costs',
    verdictJ: (premium: string, rise: string) => `You pay ${premium} more than the metal is worth. The price per gram must rise about ${rise} before selling it back returns what you paid.`,
    verdictRGain: (net: string) => `After costs you earn about ${net} a year.`, verdictRLoss: (net: string) => `After costs you lose about ${net} a year.`, verdictRGone: 'After costs there is nothing left.',
  },
  hi: {
    metal: 'धातु', gold: 'सोना', silver: 'चाँदी',
    rate: (m: Metal) => (m === 'gold' ? 'आज का 24 कैरेट सोने का भाव (₹ प्रति ग्राम)' : 'आज का 999 चाँदी का भाव (₹ प्रति ग्राम)'),
    rateHint: 'अपने ज्वेलर या किसी भरोसेमंद रेट बोर्ड से भाव डालें: यह दिन भर बदलता है और शहर के हिसाब से अलग होता है।',
    weight: 'वज़न (ग्राम)', purity: 'शुद्धता', makingType: 'मेकिंग चार्ज किस रूप में', percent: 'धातु की कीमत का %', perGram: '₹ प्रति ग्राम', makingPct: 'मेकिंग चार्ज (%)', makingGram: 'मेकिंग चार्ज (₹ प्रति ग्राम)',
    gst: 'जीएसटी (%)', buyback: 'ज्वेलर के वापस ख़रीदने पर कटौती (%)',
    metalValue: 'धातु की कीमत', making: 'मेकिंग चार्ज', gstAmt: 'जीएसटी', total: 'कुल आप देंगे', sellBack: 'वापस बेचने पर मिलेगा',
    lost: 'बेचने पर जो पैसा वापस नहीं मिलता', breakEven: 'भाव कितना बढ़ना चाहिए', premium: 'धातु की कीमत से ज़्यादा दिया', moreAssumptions: 'मेकिंग चार्ज, जीएसटी और वापस ख़रीद',
    amount: 'निवेश की रकम', buy: (m: Metal) => `ख़रीदते समय प्रति ग्राम भाव (${m === 'gold' ? 'सोना' : 'चाँदी'})`, sell: 'बेचते समय प्रति ग्राम भाव', years: 'कितने साल रखेंगे',
    buyCost: 'ख़रीदते समय खर्च (जीएसटी, मेकिंग, ब्रोकरेज) (%)', sellCost: 'बेचते समय खर्च (वापस ख़रीद की कटौती, ब्रोकरेज) (%)', holding: 'हर साल रखने का खर्च (लॉकर, फंड खर्च) (%)',
    grams: 'आपको मिलने वाले ग्राम', finalValue: 'अंत में हाथ में आने वाली रकम', gain: 'फ़ायदा या नुकसान', priceCagr: 'भाव में सालाना बढ़त', netCagr: 'खर्च के बाद आपका सालाना रिटर्न', breakEvenPrice: 'पैसे वापस पाने के लिए ज़रूरी प्रति ग्राम भाव',
    yrs: 'साल', g: 'ग्राम', none: '—', inputs: 'सोना और चाँदी की जानकारी', costsH: 'खर्च',
    verdictJ: (premium: string, rise: string) => `आप धातु की असली कीमत से ${premium} ज़्यादा दे रहे हैं। वापस बेचने पर चुकाई रकम लौटाने के लिए प्रति ग्राम भाव लगभग ${rise} बढ़ना चाहिए।`,
    verdictRGain: (net: string) => `सारे खर्च के बाद आपको लगभग ${net} सालाना मिलता है।`, verdictRLoss: (net: string) => `सारे खर्च के बाद आपको लगभग ${net} सालाना नुकसान होता है।`, verdictRGone: 'सारे खर्च के बाद कुछ नहीं बचता।',
  },
} as const;

const rs = (n: number, dp: 0 | 2 = 0): string => formatRupees(n, dp);
const pc = (f: number | null): string => (f === null ? '—' : `${(f * 100).toFixed(2)}%`);

/** Gold and silver: jewellery price with making charges and GST, or the return after costs. Maths is in src/lib/metals.ts. */
export function MetalCalculator({ kind, lang = 'en' }: { kind: MetalKind; lang?: Lang }) {
  const t = T[lang];
  const [metal, setMetal] = useState<Metal>('gold');
  const [rate, setRate] = useState(10_000);
  const [weight, setWeight] = useState(10);
  const [purityIdx, setPurityIdx] = useState(1);
  const [makingType, setMakingType] = useState<'percent' | 'perGram'>('percent');
  const [makingPct, setMakingPct] = useState(10);
  const [makingGram, setMakingGram] = useState(500);
  const [gst, setGst] = useState(3);
  const [buyback, setBuyback] = useState(0);
  const [amount, setAmount] = useState(100_000);
  const [buyPrice, setBuyPrice] = useState(6_000);
  const [sellPrice, setSellPrice] = useState(7_500);
  const [years, setYears] = useState(5);
  const [buyCost, setBuyCost] = useState(3);
  const [sellCost, setSellCost] = useState(0);
  const [holding, setHolding] = useState(0);

  const changeMetal = (m: Metal): void => {
    setMetal(m);
    setPurityIdx(1);
    // Rough example prices: replace them with today's rate.
    setRate(m === 'gold' ? 10_000 : 100);
    setBuyPrice(m === 'gold' ? 6_000 : 80);
    setSellPrice(m === 'gold' ? 7_500 : 100);
  };
  const metalChoice = <Choice label={t.metal} value={metal} options={[['gold', t.gold], ['silver', t.silver]]} onChange={changeMetal} testid="metal-choice" />;

  const j = useMemo(
    () => jewelleryPrice({ ratePerGram: rate, weightGrams: weight, purity: PURITIES[metal][purityIdx].fraction, makingType, making: makingType === 'percent' ? makingPct / 100 : makingGram, gst: gst / 100, buybackDeduction: buyback / 100 }),
    [metal, rate, weight, purityIdx, makingType, makingPct, makingGram, gst, buyback],
  );
  const r = useMemo(
    () => metalReturn({ amount, buyPrice, sellPrice, years, buyCost: buyCost / 100, sellCost: sellCost / 100, holdingCostPerYear: holding / 100 }),
    [amount, buyPrice, sellPrice, years, buyCost, sellCost, holding],
  );

  if (kind === 'jewellery') {
    const verdict = j.premium === null || j.breakEvenRise === null ? '' : t.verdictJ(pc(j.premium), pc(j.breakEvenRise));
    return (
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputs}>
          {metalChoice}
          <div>
            <NumberField label={t.rate(metal)} value={rate} onChange={setRate} min={1} max={1_000_000} sliderMax={metal === 'gold' ? 30_000 : 500} step={metal === 'gold' ? 50 : 1} rupee />
            <p class="mt-1.5 text-xs text-muted">{t.rateHint}</p>
          </div>
          <NumberField label={t.weight} value={weight} onChange={setWeight} min={0.1} max={10_000} sliderMax={metal === 'gold' ? 200 : 2000} step={0.5} unit={t.g} />
          <Choice label={t.purity} value={purityIdx} options={PURITIES[metal].map((p, i) => [i, p.label] as [number, string])} onChange={setPurityIdx} testid="purity-choice" />
          <Choice label={t.makingType} value={makingType} options={[['percent', t.percent], ['perGram', t.perGram]]} onChange={setMakingType} />
          {makingType === 'percent'
            ? <NumberField label={t.makingPct} value={makingPct} onChange={setMakingPct} min={0} max={100} step={0.5} unit="%" />
            : <NumberField label={t.makingGram} value={makingGram} onChange={setMakingGram} min={0} max={100_000} sliderMax={5000} step={10} rupee />}
          <details class="rounded-md border border-line" data-testid="more-assumptions">
            <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.moreAssumptions}</summary>
            <div class="space-y-5 p-4">
              <NumberField label={t.gst} value={gst} onChange={setGst} min={0} max={30} step={0.5} unit="%" />
              <NumberField label={t.buyback} value={buyback} onChange={setBuyback} min={0} max={50} step={0.5} unit="%" />
            </div>
          </details>
        </form>
        <div class="space-y-4" aria-live="polite">
          {verdict && <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="metal-verdict">{verdict}</p>}
          <div class="grid gap-3 sm:grid-cols-2" data-testid="results">
            <Tile label={t.total} value={rs(j.total)} strong testid="metal-total" />
            <Tile label={t.metalValue} value={rs(j.metalValue)} testid="metal-value" />
            <Tile label={t.making} value={rs(j.makingCharges)} testid="metal-making" />
            <Tile label={t.gstAmt} value={rs(j.gst)} testid="metal-gst" />
            <Tile label={t.sellBack} value={rs(j.sellBackValue)} testid="metal-sellback" />
            <Tile label={t.lost} value={rs(j.lostOnSelling)} testid="metal-lost" />
          </div>
        </div>
      </div>
    );
  }

  const net = r.netCagr;
  const verdict = net === null ? t.verdictRGone : net >= 0 ? t.verdictRGain(pc(net)) : t.verdictRLoss(pc(Math.abs(net)));
  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="space-y-5 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.inputs}>
        {metalChoice}
        <NumberField label={t.amount} value={amount} onChange={setAmount} min={1000} max={1_000_000_000} sliderMax={5_000_000} step={1000} rupee />
        <NumberField label={t.buy(metal)} value={buyPrice} onChange={setBuyPrice} min={1} max={1_000_000} sliderMax={metal === 'gold' ? 30_000 : 500} step={metal === 'gold' ? 50 : 1} rupee />
        <NumberField label={t.sell} value={sellPrice} onChange={setSellPrice} min={0} max={1_000_000} sliderMax={metal === 'gold' ? 30_000 : 500} step={metal === 'gold' ? 50 : 1} rupee />
        <NumberField label={t.years} value={years} onChange={setYears} min={1} max={50} step={1} unit={t.yrs} />
        <details class="rounded-md border border-line" data-testid="more-assumptions">
          <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">{t.costsH}</summary>
          <div class="space-y-5 p-4">
            <NumberField label={t.buyCost} value={buyCost} onChange={setBuyCost} min={0} max={50} step={0.5} unit="%" />
            <NumberField label={t.sellCost} value={sellCost} onChange={setSellCost} min={0} max={50} step={0.5} unit="%" />
            <NumberField label={t.holding} value={holding} onChange={setHolding} min={0} max={10} step={0.1} unit="%" />
          </div>
        </details>
      </form>
      <div class="space-y-4" aria-live="polite">
        <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="metal-verdict">{verdict}</p>
        <div class="grid gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.netCagr} value={pc(r.netCagr)} strong testid="metal-netcagr" />
          <Tile label={t.priceCagr} value={pc(r.priceCagr)} testid="metal-pricecagr" />
          <Tile label={t.finalValue} value={rs(r.finalValue)} testid="metal-final" />
          <Tile label={t.gain} value={rs(r.gain)} />
          <Tile label={t.grams} value={`${r.grams.toFixed(2)} ${t.g}`} />
          <Tile label={t.breakEvenPrice} value={r.breakEvenPrice === null ? t.none : rs(r.breakEvenPrice)} testid="metal-breakeven" />
        </div>
      </div>
    </div>
  );
}
