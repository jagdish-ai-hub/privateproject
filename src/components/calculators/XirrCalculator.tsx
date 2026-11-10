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
const PROBLEMS = {
  date: 'One of the dates is not a real date. Check each row.',
  order: 'The date of the current value must be after the first investment and not before any other row.',
  empty: 'Enter at least one investment and either a current value or a withdrawal.',
  nosolution: 'No yearly rate fits these cash flows. Check the amounts and dates.',
} as const;
const rs = (n: number): string => formatRupees(Math.round(n));
const parse = (raw: string): number => { const n = Number(raw.replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? n : 0; };
const INPUT = 'num h-10 rounded-md border border-line bg-bg px-2 text-sm sm:h-9';

/** XIRR from dated investments and withdrawals. English only. The maths is in src/lib/xirrTool.ts. */
export function XirrCalculator() {
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
      <form class="space-y-4 rounded-md border border-line p-5" onSubmit={(e) => e.preventDefault()} aria-label="Cash flows">
        <fieldset>
          <legend class="text-sm font-medium">Money you put in and took out</legend>
          <ul class="mt-3 space-y-3" data-testid="xirr-rows">
            {rows.map((row, i) => (
              <li key={row.id} class="flex flex-wrap items-center gap-2" data-testid="xirr-row">
                <input type="date" class={`${INPUT} w-[9.75rem]`} value={row.date} aria-label={`Date, row ${i + 1}`} onInput={(e) => patch(row.id, { date: (e.currentTarget as HTMLInputElement).value })} />
                <span class="flex items-center gap-1.5">
                  <span class="text-sm text-muted" aria-hidden="true">₹</span>
                  <input type="text" inputMode="decimal" class={`${INPUT} w-28`} value={row.text} aria-label={`Amount, row ${i + 1}`} onInput={(e) => { const text = (e.currentTarget as HTMLInputElement).value; patch(row.id, { text, amount: parse(text) }); }} />
                </span>
                <select class={`${INPUT} pr-1`} value={row.kind} aria-label={`Type, row ${i + 1}`} onChange={(e) => patch(row.id, { kind: (e.currentTarget as HTMLSelectElement).value as 'in' | 'out' })}>
                  <option value="in">Invested</option>
                  <option value="out">Withdrawn</option>
                </select>
                <button type="button" class="h-10 rounded-md border border-line px-2.5 text-sm text-muted hover:bg-subtle disabled:opacity-40 sm:h-9" disabled={rows.length <= 1} aria-label={`Remove row ${i + 1}`} onClick={() => setRows(rows.filter((x) => x.id !== row.id))}>Remove</button>
              </li>
            ))}
          </ul>
          <button type="button" class="mt-3 h-10 rounded-md border border-line px-3 text-sm font-medium hover:bg-subtle sm:h-9" data-testid="xirr-add" disabled={rows.length >= 60} onClick={add}>Add a row</button>
        </fieldset>
        <fieldset class="border-t border-line pt-4">
          <legend class="sr-only">Value today</legend>
          <p class="text-sm font-medium">What it is worth now</p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <input type="date" class={`${INPUT} w-[9.75rem]`} value={valueDate} aria-label="Date of the current value" data-testid="xirr-value-date" onInput={(e) => setValueDate((e.currentTarget as HTMLInputElement).value)} />
            <span class="flex items-center gap-1.5">
              <span class="text-sm text-muted" aria-hidden="true">₹</span>
              <input type="text" inputMode="decimal" class={`${INPUT} w-32`} value={valueText} aria-label="Current value" data-testid="xirr-value" onInput={(e) => setValueText((e.currentTarget as HTMLInputElement).value)} />
            </span>
          </div>
          <p class="mt-3 text-xs leading-relaxed text-muted">Enter 0 if you have already taken everything out and listed it as withdrawals above. The dates and amounts shown at first are an example.</p>
        </fieldset>
      </form>
      <div class="space-y-4" aria-live="polite">
        {r.rate === null ? <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium" data-testid="xirr-problem">{PROBLEMS[r.problem ?? 'nosolution']}</p> : (
          <p class="rounded-md border border-line bg-subtle p-4 text-base font-medium leading-snug" data-testid="xirr-verdict">Your money has grown at {(r.rate * 100).toFixed(2)}% a year (XIRR), counting the date of every investment and withdrawal.</p>
        )}
        <div class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" data-testid="results">
          <Tile label="XIRR (yearly return)" value={r.rate === null ? '—' : `${(r.rate * 100).toFixed(2)}%`} strong testid="xirr-rate" />
          <Tile label="Total invested" value={rs(r.invested)} testid="xirr-invested" />
          <Tile label="Withdrawals + current value" value={rs(r.received)} testid="xirr-received" />
          <Tile label="Gain or loss" value={rs(r.gain)} testid="xirr-gain" />
          <Tile label="Time from first investment" value={r.days > 0 ? `${yearsHeld.toFixed(1)} years (${r.days.toLocaleString('en-IN')} days)` : '—'} />
        </div>
        <p class="text-xs leading-relaxed text-muted">XIRR is the same measure a spreadsheet’s XIRR function gives. For money held less than a year it shows the yearly pace, which can look very large or very small.</p>
      </div>
    </div>
  );
}
