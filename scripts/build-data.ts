/**
 * Data pipeline: AMFI NAVAll.txt + MFapi history -> `public/data/screener.json` and
 * `data/generated/nav/{code}.json`.
 *
 * Usage:
 *   node scripts/build-data.ts [--limit=N] [--concurrency=5] [--offline] [--amc=Name]
 *
 * - `--limit=N`   only process the first N active schemes (development)
 * - `--offline`   reuse `data/cache/NAVAll.txt` instead of downloading it
 * - `--amc=Name`  only schemes whose fund house contains Name (development)
 *
 * The first run downloads full history for every active scheme (resumable: finished
 * schemes are cached in `data/cache/nav/`). Later runs only append the newest NAV.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseNavAll, type AmfiScheme } from './pipeline/amfi.ts';
import { classifyCategory, classifyOption, classifyPlan, resolveName } from './pipeline/classify.ts';
import { chartSeries } from './pipeline/chart.ts';
import { fetchJson, getHistory, MFAPI, pool } from './pipeline/history.ts';
import { computeMetrics, METRIC_KEYS, rankDescending, type Metrics } from './pipeline/metrics.ts';
import { formatIso } from '../src/lib/calc/dates.ts';
import { adjustForSplits } from '../src/lib/calc/splits.ts';

const NAVALL_URL = 'https://portal.amfiindia.com/spages/NAVAll.txt';
const CACHE_DIR = 'data/cache';
const OUT_PUBLIC = 'public/data';
const OUT_NAV = 'data/generated/nav';

/** A scheme is active if its NAV is at most this many days older than the newest NAV. */
const ACTIVE_WITHIN_DAYS = 10;

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'] as const;
}));

/**
 * Download NAVAll.txt (or read the cached copy with `--offline`).
 *
 * @returns File contents.
 */
async function loadNavAll(): Promise<string> {
  const cached = `${CACHE_DIR}/NAVAll.txt`;
  if (args.has('offline') && existsSync(cached)) return readFileSync(cached, 'utf8');
  const res = await fetch(NAVALL_URL, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`NAVAll.txt: HTTP ${res.status}`);
  const text = await res.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cached, text);
  return text;
}

/**
 * MFapi's full scheme list as a code -> full name map (cached for `--offline`).
 *
 * @returns The map; empty if the list cannot be fetched (names then fall back to AMFI columns).
 */
async function loadMfapiNames(): Promise<Map<number, string>> {
  const cached = `${CACHE_DIR}/mf-list.json`;
  let list: { schemeCode: number; schemeName: string }[] | null = null;
  if (args.has('offline') && existsSync(cached)) list = JSON.parse(readFileSync(cached, 'utf8'));
  else {
    try {
      list = await fetchJson<{ schemeCode: number; schemeName: string }[]>(`${MFAPI}/mf`, { timeoutMs: 90_000 });
      if (list) { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(cached, JSON.stringify(list)); }
    } catch (e) { console.warn(`  could not fetch MFapi scheme list: ${String(e)}`); }
  }
  return new Map((list ?? []).map((x) => [x.schemeCode, x.schemeName]));
}

/** Round to `dp` decimals; keeps `null`. */
const round = (v: number | null, dp: number): number | null => (v === null ? null : Math.round(v * 10 ** dp) / 10 ** dp);

/**
 * Pipeline entry point.
 *
 * @returns Resolves when all files are written.
 */
