import { useEffect, useState } from 'preact/hooks';
import { formatDay, formatNav } from '../lib/format.ts';
import { fundHrefAt, hasFundPage, schemeStem } from '../lib/fundLinks.ts';
import { cellFor } from '../lib/screener/cells.ts';
import { COLUMNS, type Column } from '../lib/screener/columns.ts';
import { prepare, type Prepared } from '../lib/screener/query.ts';
import type { ScreenerData } from '../lib/screener/types.ts';
import { slugify } from '../lib/slug.ts';
import { NavChart } from './NavChart.tsx';

const PLAN: Record<string, string> = { direct: 'Direct plan', regular: 'Regular plan', na: '', unknown: 'Plan not stated' };
const OPTION: Record<string, string> = { growth: 'Growth option', idcw: 'IDCW option', other: 'Other option' };
const GROUPS: Column['group'][] = ['Costs and size', 'Returns', 'SIP returns', 'Risk', 'Rolling returns'];

type State =
  | { kind: 'loading' }
  | { kind: 'missing'; code: string | null }
  | { kind: 'error' }
  | { kind: 'ready'; p: Prepared; i: number; main: number | null };

/**
 * The page for fund variants that have no static page of their own (Regular plans, IDCW and other
 * options): reads `?code=` from the address, loads the same data file as the screener and shows the
 * fund's numbers and chart. The page is not indexed; it links to the scheme's Direct Growth page.
 */
export function FundOnDemand() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code');
    if (!code || !/^\d+$/.test(code)) { setState({ kind: 'missing', code }); return; }
    fetch('/data/screener.json')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<ScreenerData>; })
      .then((data) => {
        const i = data.code.indexOf(Number(code));
        if (i < 0) { setState({ kind: 'missing', code }); return; }
        const p = prepare(data);
        const stem = schemeStem(data.name[i]);
        let main: number | null = null;
        for (let j = 0; j < data.count; j++) {
          if (j !== i && data.amc[j] === data.amc[i] && hasFundPage(data.dict.plan[data.plan[j]], data.dict.option[data.option[j]]) && schemeStem(data.name[j]) === stem) { main = j; break; }
        }
        setState({ kind: 'ready', p, i, main });
        document.title = `${data.name[i]}: NAV, Returns and Risk | Mutual Fund Compare`;
        const h1 = document.getElementById('fund-h');
        if (h1) h1.textContent = data.name[i];
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  if (state.kind === 'loading') return <div class="skeleton h-64" aria-busy="true" aria-label="Loading the fund" />;
  if (state.kind === 'error') return <p class="text-sm text-muted">The fund data could not be loaded. Reload the page to try again.</p>;
  if (state.kind === 'missing') {
    return (
      <p class="text-sm text-muted" data-testid="fund-missing">
        {state.code ? `No active fund has the scheme code ${state.code}. It may have closed or merged.` : 'No fund was chosen.'}{' '}
        <a class="underline" href="/#screener">Find a fund in the screener</a>.
      </p>
    );
  }

  const { p, i, main } = state;
  const d = p.data;
  const plan = d.dict.plan[d.plan[i]];
  const option = d.dict.option[d.option[i]];
  const category = d.dict.category[d.category[i]];
  const tags = [d.dict.amc[d.amc[i]], category, PLAN[plan], OPTION[option]].filter(Boolean).join(' · ');

  return (
    <div class="space-y-8" data-testid="fund-on-demand">
      <div>
        <p class="text-sm text-muted">{tags}</p>
        <p class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span class="num text-3xl font-semibold tracking-tight">₹{formatNav(d.nav[i])}</span>
          <span class="text-sm text-muted">NAV as on {formatDay(d.navDate[i])}</span>
          <a href={`/compare/?f=${d.code[i]}`} class="inline-flex min-h-10 items-center rounded-md border border-line px-3 text-sm hover:bg-subtle">Compare with other funds</a>
        </p>
        {main !== null ? (
          <p class="mt-4 rounded-md border border-line bg-subtle p-3 text-sm" data-testid="main-variant">
            This is the {[PLAN[plan], OPTION[option]].filter(Boolean).join(', ')} of the scheme. Its main page is the Direct Growth version:{' '}
            <a class="underline" href={fundHrefAt(d, main)}>{d.name[main]}</a>.
          </p>
        ) : null}
      </div>

      <NavChart src={`/data/nav/${d.code[i]}.json`} name={d.name[i]} />

      {GROUPS.map((g) => {
        const cols = COLUMNS.filter((c) => c.group === g && c.kind !== 'text');
        return (
          <section key={g} aria-labelledby={`g-${slugify(g)}`}>
            <h2 id={`g-${slugify(g)}`} class="mb-2 text-lg font-semibold tracking-tight">{g}</h2>
            <dl class="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-4">
              {cols.map((c) => {
                const cell = cellFor(p, i, c);
                return (
                  <div key={c.key} class="rounded-md border border-line p-3">
                    <dt class="text-xs text-muted" title={c.help}>{c.label}</dt>
                    <dd class={`num mt-1 text-left text-base ${cell.cls}`}>{cell.text}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}

      <p class="text-xs text-muted">
        Returns of 1 year and longer are yearly (CAGR); shorter periods are plain percentage changes. IDCW options pay out part of their value, so their NAV-based returns understate what holders received.{' '}
        <a class="underline" href={`/category/${slugify(category)}/`}>See all {category} funds</a> ·{' '}
        <a class="underline" href="/methodology/">How the numbers are calculated</a>.
      </p>
    </div>
  );
}
