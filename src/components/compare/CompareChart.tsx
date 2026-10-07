import { useEffect, useRef, useState } from 'preact/hooks';
import { formatIso } from '../../lib/calc/dates.ts';
import type { CompareLine } from '../../lib/compare.ts';

interface Props {
  lines: (CompareLine & { name: string })[];
}

/** Theme colours for up to four lines: ink, one accent, then two greys with dash styles. */
function lineStyles(): { color: string; style: 0 | 2 | 1 }[] {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string): string => cs.getPropertyValue(n).trim();
  return [{ color: v('--chart-line'), style: 0 }, { color: v('--focus'), style: 0 }, { color: v('--fg-muted'), style: 2 }, { color: v('--fg-muted'), style: 1 }];
}

/**
 * Multi-line chart of rebased NAVs (every fund starts at 100). Lines differ by colour *and*
 * dash style so they stay distinguishable without colour. Rebuilt when the lines or theme change.
 */
export function CompareChart({ lines }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hover, setHover] = useState<{ day: number; values: (number | null)[] } | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  const styles = typeof document === 'undefined' ? [] : lineStyles();

  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    let cleanup = (): void => {};
    import('lightweight-charts')
      .then(({ createChart, LineSeries, ColorType, LineStyle }) => {
        if (disposed || !box.current) return;
        const cs = getComputedStyle(document.documentElement);
        const v = (n: string): string => cs.getPropertyValue(n).trim();
        const chart = createChart(box.current, {
          autoSize: true,
          layout: { background: { type: ColorType.Solid, color: v('--bg') }, textColor: v('--fg-muted'), fontFamily: 'Geist Mono, ui-monospace, monospace', attributionLogo: false },
          grid: { vertLines: { color: v('--chart-grid') }, horzLines: { color: v('--chart-grid') } },
          rightPriceScale: { borderVisible: false },
          timeScale: { borderVisible: false },
        });
        const st = lineStyles();
        const dash = [LineStyle.Solid, LineStyle.Solid, LineStyle.Dashed, LineStyle.Dotted];
        const all = lines.map((l, i) => {
          const s = chart.addSeries(LineSeries, { color: st[i].color, lineWidth: 2, lineStyle: dash[i], priceLineVisible: false, lastValueVisible: false });
          s.setData(l.days.map((d, k) => ({ time: formatIso(d), value: l.values[k] })));
          return s;
        });
        chart.timeScale().fitContent();
        chart.subscribeCrosshairMove((p) => {
          if (!p.time) { setHover(null); return; }
          const day = Math.round(Date.parse(String(p.time)) / 86_400_000);
          setHover({ day, values: all.map((s) => (p.seriesData.get(s) as { value?: number } | undefined)?.value ?? null) });
        });
        cleanup = () => chart.remove();
        setStatus('ready');
      })
      .catch(() => { if (!disposed) setStatus('error'); });
    return () => { disposed = true; cleanup(); };
  }, [lines, themeTick]);

  return (
    <div>
      <ul class="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legend">
        {lines.map((l, i) => (
          <li key={l.code} class="flex max-w-full items-center gap-2">
            <svg class="shrink-0" width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke={styles[i]?.color} stroke-width="2" stroke-dasharray={['', '', '5 3', '1.5 3'][i]} /></svg>
            <span class="min-w-0 truncate" title={l.name}>{l.name}</span>
            <span class="num shrink-0 text-muted">{hover ? (hover.values[i] === null ? '—' : (hover.values[i] as number).toFixed(1)) : (100 * (1 + l.change)).toFixed(1)}</span>
          </li>
        ))}
      </ul>
      <div class="relative h-96 w-full rounded-md border border-line">
        <div ref={box} class="absolute inset-0" role="img" aria-label="Rebased NAV comparison chart: every fund starts at 100" data-compare-chart />
        {status === 'loading' && <div class="skeleton absolute inset-0" aria-hidden="true" />}
        {status === 'error' && <p class="absolute inset-0 grid place-items-center text-sm text-muted">The chart could not be loaded.</p>}
      </div>
      <p class="mt-2 text-xs text-muted">Every fund is scaled to 100 on the first day of the window, so the lines show growth of the same amount invested. Past performance is not indicative of future returns.</p>
    </div>
  );
}
