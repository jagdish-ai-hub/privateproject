import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { addMonths, formatIso } from '../lib/calc/dates.ts';
import { periodReturn } from '../lib/calc/returns.ts';
import { indexOnOrBefore } from '../lib/calc/series.ts';
import { formatNav, formatPct, signClass } from '../lib/format.ts';

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

/** Read the current theme's colours from the CSS variables so the chart matches the page. */
function themeColors(): { bg: string; fg: string; muted: string; grid: string; line: string } {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string): string => cs.getPropertyValue(n).trim();
  return { bg: v('--bg'), fg: v('--fg'), muted: v('--fg-muted'), grid: v('--chart-grid'), line: v('--chart-line') };
}

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

/**
 * NAV history chart (TradingView lightweight-charts, loaded lazily on the client).
 *
 * The % change shown for each range comes from the same `periodReturn` function the returns
 * table uses, run on the same NAV points, so the two can never disagree. Ranges the fund is
 * too young for are disabled rather than showing a partial figure.
 */
function NavChartInner({ days, navs, name }: InnerProps) {
  const box = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<number>(12);
  // The chart library loads asynchronously; this ref makes it use the *latest* range, not the one
  // captured when the effect started (which caused a stale-range race).
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hover, setHover] = useState<{ day: number; nav: number } | null>(null);
  const api = useRef<{ setRange: (m: number) => void; retheme: () => void } | null>(null);

  const series = useMemo(() => ({ days, navs }), [days, navs]);
  const last = days[days.length - 1];
  const available = (m: number): boolean => m === 0 || indexOnOrBefore(series, addMonths(last, -m)) >= 0;
  // Default to the longest standard range the fund supports, up to 5Y.
  useEffect(() => { const pick = [60, 36, 12, 6, 3, 1].find((m) => available(m)); if (pick) setRange(pick); }, []);

  useEffect(() => {
    let disposed = false;
    let cleanup = (): void => {};
    import('lightweight-charts')
      .then(({ createChart, LineSeries, ColorType, CrosshairMode }) => {
        if (disposed || !box.current) return;
        const c = themeColors();
        const chart = createChart(box.current, {
          autoSize: true,
          layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.muted, fontFamily: 'Geist Mono, ui-monospace, monospace', attributionLogo: false },
          grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
          rightPriceScale: { borderVisible: false },
          timeScale: { borderVisible: false },
          crosshair: { mode: CrosshairMode.Magnet },
        });
        const line = chart.addSeries(LineSeries, { color: c.line, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
        line.setData(days.map((d, i) => ({ time: formatIso(d), value: navs[i] })));

        const show = (m: number): void => {
          const from = m === 0 ? days[0] : addMonths(last, -m);
          const startIdx = Math.max(0, indexOnOrBefore(series, from));
          chart.timeScale().setVisibleRange({ from: formatIso(days[startIdx]) as never, to: formatIso(last) as never });
        };
        // Mirror the chart's real visible range into data attributes (used by tests and handy for debugging).
        const toText = (t: unknown): string => (typeof t === 'object' && t !== null ? `${(t as { year: number }).year}-${String((t as { month: number }).month).padStart(2, '0')}-${String((t as { day: number }).day).padStart(2, '0')}` : String(t));
        chart.timeScale().subscribeVisibleTimeRangeChange((r) => {
          if (r && box.current) { box.current.dataset.visibleFrom = toText(r.from); box.current.dataset.visibleTo = toText(r.to); }
        });
        chart.subscribeCrosshairMove((p) => {
          const pt = p.seriesData.get(line) as { value?: number } | undefined;
          if (!p.time || !pt || pt.value === undefined) { setHover(null); return; }
          const day = Math.round(Date.parse(String(p.time)) / 86_400_000);
          setHover({ day, nav: pt.value });
        });
        api.current = {
          setRange: show,
          retheme: () => {
            const t = themeColors();
            chart.applyOptions({ layout: { background: { type: ColorType.Solid, color: t.bg }, textColor: t.muted }, grid: { vertLines: { color: t.grid }, horzLines: { color: t.grid } } });
            line.applyOptions({ color: t.line });
          },
        };
        const onTheme = (): void => api.current?.retheme();
        const mo = new MutationObserver(onTheme);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        cleanup = () => { mo.disconnect(); chart.remove(); api.current = null; };
        show(rangeRef.current);
        setStatus('ready');
      })
      .catch(() => { if (!disposed) setStatus('error'); });
    return () => { disposed = true; cleanup(); };
  }, [days, navs]);

  useEffect(() => { api.current?.setRange(range); }, [range]);

  const change = range === 0 ? null : periodReturn(series, range);
  const fullSpan = ((last - days[0]) / 365.25).toFixed(1);
  const first = range === 0 ? navs[0] : navs[Math.max(0, indexOnOrBefore(series, addMonths(last, -range)))];
  const shownChange = range === 0 ? navs[navs.length - 1] / first - 1 : null;

  return (
    <div>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Chart range" class="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label} type="button" disabled={!available(r.months)} aria-pressed={range === r.months}
              onClick={() => setRange(r.months)}
              class={`h-8 min-w-10 rounded-md border px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${range === r.months ? 'border-accent bg-accent text-accent-fg' : 'border-line hover:bg-subtle'}`}
            >{r.label}</button>
          ))}
        </div>
        <p class="num text-sm" aria-live="polite">
          {hover
            ? <>{new Date(hover.day * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })} · NAV {formatNav(hover.nav)}</>
            : change
              ? <><span class={signClass(change.value)}>{formatPct(change.value)}</span><span class="text-muted"> {change.annualised ? 'a year (CAGR)' : 'over the period'}</span></>
              : shownChange !== null
                ? <><span class={signClass(shownChange)}>{formatPct(shownChange)}</span><span class="text-muted"> since launch ({fullSpan} yrs)</span></>
                : null}
        </p>
      </div>
      <div class="relative h-80 w-full rounded-md border border-line">
        <div ref={box} class="absolute inset-0" role="img" aria-label={`NAV history chart for ${name}`} />
        {status === 'loading' && <div class="skeleton absolute inset-0" aria-hidden="true" />}
        {status === 'error' && <p class="absolute inset-0 grid place-items-center text-sm text-muted">The chart could not be loaded. Reload the page to try again.</p>}
      </div>
    </div>
  );
}
