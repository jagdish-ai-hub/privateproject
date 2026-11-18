/**
 * Ready reckoners: small tables of worked answers shown under a calculator, for the amounts people search
 * for most ("₹5,000 a month RD for 5 years", "home loan on a ₹50,000 salary", "Sukanya Samriddhi chart").
 * Every figure is computed at build time with the same functions the calculators use, so a table can never
 * disagree with the calculator above it. Rates for government schemes come from `src/data/small-savings.ts`.
 */
import { SMALL_SAVINGS } from '../data/small-savings.ts';
import { cagrBetween, lumpsumProjection, requiredSip, sipProjection } from './calculators.ts';
import { formatRupees } from './format.ts';
import { deposit, emi, inflation, loanEligibility } from './loans.ts';
import { goldSip, jewelleryPrice } from './metals.ts';
import { kvp, mis, nsc, ppf, rd, scss, ssy, timeDeposit } from './schemes.ts';
import type { SchemeKind } from './schemeContent.ts';
import type { Tool } from './tools.ts';
import { fuelCost } from './vehicle.ts';

/** A worked-answer table. `rows` are already formatted for display. */
export interface Reckoner {
  /** Heading above the table. */
  caption: string;
  /** Column headings. */
  head: string[];
  rows: string[][];
  /** Assumptions, shown under the table. */
  note: string;
}

type Lang = 'en' | 'hi';
const rs = (n: number): string => formatRupees(Math.round(n));
const pct = (n: number, dp = 1): string => `${(n * 100).toFixed(dp).replace(/\.0+$/, '')}%`;
const lakh = (n: number, hi: boolean): string => {
  if (n >= 10_000_000) return `₹${+(n / 10_000_000).toFixed(2)} ${hi ? 'करोड़' : 'crore'}`;
  if (n >= 100_000) return `₹${+(n / 100_000).toFixed(2)} ${hi ? 'लाख' : 'lakh'}`;
  return rs(n);
};
const yrs = (n: number, hi: boolean): string => (hi ? `${n} साल` : `${n} year${n === 1 ? '' : 's'}`);
const R = SMALL_SAVINGS.rates;
const period = (hi: boolean): string => (hi ? SMALL_SAVINGS.period.labelHi : SMALL_SAVINGS.period.label);

/**
 * Worked-answer table for a calculator, or null when a table would not add anything.
 *
 * @param kind - Calculator kind from `src/lib/tools.ts`.
 * @param lang - Language of the labels.
 */
