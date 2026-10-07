import type { Insight } from '../lib/insights.ts';
import { InfoTip } from './InfoTip.tsx';

interface Props {
  title: string;
  /** One-sentence summary shown first, or null. */
  headline?: string | null;
  items: Insight[];
  caveats?: string[];
  /** Id prefix so several panels on one page keep unique popover ids. */
  idPrefix?: string;
}

/**
 * "What the numbers say": rule-based sentences about a fund or a comparison, each with an (i) that
 * explains the measure. Renders on the server too (no client directive needed).
 *
 * @param props - Title, headline, insights and caveats from `src/lib/insights.ts`.
 * @returns The panel, or nothing when there is nothing to say.
 */
export function InsightsPanel({ title, headline, items, caveats = [], idPrefix = 'ins' }: Props) {
  if (items.length === 0 && !headline) return null;
  return (
    <section class="rounded-md border border-line p-4" aria-label={title} data-testid="insights">
      <h2 class="text-base font-semibold tracking-tight">{title}</h2>
      <p class="mt-0.5 text-xs text-muted">Written from the figures in the tables on this page. Facts about the past, not advice.</p>
      {headline && <p class="mt-3 text-sm font-medium" data-testid="insights-headline">{headline}</p>}
      <ul class="mt-3 space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.id} class="flex gap-2" data-insight={it.id}>
            <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-muted" aria-hidden="true" style={{ background: 'var(--fg-muted)' }} />
            <span>{it.text}{it.term && <InfoTip term={it.term} instance={`${idPrefix}-${it.id}`} />}</span>
          </li>
        ))}
      </ul>
      {caveats.length > 0 && (
        <ul class="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
          {caveats.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
    </section>
  );
}
