import { useEffect, useRef, useState } from 'preact/hooks';
import { formatIso } from '../../lib/calc/dates.ts';
import { readTheme } from '../../lib/chart/colors.ts';
import { shortName, type CompareLine } from '../../lib/compare.ts';
import { formatPct, signClass } from '../../lib/format.ts';

/** A line plus what the chart needs to draw and label it. */
export type ChartLine = CompareLine & { name: string; slot: number };

interface Props {
  lines: ChartLine[];
}

type Mode = 'rebased' | 'rupees';
const LAKH = 1000; // rebased 100 = Rs 1,00,000 invested

/**
 * A line's value on `day`: its latest point on or before that day (funds publish on different days,
 * so an exact match is not guaranteed). `null` before the line starts.
 */
export function valueOn(line: { days: number[]; values: number[] }, day: number): number | null {
  let lo = 0;
  let hi = line.days.length - 1;
  if (hi < 0 || day < line.days[0]) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (line.days[mid] <= day) lo = mid; else hi = mid - 1;
  }
  return line.values[lo];
}

const rupees = (v: number): string => `₹${Math.round(v).toLocaleString('en-IN')}`;
const axisRupees = (v: number): string => (v >= 100_000 ? `₹${(v / 100_000).toFixed(2).replace(/\.?0+$/, '')}L` : `₹${Math.round(v / 1000)}K`);
const dateText = (day: number): string => new Date(day * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * Multi-line chart of rebased NAVs. Every fund starts at 100 (or ₹1,00,000 in the other mode) on the
 * same day, so the lines show growth of the same amount invested.
 *
 * Each fund keeps one colour for as long as it is selected (the colour slot is decided by the parent),
 * lines are 2px with the value on the end of each line, and hovering shows every fund's value at that date.
 */
export function CompareChart({ lines }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mode, setMode] = useState<Mode>('rebased');
  const [tip, setTip] = useState<{ x: number; day: number } | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    let cleanup = (): void => {};
    import('lightweight-charts')
      .then(({ createChart, LineSeries, ColorType, LineStyle, CrosshairMode }) => {
        if (disposed || !box.current) return;
        const th = readTheme();
        const k = mode === 'rupees' ? LAKH : 1;
        const chart = createChart(box.current, {
          autoSize: true,
          layout: { background: { type: ColorType.Solid, color: th.bg }, textColor: th.muted, fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 12, attributionLogo: false },
          grid: { vertLines: { visible: false }, horzLines: { color: th.grid } },
          rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.08 } },
          // minBarSpacing: the default (0.5px per point) cannot fit 5 years of daily NAVs into a phone-width chart and silently cuts off the oldest part.
          timeScale: { borderVisible: false, rightOffset: 2, minBarSpacing: 0.02 },
          crosshair: { mode: CrosshairMode.Normal, vertLine: { color: th.muted, width: 1, style: LineStyle.Solid, labelVisible: false }, horzLine: { visible: false, labelVisible: false } },
          handleScale: { mouseWheel: false },
          handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
        });
        lines.forEach((l, i) => {
          const s = chart.addSeries(LineSeries, {
            color: th.series[l.slot % th.series.length], lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
            priceFormat: { type: 'custom', minMove: 0.1, formatter: (n: number) => (mode === 'rupees' ? axisRupees(n) : n.toFixed(0)) },
          });
          s.setData(l.days.map((d, j) => ({ time: formatIso(d) as never, value: l.values[j] * k })));
          if (i === 0) s.createPriceLine({ price: 100 * k, color: th.muted, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
        });
        chart.timeScale().fitContent();
        // Mirror the chart's real visible range into data attributes (used by tests and handy for debugging).
        const toText = (t: unknown): string => (typeof t === 'object' && t !== null ? `${(t as { year: number }).year}-${String((t as { month: number }).month).padStart(2, '0')}-${String((t as { day: number }).day).padStart(2, '0')}` : String(t));
        chart.timeScale().subscribeVisibleTimeRangeChange((r) => {
          if (r && box.current) { box.current.dataset.visibleFrom = toText(r.from); box.current.dataset.visibleTo = toText(r.to); }
        });
        chart.subscribeCrosshairMove((p) => {
          if (!p.time || !p.point) { setTip(null); return; }
          const day = Math.round(Date.parse(String(p.time)) / 86_400_000);
          setTip({ x: p.point.x, day });
        });
        // The chart is fitted once, but the container can still change width after that (phone layout,
        // scrollbar); without a refit the left part of the window ends up off-screen.
        const ro = new ResizeObserver(() => chart.timeScale().fitContent());
        ro.observe(box.current);
        cleanup = () => { ro.disconnect(); chart.remove(); };
        setStatus('ready');
      })
      .catch(() => { if (!disposed) setStatus('error'); });
    return () => { disposed = true; cleanup(); };
  }, [lines, themeTick, mode]);

  const k = mode === 'rupees' ? LAKH : 1;
  const fmt = (v: number | null): string => (v === null ? '—' : mode === 'rupees' ? rupees(v) : v.toFixed(1));
  const width = box.current?.clientWidth ?? 600;
  const tipW = 200;
  const tipLeft = tip ? Math.max(4, Math.min(tip.x > width / 2 ? tip.x - tipW - 14 : tip.x + 14, width - tipW - 4)) : 0;

  return (
    <div>
      <div class="mb-2 flex justify-end">
        <div role="group" aria-label="Chart units" class="flex shrink-0 gap-1">
          {([['rebased', 'Rebased to 100'], ['rupees', '₹1 lakh invested']] as const).map(([m, label]) => (
            <button
              key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
              class={`h-8 rounded-md border px-2.5 text-sm ${mode === m ? 'border-fg bg-subtle font-medium' : 'border-line text-muted hover:bg-subtle'}`}
            >{label}</button>
          ))}
        </div>
      </div>
      <div class="mb-2">
        <ul class="flex min-w-0 flex-col gap-y-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5" aria-label="Legend">
          {lines.map((l) => {
            const raw = tip ? valueOn(l, tip.day) : l.values[l.values.length - 1];
            const v = raw === null ? null : raw * k;
            return (
              <li key={l.code} class="flex max-w-full items-center gap-2">
                <svg class="shrink-0" width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke={`var(--s${(l.slot % 4) + 1})`} stroke-width="2" stroke-linecap="round" /></svg>
                <span class="min-w-0 truncate" title={l.name}>{l.name}</span>
                <span class="num shrink-0 font-medium" data-testid="legend-value">{fmt(v)}</span>
                {!tip && <span class={`num shrink-0 text-xs ${signClass(l.change)}`}>{formatPct(l.change, 1)}</span>}
              </li>
            );
          })}
        </ul>
      </div>
      <div class="relative h-96 w-full rounded-md border border-line">
        <div ref={box} class="absolute inset-0" role="img" aria-label="Growth comparison chart: every fund starts at the same value" data-compare-chart />
        {tip && (
          <div class="pointer-events-none absolute top-3 z-10 rounded-md border border-line bg-bg px-3 py-2 text-xs shadow-sm" style={{ left: `${tipLeft}px`, width: `${tipW}px` }} data-testid="chart-tip">
            <p class="text-muted">{dateText(tip.day)}</p>
            <ul class="mt-1 space-y-1">
              {lines.map((l) => (
                <li key={l.code} class="flex items-center gap-2">
                  <svg class="shrink-0" width="14" height="6" aria-hidden="true"><line x1="0" y1="3" x2="14" y2="3" stroke={`var(--s${(l.slot % 4) + 1})`} stroke-width="2" stroke-linecap="round" /></svg>
                  <span class="min-w-0 flex-1 truncate text-muted">{shortName(l.name)}</span>
                  <span class="num shrink-0 text-sm font-semibold">{fmt((() => { const r = valueOn(l, tip.day); return r === null ? null : r * k; })())}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {status === 'loading' && <div class="skeleton absolute inset-0" aria-hidden="true" />}
        {status === 'error' && <p class="absolute inset-0 grid place-items-center text-sm text-muted">The chart could not be loaded.</p>}
      </div>
      <p class="mt-2 text-xs text-muted">
        {mode === 'rebased'
          ? 'Every fund is scaled to 100 on the first day of the window, so the lines show growth of the same amount invested. '
          : 'Shows what ₹1,00,000 invested on the first day of the window would have grown to, before tax and exit load. '}
        Past performance is not indicative of future returns.
      </p>
    </div>
  );
}