export function toolReckoner(kind: Tool['kind'], lang: Lang = 'en'): Reckoner | null {
  const hi = lang === 'hi';
  switch (kind) {
    case 'sip': {
      const terms = [5, 10, 15, 20];
      return {
        caption: hi ? 'हर महीने की SIP कितनी बनेगी (12% सालाना मानकर)' : 'What a monthly SIP grows to at an assumed 12% a year',
        head: [hi ? 'हर महीने' : 'Monthly SIP', ...terms.map((t) => yrs(t, hi))],
        rows: [1_000, 2_000, 5_000, 10_000, 25_000].map((m) => [rs(m), ...terms.map((t) => rs(sipProjection(m, 0.12, t).value))]),
        note: hi
          ? '12% सिर्फ़ एक मानी हुई दर है, वादा नहीं। इक्विटी फंड का असली रिटर्न इससे काफ़ी ज़्यादा या कम हो सकता है।'
          : '12% is an assumption, not a promise. Real equity fund returns can be much higher or lower, including a loss.',
      };
    }
    case 'lumpsum': {
      const terms = [5, 10, 15, 20];
      return {
        caption: hi ? 'एकमुश्त निवेश कितना बनेगा (12% सालाना मानकर)' : 'What a lumpsum grows to at an assumed 12% a year',
        head: [hi ? 'निवेश' : 'Invested', ...terms.map((t) => yrs(t, hi))],
        rows: [100_000, 500_000, 1_000_000].map((a) => [rs(a), ...terms.map((t) => rs(lumpsumProjection(a, 0.12, t).value))]),
        note: hi ? '12% सिर्फ़ एक मानी हुई दर है, वादा नहीं।' : '12% is an assumption, not a promise.',
      };
    }
    case 'goal': {
      const terms = [10, 15, 20];
      return {
        caption: hi ? 'लक्ष्य के लिए हर महीने कितनी SIP चाहिए (12% सालाना मानकर)' : 'Monthly SIP needed for a goal at an assumed 12% a year',
        head: [hi ? 'लक्ष्य' : 'Goal', ...terms.map((t) => yrs(t, hi))],
        rows: [1_000_000, 2_500_000, 5_000_000, 10_000_000].map((g) => [lakh(g, hi), ...terms.map((t) => rs(requiredSip(g, 0.12, t)))]),
        note: hi ? 'महँगाई को शामिल नहीं किया गया है; आज के ₹1 करोड़ का लक्ष्य भविष्य में ज़्यादा रकम माँगेगा।' : 'Inflation is not included: a goal of ₹1 crore in today’s money will need more in future rupees.',
      };
    }
    case 'cagr': {
      const terms = [3, 5, 10];
      return {
        caption: hi ? 'कुल (एब्सोल्यूट) रिटर्न से सालाना रिटर्न (CAGR)' : 'Absolute return converted to CAGR (a year)',
        head: [hi ? 'कुल रिटर्न' : 'Absolute return', ...terms.map((t) => yrs(t, hi))],
        rows: [0.25, 0.5, 1, 2, 3].map((a) => [pct(a, 0), ...terms.map((t) => pct(cagrBetween(100, 100 * (1 + a), t) ?? 0, 2))]),
        note: hi ? 'उदाहरण: 5 साल में पैसा दोगुना (100% रिटर्न) होना लगभग 14.87% सालाना है।' : 'Example: money that doubles (100% return) in 5 years grew about 14.87% a year.',
      };
    }
    case 'fd': {
      const rates = [0.065, 0.07, 0.075];
      return {
        caption: hi ? '₹1 लाख की FD कितनी बनेगी (तिमाही चक्रवृद्धि, टैक्स से पहले)' : 'What ₹1 lakh in an FD becomes (quarterly compounding, before tax)',
        head: [hi ? 'अवधि' : 'Term', ...rates.map((r) => pct(r))],
        rows: [1, 2, 3, 5].map((y) => [yrs(y, hi), ...rates.map((r) => rs(deposit({ amount: 100_000, rate: r, years: y, perYear: 4, taxRate: 0, inflation: 0 }).maturity))]),
        note: hi ? 'ब्याज आपके स्लैब रेट पर टैक्स होता है; टैक्स के बाद की रकम कैलकुलेटर में देखें।' : 'Interest is taxed at your slab rate; see the amount after tax in the calculator.',
      };
    }
    case 'emi': case 'personalloan': case 'carloan': {
      const terms = kind === 'personalloan' ? [1, 3, 5] : kind === 'carloan' ? [3, 5, 7] : [3, 5, 10, 20];
      const rates = kind === 'personalloan' ? [0.11, 0.13, 0.16] : kind === 'carloan' ? [0.085, 0.095, 0.11] : [0.085, 0.1, 0.12];
      return {
        caption: hi ? 'हर ₹1 लाख के क़र्ज़ पर EMI' : 'EMI for every ₹1 lakh borrowed',
        head: [hi ? 'ब्याज दर' : 'Interest rate', ...terms.map((t) => yrs(t, hi))],
        rows: rates.map((r) => [pct(r, 2), ...terms.map((t) => rs(emi(100_000, r, t)))]),
        note: hi ? 'जितने लाख का क़र्ज़ है, उससे गुणा करें। दरें सिर्फ़ उदाहरण हैं।' : 'Multiply by the number of lakhs you borrow. The rates are examples only.',
      };
    }
    case 'homeloan': {
      const terms = [15, 20, 25, 30];
      return {
        caption: hi ? 'होम लोन EMI, 8.5% सालाना पर' : 'Home loan EMI at 8.5% a year',
        head: [hi ? 'क़र्ज़' : 'Loan', ...terms.map((t) => yrs(t, hi))],
        rows: [2_000_000, 3_000_000, 5_000_000, 7_500_000, 10_000_000].map((a) => [lakh(a, hi), ...terms.map((t) => rs(emi(a, 0.085, t)))]),
        note: hi ? '8.5% एक उदाहरण दर है; अपने बैंक की दर कैलकुलेटर में डालें।' : '8.5% is an example rate; enter your lender’s rate in the calculator.',
      };
    }
    case 'eligibility': {
      const at = (income: number, years: number): number => loanEligibility({ income, existingEmi: 0, emiShare: 0.5, rate: 0.0875, years }).maxLoan;
      return {
        caption: hi ? 'तनख़्वाह के हिसाब से होम लोन (8.75%, कोई और EMI नहीं)' : 'Home loan by monthly salary (8.75%, no other EMIs)',
        head: [hi ? 'हर महीने की आय' : 'Take-home pay a month', hi ? 'सबसे बड़ी EMI' : 'Largest EMI', yrs(20, hi), yrs(30, hi)],
        rows: [25_000, 30_000, 40_000, 50_000, 75_000, 100_000, 150_000, 200_000].map((s) => [rs(s), rs(s * 0.5), lakh(Math.round(at(s, 20)), hi), lakh(Math.round(at(s, 30)), hi)]),
        note: hi
          ? 'आय का आधा हिस्सा EMI के लिए माना गया है। बैंक आय, उम्र, क्रेडिट स्कोर और संपत्ति के मूल्य से अपना आँकड़ा तय करते हैं।'
          : 'Assumes half of income can go to EMIs. Lenders set their own figure from income, age, credit score and the property value.',
      };
    }
    case 'inflation': {
      const terms = [5, 10, 20, 30];
      return {
        caption: hi ? 'आज के ₹1 लाख की चीज़ भविष्य में कितने की होगी' : 'What costs ₹1 lakh today will cost in future',
        head: [hi ? 'महँगाई दर' : 'Inflation', ...terms.map((t) => yrs(t, hi))],
        rows: [0.04, 0.06, 0.08].map((r) => [pct(r, 0), ...terms.map((t) => rs(inflation(100_000, r, t).futureCost))]),
        note: hi ? 'हर साल की महँगाई चक्रवृद्धि से जुड़ती है।' : 'Inflation compounds every year.',
      };
    }
    case 'fuelcost': {
      const mileages = [12, 15, 18, 22];
      return {
        caption: hi ? '1,000 किमी चलाने का ईंधन ख़र्च' : 'Fuel cost to drive 1,000 km',
        head: [hi ? 'ईंधन की क़ीमत' : 'Fuel price', ...mileages.map((m) => (hi ? `${m} किमी/लीटर` : `${m} km/l`))],
        rows: [90, 95, 100, 105].map((p) => [hi ? `₹${p}/लीटर` : `₹${p}/litre`, ...mileages.map((m) => rs(fuelCost({ fuelPrice: p, kmPerUnit: m, mileageCut: 0, tripKm: 1_000, kmPerMonth: 0, people: 1 }).tripCost))]),
        note: hi ? 'ख़र्च = दूरी ÷ माइलेज × क़ीमत। अपने शहर की क़ीमत और गाड़ी का असली माइलेज कैलकुलेटर में डालें।' : 'Cost = distance ÷ mileage × price. Enter your city’s price and your car’s real mileage in the calculator.',
      };
    }
    case 'goldsip': {
      const terms = [5, 10, 15];
      return {
        caption: hi ? 'हर महीने की गोल्ड SIP कितनी बनेगी (सोना 8% सालाना मानकर)' : 'What a monthly gold SIP grows to if gold rises 8% a year',
        head: [hi ? 'हर महीने' : 'Monthly', ...terms.map((t) => yrs(t, hi))],
        rows: [1_000, 2_000, 5_000, 10_000].map((m) => [rs(m), ...terms.map((t) => rs(goldSip({ monthly: m, pricePerGram: 10_000, growth: 0.08, years: t, buyCost: 0.03 }).value))]),
        note: hi
          ? 'ख़रीद पर 3% ख़र्च माना गया है (डिजिटल गोल्ड पर GST)। सोने का भाव गिर भी सकता है; 8% सिर्फ़ एक मानी हुई दर है।'
          : 'Assumes 3% cost on each purchase (GST on digital gold). Gold prices can fall too; 8% is only an assumption.',
      };
    }
    case 'jewellery': {
      const rates = [10_000, 12_000, 14_000];
      const bill = (rate: number, carat: number): number => jewelleryPrice({ ratePerGram: rate, weightGrams: 10, purity: carat / 24, makingType: 'percent', making: 0.1, gst: 0.03, buybackDeduction: 0 }).total;
      return {
        caption: hi ? '10 ग्राम गहने का बिल (10% मेकिंग चार्ज + 3% GST)' : 'Bill for 10 g of jewellery (10% making charges + 3% GST)',
        head: [hi ? '24 कैरेट भाव (प्रति ग्राम)' : '24 carat rate a gram', hi ? '22 कैरेट' : '22 carat', hi ? '18 कैरेट' : '18 carat'],
        rows: rates.map((r) => [rs(r), rs(bill(r, 22)), rs(bill(r, 18))]),
        note: hi
          ? 'भाव सिर्फ़ उदाहरण हैं; आज का भाव कैलकुलेटर में डालें। 22 कैरेट = 24 कैरेट भाव × 22/24।'
          : 'Rates are examples only; enter today’s rate in the calculator. 22 carat = 24 carat rate × 22/24.',
      };
    }
    default:
      return null;
  }
}