async function main(): Promise<void> {
  const started = Date.now();
  const all = parseNavAll(await loadNavAll());
  const today = Math.floor(Date.now() / 86_400_000);
  const newest = Math.max(...all.filter((s) => s.navDay <= today).map((s) => s.navDay));
  const future = all.filter((s) => s.navDay > today);
  let active = all.filter((s) => s.navDay <= newest && newest - s.navDay <= ACTIVE_WITHIN_DAYS);
  // "As of" label = the date most schemes report. Mid-day the newest date is only a partial update.
  const perDay = new Map<number, number>();
  for (const s of active) perDay.set(s.navDay, (perDay.get(s.navDay) ?? 0) + 1);
  const asOf = [...perDay].sort((a, b) => b[1] - a[1])[0][0];
  if (args.has('amc')) active = active.filter((s) => s.amc.includes(args.get('amc') as string));
  if (args.has('limit')) active = active.slice(0, Number(args.get('limit')));
  console.log(`parsed ${all.length} rows; as-of ${formatIso(asOf)}; active ${active.length}; future-dated (excluded) ${future.length}`);

  const concurrency = Number(args.get('concurrency') ?? 5);
  const { results, errors } = await pool(
    active,
    concurrency,
    async (s: AmfiScheme) => getHistory(s.code, `${CACHE_DIR}/nav/${s.code}.json.gz`, { day: s.navDay, nav: s.nav }),
    (done, total) => { if (done % 250 === 0 || done === total) console.log(`  history ${done}/${total}`); },
  );
  if (errors.length) console.warn(`  ${errors.length} schemes failed to download (skipped); first: ${String(errors[0].error)}`);

  const mfNames = await loadMfapiNames();
  console.log(`  MFapi names loaded: ${mfNames.size}`);
  interface Row { s: AmfiScheme; fullName: string; m: Metrics; inception: number; adj: 0 | 1 | 2; cls: ReturnType<typeof classifyCategory>; plan: string; option: string }
  const rows: Row[] = [];
  const noHistory: number[] = [];
  let spikeCount = 0;
  mkdirSync(OUT_NAV, { recursive: true });
  active.forEach((s, i) => {
    const series = results[i];
    if (!series || series.days.length < 2) { noHistory.push(s.code); return; }
    const cls = classifyCategory(s.rawCategory);
    const fullName = resolveName(s.name, s.planCol, s.optionCol, mfNames.get(s.code));
    // Unit splits (ETFs, some liquid funds) would read as huge crashes: adjust before any maths.
    const adjusted = adjustForSplits(series);
    const clean = adjusted.series;
    if (adjusted.spikes.length) spikeCount += adjusted.spikes.length;
    rows.push({
      s, fullName, m: computeMetrics(clean), inception: series.days[0], adj: adjusted.trimmed ? 2 : adjusted.splits.length ? 1 : 0, cls,
      plan: classifyPlan(s.planCol, fullName, cls.assetClass, series.days[0]),
      option: classifyOption(s.optionCol, fullName, s.isinGrowth === null && s.isinReinvest !== null),
    });
    const cs = chartSeries(clean);
    writeFileSync(`${OUT_NAV}/${s.code}.json`, JSON.stringify({
      d: cs.days, n: cs.navs,
      splits: adjusted.splits.map((x) => [x.day, x.factor]), breaks: adjusted.breaks.map((x) => [x.day, x.ratio]), spikes: adjusted.spikes,
    }));
  });

  // Peer ranks: same category + plan + option, for 1Y / 3Y / 5Y returns.
  const groups = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const key = `${r.cls.category}|${r.plan}|${r.option}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  const rankKeys = ['r1y', 'r3y', 'r5y'] as const;
  const ranks = Object.fromEntries(rankKeys.flatMap((k) => [[`${k}Rank`, new Array(rows.length).fill(null)], [`${k}Of`, new Array(rows.length).fill(0)]])) as Record<string, (number | null)[]>;
  for (const idxs of groups.values()) {
    for (const k of rankKeys) {
      rankDescending(idxs.map((i) => rows[i].m[k])).forEach((rk, j) => {
        ranks[`${k}Rank`][idxs[j]] = rk.rank;
        ranks[`${k}Of`][idxs[j]] = rk.of;
      });
    }
  }

  const dict = (f: (r: Row) => string): { list: string[]; idx: number[] } => {
    const list = [...new Set(rows.map(f))].sort();
    return { list, idx: rows.map((r) => list.indexOf(f(r))) };
  };
  const amc = dict((r) => r.s.amc);
  const category = dict((r) => r.cls.category);
  const assetClass = dict((r) => r.cls.assetClass);
  const plan = dict((r) => r.plan);
  const option = dict((r) => r.option);
  const schemeType = dict((r) => r.cls.schemeType);

  const metrics = Object.fromEntries(METRIC_KEYS.map((k) => [k, rows.map((r) => round(r.m[k], k.startsWith('sharpe') || k.startsWith('sortino') ? 3 : 4))]));
  const out = {
    asOf: formatIso(asOf),
    generatedAt: new Date().toISOString(),
    count: rows.length,
    dict: { amc: amc.list, category: category.list, assetClass: assetClass.list, plan: plan.list, option: option.list, schemeType: schemeType.list },
    code: rows.map((r) => r.s.code),
    name: rows.map((r) => r.fullName),
    amc: amc.idx, category: category.idx, assetClass: assetClass.idx, plan: plan.idx, option: option.idx, schemeType: schemeType.idx,
    nav: rows.map((r) => r.s.nav),
    navDate: rows.map((r) => r.s.navDay),
    inception: rows.map((r) => r.inception),
    adj: rows.map((r) => r.adj),
    metrics,
    ranks,
  };
  mkdirSync(OUT_PUBLIC, { recursive: true });
  writeFileSync(`${OUT_PUBLIC}/screener.json`, JSON.stringify(out));
  // Fields only the static pages need stay out of the file every visitor downloads.
  mkdirSync('data/generated', { recursive: true });
  writeFileSync('data/generated/extra.json', JSON.stringify({ isin: rows.map((r) => r.s.isinGrowth ?? r.s.isinReinvest) }));

  // Sanity report: suspicious values usually mean bad source data, not real performance.
  const adjustedCount = rows.filter((r) => r.adj === 1).length;
  const trimmedCount = rows.filter((r) => r.adj === 2).length;
  const suspicious = rows.filter((r) => (r.m.r1y !== null && Math.abs(r.m.r1y) > 3) || (r.m.mdd3y !== null && r.m.mdd3y < -0.9)).map((r) => ({ code: r.s.code, name: r.fullName, r1y: r.m.r1y, mdd3y: r.m.mdd3y }));
  mkdirSync('data/generated', { recursive: true });
  writeFileSync('data/generated/report.json', JSON.stringify({ asOf: out.asOf, count: rows.length, noHistory, futureDated: future.length, failed: errors.length, splitAdjusted: adjustedCount, trimmedAtBreak: trimmedCount, spikePointsRemoved: spikeCount, suspicious }, null, 1));
  console.log(`wrote ${rows.length} schemes; split-adjusted ${adjustedCount}; trimmed ${trimmedCount}; spike points removed ${spikeCount}; no-history ${noHistory.length}; suspicious ${suspicious.length}; ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
