import { useMemo, useState } from 'preact/hooks';
import { formatRupees } from '../../lib/format.ts';
import { xirrOf, type XirrRow } from '../../lib/xirrTool.ts';
import { Tile } from './shared.tsx';

interface Row extends XirrRow { id: number; text: string }

// Fixed example dates and amounts (not "today"), so the page looks the same on every visit.
const START: Row[] = [
  { id: 1, date: '2023-01-10', amount: 100_000, text: '100000', kind: 'in' },
  { id: 2, date: '2024-01-10', amount: 100_000, text: '100000', kind: 'in' },
  { id: 3, date: '2025-01-10', amount: 100_000, text: '100000', kind: 'in' },
];
const T = {
  en: {
    problems: {
      date: 'One of the dates is not a real date. Check each row.',
      order: 'The date of the current value must be after the first investment and not before any other row.',
      empty: 'Enter at least one investment and either a current value or a withdrawal.',
      nosolution: 'No yearly rate fits these cash flows. Check the amounts and dates.',
    },
    form: 'Cash flows', flows: 'Money you put in and took out', date: (i: number) => `Date, row ${i}`, amount: (i: number) => `Amount, row ${i}`, type: (i: number) => `Type, row ${i}`,
    invested: 'Invested', withdrawn: 'Withdrawn', remove: 'Remove', removeRow: (i: number) => `Remove row ${i}`, add: 'Add a row',
    valueToday: 'Value today', worth: 'What it is worth now', valueDate: 'Date of the current value', value: 'Current value',
    zero: 'Enter 0 if you have already taken everything out and listed it as withdrawals above. The dates and amounts shown at first are an example.',
    verdict: (r: string) => `Your money has grown at ${r} a year (XIRR), counting the date of every investment and withdrawal.`,
    rate: 'XIRR (yearly return)', totalIn: 'Total invested', received: 'Withdrawals + current value', gain: 'Gain or loss', time: 'Time from first investment',
    held: (y: string, d: string) => `${y} years (${d} days)`,
    note: 'XIRR is the same measure a spreadsheet’s XIRR function gives. For money held less than a year it shows the yearly pace, which can look very large or very small.',
  },
  hi: {
    problems: {
      date: 'कोई एक तारीख़ सही नहीं है। हर पंक्ति जाँचें।',
      order: 'मौजूदा क़ीमत की तारीख़ पहले निवेश के बाद की होनी चाहिए और किसी भी पंक्ति से पहले की नहीं।',
      empty: 'कम से कम एक निवेश और मौजूदा क़ीमत या एक निकासी डालें।',
      nosolution: 'इन रकमों पर कोई सालाना दर फ़िट नहीं होती। रकम और तारीख़ें जाँचें।',
    },
    form: 'नक़दी का लेन-देन', flows: 'आपने कब कितना लगाया और निकाला', date: (i: number) => `तारीख़, पंक्ति ${i}`, amount: (i: number) => `रकम, पंक्ति ${i}`, type: (i: number) => `प्रकार, पंक्ति ${i}`,
    invested: 'निवेश', withdrawn: 'निकासी', remove: 'हटाएँ', removeRow: (i: number) => `पंक्ति ${i} हटाएँ`, add: 'पंक्ति जोड़ें',
    valueToday: 'आज की क़ीमत', worth: 'अभी इसकी क़ीमत', valueDate: 'मौजूदा क़ीमत की तारीख़', value: 'मौजूदा क़ीमत',
    zero: 'अगर आप सब कुछ निकाल चुके हैं और ऊपर निकासी के रूप में लिख दिया है, तो 0 डालें। शुरू में दिखी तारीख़ें और रकम उदाहरण हैं।',
    verdict: (r: string) => `हर निवेश और निकासी की तारीख़ गिनकर, आपका पैसा ${r} सालाना (XIRR) की दर से बढ़ा है।`,
    rate: 'XIRR (सालाना रिटर्न)', totalIn: 'कुल निवेश', received: 'निकासी + मौजूदा क़ीमत', gain: 'मुनाफ़ा या नुकसान', time: 'पहले निवेश से समय',
    held: (y: string, d: string) => `${y} साल (${d} दिन)`,
    note: 'XIRR वही पैमाना है जो स्प्रेडशीट का XIRR फ़ंक्शन देता है। साल भर से कम रखे पैसे के लिए यह सालाना रफ़्तार दिखाता है, जो बहुत बड़ी या बहुत छोटी लग सकती है।',
  },
} as const;
const rs = (n: number): string => formatRupees(Math.round(n));
const parse = (raw: string): number => { const n = Number(raw.replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? n : 0; };
const INPUT = 'num h-10 rounded-md border border-line bg-bg px-2 text-sm sm:h-9';

/** XIRR from dated investments and withdrawals, in English or Hindi. The maths is in src/lib/xirrTool.ts. */
export function XirrCalculator({ lang = 'en' }: { lang?: 'en' | 'hi' }) {
  const t = T[lang];
  const [rows, setRows] = useState<Row[]>(START);
  const [nextId, setNextId] = useState(4);
  const [valueText, setValueText] = useState('400000');
  const [valueDate, setValueDate] = useState('2026-01-10');
  const value = parse(valueText);
  const r = useMemo(() => xirrOf(rows, value, valueDate), [rows, value, valueDate]);
  const patch = (id: number, change: Partial<Row>): void => setRows((rs0) => rs0.map((x) => (x.id === id ? { ...x, ...change } : x)));
  const add = (): void => { const last = rows[rows.length - 1]; setRows([...rows, { id: nextId, date: last?.date ?? valueDate, amount: 0, text: '', kind: 'in' }]); setNextId(nextId + 1); };
  const yearsHeld = r.days / 365;

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form class="space-y-4 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label={t.form}>
        <fieldset>
          <legend class="text-sm font-medium">{t.flows}</legend>
          <ul class="mt-3 space-y-3" data-testid="xirr-rows">
            {rows.map((row, i) => (
              <li key={row.id} class="flex flex-wrap items-center gap-2" data-testid="xirr-row">
                <input type="date" id={`xirr-date-${row.id}`} class={`${INPUT} w-[9.75rem]`} value={row.date} aria-label={t.date(i + 1)} onInput={(e) => patch(row.id, { date: (e.currentTarget as HTMLInputElement).value })} />
                <span class="flex items-center gap-1.5">
                  <span class="text-sm text-muted" aria-hidden="true">₹</span>
                  <input type="text" id={`xirr-amount-${row.id}`} inputMode="decimal" class={`${INPUT} w-28`} value={row.text} aria-label={t.amount(i + 1)} onInput={(e) => { const text = (e.currentTarget as HTMLInputElement).value; patch(row.id, { text, amount: parse(text) }); }} />
                </span>
                <select class={`${INPUT} pr-1`} value={row.kind} aria-label={t.type(i + 1)} onChange={(e) => patch(row.id, { kind: (e.currentTarget as HTMLSelectElement).value as 'in' | 'out' })}>
                  <option value="in">{t.invested}</option>
                  <option value="out">{t.withdrawn}</option>
                </select>
                <button type="button" class="h-10 rounded-md border border-line px-2.5 text-sm text-muted hover:bg-subtle disabled:opacity-40 sm:h-9" disabled={rows.length <= 1} aria-label={t.removeRow(i + 1)} onClick={() => setRows(rows.filter((x) => x.id !== row.id))}>{t.remove}</button>
              </li>
            ))}
          </ul>
          <button type="button" class="mt-3 h-10 rounded-md border border-line px-3 text-sm font-medium hover:bg-subtle sm:h-9" data-testid="xirr-add" disabled={rows.length >= 60} onClick={add}>{t.add}</button>
        </fieldset>
        <fieldset class="border-t border-line pt-4">
          <legend class="sr-only">{t.valueToday}</legend>
          <p class="text-sm font-medium">{t.worth}</p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <input type="date" id="xirr-value-date" class={`${INPUT} w-[9.75rem]`} value={valueDate} aria-label={t.valueDate} data-testid="xirr-value-date" onInput={(e) => setValueDate((e.currentTarget as HTMLInputElement).value)} />
            <span class="flex items-center gap-1.5">
              <span class="text-sm text-muted" aria-hidden="true">₹</span>
              <input type="text" id="xirr-value" inputMode="decimal" class={`${INPUT} w-32`} value={valueText} aria-label={t.value} data-testid="xirr-value" onInput={(e) => setValueText((e.currentTarget as HTMLInputElement).value)} />
            </span>
          </div>
          <p class="mt-3 text-xs leading-relaxed text-muted">{t.zero}</p>
        </fieldset>
      </form>
      <div class="space-y-4" aria-live="polite">
        {r.rate === null ? <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium" data-testid="xirr-problem">{t.problems[r.problem ?? 'nosolution']}</p> : (
          <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="xirr-verdict">{t.verdict(`${(r.rate * 100).toFixed(2)}%`)}</p>
        )}
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label={t.rate} value={r.rate === null ? '—' : `${(r.rate * 100).toFixed(2)}%`} strong testid="xirr-rate" />
          <Tile label={t.totalIn} value={rs(r.invested)} testid="xirr-invested" />
          <Tile label={t.received} value={rs(r.received)} testid="xirr-received" />
          <Tile label={t.gain} value={rs(r.gain)} testid="xirr-gain" />
          <Tile label={t.time} value={r.days > 0 ? t.held(yearsHeld.toFixed(1), r.days.toLocaleString('en-IN')) : '—'} />
        </div>
        <p class="text-xs leading-relaxed text-muted">{t.note}</p>
      </div>
    </div>
  );
}