/**
 * Worked-answer table for a government savings scheme at the current quarter's rate.
 *
 * @param kind - Scheme kind.
 * @param lang - Language of the labels.
 */
export function schemeReckoner(kind: SchemeKind, lang: Lang = 'en'): Reckoner | null {
  const hi = lang === 'hi';
  const f = (r: number): number => r / 100;
  const at = hi ? `${period(true)} की दर` : `rate for ${period(false)}`;
  switch (kind) {
    case 'ppf':
      return {
        caption: hi ? `PPF: 15 साल में परिपक्वता, ${R.ppf}% पर` : `PPF maturity after 15 years at ${R.ppf}%`,
        head: [hi ? 'हर साल जमा' : 'Yearly deposit', hi ? 'कुल जमा' : 'Total deposited', hi ? 'ब्याज' : 'Interest', hi ? 'परिपक्वता' : 'Maturity'],
        rows: [12_000, 25_000, 50_000, 100_000, 150_000].map((y) => { const b = ppf(y, f(R.ppf)); return [rs(y), rs(b.invested), rs(b.interest), rs(b.maturity)]; }),
        note: hi ? `हर साल 5 अप्रैल से पहले जमा मानकर; ${at}।` : `Deposits made before 5 April each year; ${at}.`,
      };
    case 'ssy': {
      const b = ssy(150_000, f(R.ssy));
      return {
        caption: hi ? `सुकन्या समृद्धि चार्ट: हर साल ₹1,50,000, ${R.ssy}% पर` : `Sukanya Samriddhi chart: ₹1,50,000 a year at ${R.ssy}%`,
        head: [hi ? 'साल' : 'Year', hi ? 'उस साल जमा' : 'Deposit that year', hi ? 'उस साल ब्याज' : 'Interest that year', hi ? 'साल के अंत में बैलेंस' : 'Balance at year end'],
        rows: b.rows.map((r) => [String(r.year), rs(r.deposit), rs(r.interest), rs(r.balance)]),
        note: hi
          ? `जमा 15 साल तक, खाता 21 साल में परिपक्व। दूसरी रकमों के लिए: हर साल ₹12,000 से ${rs(ssy(12_000, f(R.ssy)).maturity)}, ₹50,000 से ${rs(ssy(50_000, f(R.ssy)).maturity)}, ₹1,00,000 से ${rs(ssy(100_000, f(R.ssy)).maturity)}। ${at}, पूरे समय एक जैसी मानकर।`
          : `Deposits for 15 years; the account matures at 21 years. For other amounts: ₹12,000 a year gives ${rs(ssy(12_000, f(R.ssy)).maturity)}, ₹50,000 gives ${rs(ssy(50_000, f(R.ssy)).maturity)}, ₹1,00,000 gives ${rs(ssy(100_000, f(R.ssy)).maturity)}. Uses the ${at}, assumed unchanged throughout.`,
      };
    }
    case 'nsc':
      return {
        caption: hi ? `NSC: 5 साल में परिपक्वता, ${R.nsc}% पर` : `NSC maturity after 5 years at ${R.nsc}%`,
        head: [hi ? 'निवेश' : 'Invested', hi ? 'ब्याज' : 'Interest', hi ? 'परिपक्वता' : 'Maturity'],
        rows: [10_000, 50_000, 100_000, 500_000, 1_000_000].map((a) => { const b = nsc(a, f(R.nsc)); return [rs(a), rs(b.interest), rs(b.maturity)]; }),
        note: hi ? `ब्याज हर साल चक्रवृद्धि, परिपक्वता पर मिलता है; ${at}।` : `Interest compounds yearly and is paid at maturity; ${at}.`,
      };
    case 'kvp':
      return {
        caption: hi ? `KVP: ${SMALL_SAVINGS.kvpMonths} महीने में दोगुना` : `KVP doubles in ${SMALL_SAVINGS.kvpMonths} months`,
        head: [hi ? 'निवेश' : 'Invested', hi ? 'परिपक्वता' : 'Maturity'],
        rows: [10_000, 50_000, 100_000, 500_000, 1_000_000].map((a) => [rs(a), rs(kvp(a, SMALL_SAVINGS.kvpMonths).maturity)]),
        note: hi ? `${R.kvp}% सालाना, ${at}।` : `${R.kvp}% a year, ${at}.`,
      };
    case 'scss':
      return {
        caption: hi ? `SCSS: हर तिमाही ब्याज, ${R.scss}% पर` : `SCSS quarterly interest at ${R.scss}%`,
        head: [hi ? 'निवेश' : 'Invested', hi ? 'हर तिमाही' : 'Every quarter', hi ? 'हर महीने के बराबर' : 'Per month, roughly', hi ? '5 साल में कुल ब्याज' : 'Total interest, 5 years'],
        rows: [500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000].map((a) => { const x = scss(a, f(R.scss)); return [lakh(a, hi), rs(x.perPeriod), rs(x.perPeriod / 3), rs(x.totalInterest)]; }),
        note: hi ? `अधिकतम ₹30 लाख; ${at}।` : `Maximum ₹30 lakh; ${at}.`,
      };
    case 'mis':
      return {
        caption: hi ? `डाकघर MIS: हर महीने की आय, ${R.mis}% पर` : `Post Office MIS monthly income at ${R.mis}%`,
        head: [hi ? 'निवेश' : 'Invested', hi ? 'हर महीने' : 'Every month', hi ? 'हर साल' : 'Every year', hi ? '5 साल में कुल' : 'Total, 5 years'],
        rows: [100_000, 300_000, 500_000, 900_000, 1_500_000].map((a) => { const x = mis(a, f(R.mis)); return [lakh(a, hi), rs(x.perPeriod), rs(x.perPeriod * 12), rs(x.totalInterest)]; }),
        note: hi ? `एकल खाते में अधिकतम ₹9 लाख, संयुक्त में ₹15 लाख; ${at}।` : `Maximum ₹9 lakh in a single account, ₹15 lakh in a joint account; ${at}.`,
      };
    case 'rd':
      return {
        caption: hi ? `डाकघर RD: 5 साल में परिपक्वता, ${R.rd5}% पर` : `Post Office RD maturity after 5 years at ${R.rd5}%`,
        head: [hi ? 'हर महीने' : 'Monthly deposit', hi ? 'कुल जमा' : 'Total deposited', hi ? 'ब्याज' : 'Interest', hi ? 'परिपक्वता' : 'Maturity'],
        rows: [500, 1_000, 2_000, 3_000, 5_000, 10_000].map((m) => { const b = rd(m, f(R.rd5)); return [rs(m), rs(b.invested), rs(b.interest), rs(b.maturity)]; }),
        note: hi ? `तिमाही चक्रवृद्धि; ${at}।` : `Compounded quarterly; ${at}.`,
      };
    case 'td': {
      const terms: [number, number][] = [[1, R.td1], [2, R.td2], [3, R.td3], [5, R.td5]];
      return {
        caption: hi ? 'डाकघर FD (टाइम डिपॉज़िट): ₹1 लाख पर ब्याज' : 'Post Office FD (time deposit): interest on ₹1 lakh',
        head: [hi ? 'अवधि' : 'Term', hi ? 'दर' : 'Rate', hi ? 'हर साल ब्याज' : 'Interest a year', hi ? 'कुल ब्याज' : 'Total interest'],
        rows: terms.map(([y, r]) => { const x = timeDeposit(100_000, f(r), y); return [yrs(y, hi), `${r}%`, rs(x.perPeriod), rs(x.totalInterest)]; }),
        note: hi ? `ब्याज हर साल दिया जाता है; ${at}।` : `Interest is paid out every year; ${at}.`,
      };
    }
    default:
      return null;
  }
}
