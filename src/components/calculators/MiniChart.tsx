import { formatRupees } from '../../lib/format.ts';

interface Props {
  /** Year-end points. */
  rows: { year: number; invested: number; value: number }[];
}

/**
 * Small SVG chart: value (solid) vs money invested (dashed) at each year end. The same numbers
 * are in the table under the calculator, so the chart is a visual aid, not the only source.
 */
export function MiniChart({ rows }: Props) {
  if (rows.length < 2) return null;
  const W = 640;
  const H = 220;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const max = Math.max(...rows.map((r) => Math.max(r.value, r.invested))) || 1;
  const x = (i: number): number => pad.l + (i / (rows.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number): number => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const line = (key: 'value' | 'invested'): string => rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');
  const last = rows[rows.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} class="h-auto w-full" role="img" aria-label={`After ${last.year} years: invested ${formatRupees(last.invested)}, value ${formatRupees(last.value)}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--chart-grid)" />)}
        <path d={`${line('value')} L${x(rows.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--fg)" opacity="0.06" />
        <path d={line('invested')} fill="none" stroke="var(--fg-muted)" stroke-width="2" stroke-dasharray="5 4" />
        <path d={line('value')} fill="none" stroke="var(--fg)" stroke-width="2.5" />
        <text x={pad.l} y={H - 6} fill="var(--fg-muted)" font-size="11" font-family="Geist Mono, monospace">Year 1</text>
        <text x={W - pad.r} y={H - 6} fill="var(--fg-muted)" font-size="11" font-family="Geist Mono, monospace" text-anchor="end">Year {last.year}</text>
      </svg>
      <figcaption class="mt-1 flex gap-5 text-xs text-muted">
        <span><span class="mr-1.5 inline-block h-0.5 w-5 bg-fg align-middle" />Value</span>
        <span><span class="mr-1.5 inline-block w-5 border-t-2 border-dashed border-muted align-middle" />Invested</span>
      </figcaption>
    </figure>
  );
}
