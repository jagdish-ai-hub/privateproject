import { signClass } from '../lib/format.ts';
import type { Insight, InsightLeader } from '../lib/insights.ts';
import { InfoTip } from './InfoTip.tsx';

interface Props {
  title: string;
  /** One-sentence summary (read by screen readers; the visual summary is `leaders`), or null. */
  headline?: string | null;
  /** Who leads on what, drawn as a short list at the top. */
  leaders?: InsightLeader[];
  items: Insight[];
  caveats?: string[];
  /** Id prefix so several panels on one page keep unique popover ids. */
  idPrefix?: string;
  /** Chart line colour (a CSS value such as `var(--s1)`) for each fund, by position, so a name matches its line. */
  swatches?: string[];
}

/**
 * "What the numbers say": facts about a fund or a comparison, each with an (i) that explains the measure.
 * Insights that carry figures per fund (a comparison) are drawn as small cards with a bar per fund; plain
 * sentences (the fund page's peer notes) are drawn as a list. Every card also carries its full sentence for
 * screen readers. Renders on the server too (no client directive needed).
 *
 * @param props - Title, summary, insights and caveats from `src/lib/insights.ts`.
 * @returns The panel, or nothing when there is nothing to say.
 */
export function InsightsPanel({ title, headline, leaders = [], items, caveats = [], idPrefix = 'ins', swatches = [] }: Props) {
  if (items.length === 0 && !headline) return null;
  const cards = items.some((it) => it.rows && it.rows.length > 0);
  const swatch = (fund: number) => (swatches[fund] ? (
    <svg class="mt-[0.6em] shrink-0" width="14" height="6" aria-hidden="true"><line x1="0" y1="3" x2="14" y2="3" stroke={swatches[fund]} stroke-width="2" stroke-linecap="round" /></svg>
  ) : null);

  return (
    <section class="rounded-md border border-line p-4" aria-label={title} data-testid="insights">
      <h2 class="text-base font-semibold tracking-tight">{title}</h2>
      <p class="mt-0.5 text-xs text-muted">Written from the figures in the tables on this page. Facts about the past, not advice.</p>
      {headline && <p class={cards ? 'sr-only' : 'mt-3 text-sm font-medium'} data-testid="insights-headline">{headline}</p>}

      {cards && leaders.length > 0 && (
        <div class="mt-3 rounded-md border border-line bg-subtle p-3" aria-hidden="true" data-testid="insights-leaders">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Who leads on what</p>
          <ul class="mt-2 space-y-2">
            {leaders.map((l) => (
              <li key={l.fund} class="flex flex-wrap items-start gap-x-2 gap-y-1">
                <span class="flex min-w-0 items-start gap-1.5 text-sm font-medium">{swatch(l.fund)}<span class="min-w-0 break-words">{l.label}</span></span>
                <span class="flex flex-wrap gap-1">
                  {l.dims.map((d) => <span key={d} class="rounded-full border border-line bg-bg px-2 py-0.5 text-xs">{d}</span>)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cards ? (
        <ul class="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 sm:gap-3">
          {items.map((it) => (it.rows && it.rows.length > 0 ? (
            <li key={it.id} class="rounded-md border border-line p-3" data-insight={it.id}>
              <h3 class="text-sm font-medium leading-snug">{it.measure}{it.term && <InfoTip term={it.term} instance={`${idPrefix}-${it.id}`} />}</h3>
              {it.hint && <p class="mt-0.5 text-xs text-muted">{it.hint}</p>}
              <ol class="mt-2.5 space-y-2.5" aria-hidden="true">
                {it.rows.map((r) => (
                  <li key={r.fund}>
                    <div class="flex items-baseline justify-between gap-3">
                      <span class="flex min-w-0 items-start gap-1.5 text-sm">
                        {swatch(r.fund)}
                        <span class={`min-w-0 break-words ${r.lead ? 'font-medium' : 'text-muted'}`}>
                          {r.label}
                          {r.lead && <span class="ml-1.5 whitespace-nowrap rounded border border-line px-1 py-px align-middle text-[10px] font-medium uppercase tracking-wide text-muted">Leads</span>}
                        </span>
                      </span>
                      <span class={`num shrink-0 text-sm ${it.signed && r.raw !== null ? signClass(r.raw) : ''} ${r.lead ? 'font-semibold' : ''}`}>{r.value}</span>
                    </div>
                    {r.share !== null && (
                      <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle">
                        <div class="h-full rounded-full" style={{ width: `${Math.max(3, r.share * 100)}%`, background: r.lead ? 'var(--fg)' : 'var(--fg-muted)', opacity: r.lead ? 1 : 0.4 }} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
              {it.note && <p class="mt-2.5 text-xs text-muted">{it.note}</p>}
              <p class="sr-only">{it.text}</p>
            </li>
          ) : (
            <li key={it.id} class="rounded-md border border-line bg-subtle p-3 text-sm sm:col-span-2" data-insight={it.id}>
              {it.text}{it.term && <InfoTip term={it.term} instance={`${idPrefix}-${it.id}`} />}
            </li>
          )))}
        </ul>
      ) : (
        <ul class="mt-3 space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.id} class="flex gap-2" data-insight={it.id}>
              <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-muted" aria-hidden="true" style={{ background: 'var(--fg-muted)' }} />
              <span>{it.text}{it.term && <InfoTip term={it.term} instance={`${idPrefix}-${it.id}`} />}</span>
            </li>
          ))}
        </ul>
      )}

      {caveats.length > 0 && (
        <ul class="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
          {caveats.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
    </section>
  );
}
