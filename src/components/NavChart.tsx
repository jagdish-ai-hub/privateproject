import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { addMonths, formatIso } from '../lib/calc/dates.ts';
import { periodReturn } from '../lib/calc/returns.ts';
import { indexOnOrBefore } from '../lib/calc/series.ts';
import { formatNav, formatPct, signClass } from '../lib/format.ts';
import { readTheme, type ChartTheme } from '../lib/chart/colors.ts';
import { InfoTip } from './InfoTip.tsx';
import { dropFromPeak, windowStats, withAlpha } from '../lib/chart/stats.ts';

interface Props {
  /** URL of the fund's chart data file, e.g. `/data/nav/122639.json` (`{ d: days[], n: navs[] }`). */
  src: string;
  /** Fund name, used as the accessible label. */
  name: string;
}

interface InnerProps {
  days: number[];
  navs: number[];
  name: string;
}

const RANGES = [
  { label: '1M', months: 1 }, { label: '3M', months: 3 }, { label: '6M', months: 6 },
  { label: '1Y', months: 12 }, { label: '3Y', months: 36 }, { label: '5Y', months: 60 }, { label: 'Max', months: 0 },
] as const;

/**
 * Loads a fund's chart data and shows the chart. While loading it shows a skeleton of the same
 * size (no layout jump); if the file cannot be fetched it shows an error with a Retry button.
 *
 * @param props - Data URL and fund name.
 * @returns The chart block.
 */
export function NavChart({ src, name }: Props) {
  const [data, setData] = useState<{ d: number[]; n: number[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetch(src)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ d: number[]; n: number[] }>; })
      .then((j) => { if (!cancelled) setData(j); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [src, attempt]);

  if (failed) {
    return (
      <div role="alert" class="grid h-80 place-items-center rounded-md border border-line text-center">
        <div>
          <p class="text-sm text-muted">The chart data could not be loaded.</p>
          <button type="button" onClick={() => setAttempt((a) => a + 1)} class="mt-3 h-9 rounded-md bg-accent px-4 text-sm text-accent-fg">Retry</button>
        </div>
      </div>
    );
  }
  if (!data) return <div class="skeleton h-80 w-full" aria-busy="true" aria-label="Loading chart" />;
  return <NavChartInner days={data.d} navs={data.n} name={name} />;
}

/** Short date such as "04 Sep 2026" from a day number. */
const dateText = (day: number): string => new Date(day * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

type View = 'price' | 'drop';
interface Tip { x: number; day: number; value: number; /** True when the line is in the upper half, so the card sits below it. */ low: boolean }

/**
 * NAV history chart (TradingView lightweight-charts, loaded lazily on the client).
 *
 * Price view: an area chart drawn against the NAV at the start of the chosen period, green above
 * it and red below, so "did this fund make money over the period" is visible at a glance. Drop view:
 * how far the NAV sat below its highest point so far, which shows the worst stretches.
 *
 * The % change shown for each range comes from the same `periodReturn` function the returns
 * table uses, run on the same NAV points, so the two can never disagree. Ranges the fund is
 * too young for are disabled rather than showing a partial figure.
 */
function NavChartInner({ days, navs, name }: InnerProps) {
  const box = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<number>(12);
  const [view, setView] = useState<View>('price');
  // The chart library loads asynchronously; these refs make it use the *latest* range and view, not the
  // ones captured when the effect started (which caused a stale-range race).
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const viewRef = useRef(view);
  viewRef.current = view;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tip, setTip] = useState<Tip | null>(null);
  const api = useRef<{ render: (v: View, m: number) => void; retheme: () => void } | null>(null);

  const series = useMemo(() => ({ days, navs }), [days, navs]);
  const last = days[days.length - 1];
  const available = (m: number): boolean => m === 0 || indexOnOrBefore(series, addMonths(last, -m)) >= 0;
  // Default to the longest standard range the fund supports, up to 5Y.
  useEffect(() => { const pick = [60, 36, 12, 6, 3, 1].find((m) => available(m)); if (pick) setRange(pick); }, []);

  const startIdxFor = (m: number): number => (m === 0 ? 0 : Math.max(0, indexOnOrBefore(series, addMonths(last, -m))));

  useEffect(() => {
    let disposed = false;
    let cleanup = (): void => {};
    import('lightweight-charts')
      .then(({ createChart, BaselineSeries, AreaSeries, ColorType, CrosshairMode, LineStyle, createSeriesMarkers }) => {
        if (disposed || !box.current) return;
        let th: ChartTheme = readTheme();
        const chart = createChart(box.current, {
          autoSize: true,
          layout: { background: { type: ColorType.Solid, color: th.bg }, textColor: th.muted, fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 12, attributionLogo: false },
          grid: { vertLines: { visible: false }, horzLines: { color: th.grid } },
          rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.14, bottom: 0.1 } },
          timeScale: { borderVisible: false, rightOffset: 2, minBarSpacing: 0.02 },
          crosshair: { mode: CrosshairMode.Magnet, vertLine: { color: th.muted, width: 1, style: LineStyle.Solid, labelVisible: false }, horzLine: { visible: false, labelVisible: false } },
          handleScale: { mouseWheel: false },
          handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
        });
        let active: { api: ReturnType<typeof chart.addSeries>; markers?: { detach: () => void } } | null = null;

        const render = (v: View, m: number): void => {
          if (active) { active.markers?.detach(); chart.removeSeries(active.api); active = null; }
          const startIdx = startIdxFor(m);
          const w = windowStats(days, navs, startIdx);
          if (!w) return;
          if (v === 'price') {
            const s = chart.addSeries(BaselineSeries, {
              baseValue: { type: 'price', price: w.start.nav },
              topLineColor: th.pos, topFillColor1: withAlpha(th.pos, 0.28), topFillColor2: withAlpha(th.pos, 0.03),
              bottomLineColor: th.neg, bottomFillColor1: withAlpha(th.neg, 0.03), bottomFillColor2: withAlpha(th.neg, 0.28),
              lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
              priceFormat: { type: 'custom', minMove: 0.01, formatter: (n: number) => n.toFixed(2) },
            });
            s.setData(days.map((d, i) => ({ time: formatIso(d) as never, value: navs[i] })));
            s.createPriceLine({ price: w.start.nav, color: th.muted, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
            const marks = [w.high, w.low]
              .filter((p, i, a) => p.day !== w.end.day && (i === 0 || p.day !== a[0].day))
              // A label near either edge would be cut off, so those extremes get a dot only (the strip below has the value).
              .map((p, i) => {
                const f = (p.day - w.start.day) / Math.max(1, w.end.day - w.start.day);
                return { time: formatIso(p.day) as never, position: i === 0 ? ('aboveBar' as const) : ('belowBar' as const), shape: 'circle' as const, color: th.muted, size: 0.6, text: f < 0.14 || f > 0.86 ? '' : `${i === 0 ? 'High' : 'Low'} ${p.nav.toFixed(2)}` };
              })
              .sort((a, b) => String(a.time).localeCompare(String(b.time)));
            active = { api: s, markers: createSeriesMarkers(s, marks) };
          } else {
            const pts = dropFromPeak(days, navs, startIdx);
            const s = chart.addSeries(AreaSeries, {
              lineColor: th.neg, topColor: withAlpha(th.neg, 0.02), bottomColor: withAlpha(th.neg, 0.26), lineWidth: 2,
              invertFilledArea: true, priceLineVisible: false, lastValueVisible: true,
              priceFormat: { type: 'custom', minMove: 0.001, formatter: (n: number) => `${(n * 100).toFixed(1)}%` },
            });
            s.setData(pts.map((p) => ({ time: formatIso(p.day) as never, value: p.value })));
            active = { api: s };
          }
          chart.timeScale().setVisibleRange({ from: formatIso(days[startIdx]) as never, to: formatIso(last) as never });
        };

        // Mirror the chart's real visible range into data attributes (used by tests and handy for debugging).
        const toText = (t: unknown): string => (typeof t === 'object' && t !== null ? `${(t as { year: number }).year}-${String((t as { month: number }).month).padStart(2, '0')}-${String((t as { day: number }).day).padStart(2, '0')}` : String(t));
        chart.timeScale().subscribeVisibleTimeRangeChange((r) => {
          if (r && box.current) { box.current.dataset.visibleFrom = toText(r.from); box.current.dataset.visibleTo = toText(r.to); }
        });
        chart.subscribeCrosshairMove((p) => {
          if (!active || !p.time || !p.point) { setTip(null); return; }
          const pt = p.seriesData.get(active.api) as { value?: number } | undefined;
          if (!pt || pt.value === undefined) { setTip(null); return; }
          const y = active.api.priceToCoordinate(pt.value);
          const h = box.current?.clientHeight ?? 320;
          setTip({ x: p.point.x, day: Math.round(Date.parse(String(p.time)) / 86_400_000), value: pt.value, low: y !== null && y < h / 2 });
        });
        api.current = {
          render: (v, m) => render(v, m),
          retheme: () => {
            th = readTheme();
            chart.applyOptions({ layout: { background: { type: ColorType.Solid, color: th.bg }, textColor: th.muted }, grid: { horzLines: { color: th.grid } }, crosshair: { vertLine: { color: th.muted } } });
            render(viewRef.current, rangeRef.current);
          },
        };
        const mo = new MutationObserver(() => api.current?.retheme());
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        cleanup = () => { mo.disconnect(); chart.remove(); api.current = null; };
        render(viewRef.current, rangeRef.current);
        setStatus('ready');
      })
      .catch(() => { if (!disposed) setStatus('error'); });
    return () => { disposed = true; cleanup(); };
  }, [days, navs]);

  useEffect(() => { api.current?.render(view, range); setTip(null); }, [range, view]);

  const change = range === 0 ? null : periodReturn(series, range);
  const fullSpan = ((last - days[0]) / 365.25).toFixed(1);
  const win = windowStats(days, navs, startIdxFor(range));
  const shownChange = range === 0 && win ? win.end.nav / win.start.nav - 1 : null;
  const width = box.current?.clientWidth ?? 600;
  const tipLeft = tip ? (tip.x > width / 2 ? tip.x - 176 : tip.x + 14) : 0;
  const vsStart = tip && win && view === 'price' ? tip.value / win.start.nav - 1 : null;

  return (
    <div>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div role="group" aria-label="Chart range" class="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.label} type="button" disabled={!available(r.months)} aria-pressed={range === r.months}
                onClick={() => setRange(r.months)}
                class={`h-8 min-w-10 rounded-md border px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${range === r.months ? 'border-accent bg-accent text-accent-fg' : 'border-line hover:bg-subtle'}`}
              >{r.label}</button>
            ))}
          </div>
          <div role="group" aria-label="Chart type" class="flex gap-1">
            {([['price', 'Price'], ['drop', 'Drop from peak']] as const).map(([k, label]) => (
              <button
                key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}
                class={`h-8 rounded-md border px-2.5 text-sm ${view === k ? 'border-fg bg-subtle font-medium' : 'border-line text-muted hover:bg-subtle'}`}
              >{label}</button>
            ))}
            {view === 'drop' && <InfoTip term="dropChart" />}
          </div>
        </div>
        <p class="num text-sm" aria-live="polite">
          {tip
            ? <>{dateText(tip.day)} · {view === 'price' ? `NAV ${formatNav(tip.value)}` : `${(tip.value * 100).toFixed(1)}% from peak`}</>
            : change
              ? <><span class={signClass(change.value)}>{formatPct(change.value)}</span><span class="text-muted"> {change.annualised ? 'a year (CAGR)' : 'over the period'}</span></>
              : shownChange !== null
                ? <><span class={signClass(shownChange)}>{formatPct(shownChange)}</span><span class="text-muted"> since launch ({fullSpan} yrs)</span></>
                : null}
        </p>
      </div>
      <div class="relative h-80 w-full rounded-md border border-line">
        <div ref={box} class="absolute inset-0" role="img" aria-label={`${view === 'price' ? 'NAV history' : 'Drop from peak'} chart for ${name}`} />
        {tip && (
          <div class={`pointer-events-none absolute z-10 w-40 rounded-md border border-line bg-bg px-3 py-2 text-xs shadow-sm ${tip.low ? 'bottom-10' : 'top-3'}`} style={{ left: `${Math.max(4, Math.min(tipLeft, width - 164))}px` }} data-testid="chart-tip">
            <p class="text-muted">{dateText(tip.day)}</p>
            {view === 'price'
              ? <>
                  <p class="num mt-0.5 text-base font-semibold">₹{formatNav(tip.value)}</p>
                  {vsStart !== null && <p class={`num mt-0.5 ${signClass(vsStart)}`}>{formatPct(vsStart)} <span class="text-muted">vs start</span></p>}
                </>
              : <p class={`num mt-0.5 text-base font-semibold ${signClass(tip.value)}`}>{(tip.value * 100).toFixed(1)}%<span class="ml-1 text-xs font-normal text-muted">from peak</span></p>}
          </div>
        )}
        {status === 'loading' && <div class="skeleton absolute inset-0" aria-hidden="true" />}
        {status === 'error' && <p class="absolute inset-0 grid place-items-center text-sm text-muted">The chart could not be loaded. Reload the page to try again.</p>}
      </div>
      {win && (
        <dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4" data-testid="chart-stats">
          {[
            ['Start of period', win.start], ['Latest', win.end], ['Highest', win.high], ['Lowest', win.low],
          ].map(([label, p]) => (
            <div key={label as string}>
              <dt class="text-xs text-muted">{label as string}</dt>
              <dd class="num text-left">₹{formatNav((p as { nav: number }).nav)} <span class="text-xs text-muted">{dateText((p as { day: number }).day)}</span></dd>
            </div>
          ))}
        </dl>
      )}
      <p class="mt-2 text-xs text-muted">
        {view === 'price' ? 'Green is above the NAV at the start of the period, red below it. ' : 'Shows how far the NAV was below its previous high; 0% means a new high. '}
        Older history is thinned for speed, so a single day's extreme can differ slightly from the tables.
      </p>
    </div>
  );
}
