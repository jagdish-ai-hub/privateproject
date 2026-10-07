# Data

## Sources

| Source | Used for | When |
| --- | --- | --- |
| AMFI `NAVAll.txt` (`https://portal.amfiindia.com/spages/NAVAll.txt`) | Scheme list, latest NAV and date, fund house, SEBI category | Every pipeline run (1 request) |
| MFapi.in `GET /mf` | Full scheme names (including plan and option) for every code | Every run (1 request, 5.7 MB) |
| MFapi.in `GET /mf/{code}` | Full NAV history of one scheme | Once per scheme ever (then cached) |
| MFapi.in `GET /mf/{code}?startDate=YYYY-MM-DD` | Only the missing days, if the cache is more than 5 days behind | Rarely |
| AMFI `GET /api/populate-mf` and `/api/populate-te-rdata-revised` | Expense ratio (TER) of the Regular and Direct plan, with its breakdown | About 300 calls on a refresh, cached per fund house for 7 days |
| AMFI `GET /api/average-aum-schemewise` | Average AUM per scheme, joined on the AMFI scheme code | 3 calls; a finished quarter is cached for good |

Visitors' browsers never call either service.

## What is missing from the free data

Exit load, fund manager, portfolio holdings, riskometer, benchmark returns, minimum SIP, ratings.
Pages show a dash rather than an estimate.

## Expense ratio (TER) and AUM

Both come straight from AMFI's website APIs (undocumented, so they can change) and are **optional**:
if a call fails the previous cached values are used and flagged stale; the build never fails because of them.

- **TER** (`pipeline/ter.ts`): per fund house, the page size is capped at 100 and a scheme has one row
  per day, so the newest `TER_Date` wins. One row carries both plans; `0.0000` means the plan does not
  exist. AMFI returns truncated JSON instead of HTTP 429 when throttled, so a JSON parse failure is retried.
  There is no scheme code, so the join (`pipeline/costs.ts`) is by fund house + normalised name + category.
  ETFs fill only one plan column, so they use whichever is filled.
- **AUM** (`pipeline/aum.ts`): AMFI gives one figure per plan/option code; `screener.json` `aum` adds them up per scheme (fund house + base name + category) as the "fund size", and `extra.json` `planAum` keeps the single plan's value. Units are ₹ lakh (divided by 100 for crore); two fields are summed; the
  newest quarter is partial, so the newest quarter with at least 5,000 rows is used.
- **Cache:** `data/cache/ter/{mfId}.json` (refreshed after 7 days) and `data/cache/aum-*.json`. Same
  store-interface idea as [CACHING.md](CACHING.md) (`TerStore`, `AumStore`).
- **Flags:** `--ter=auto|refresh|cached|skip`, `--aum=skip`, `--min-ter-coverage=0.9`.
- **Cross-checks (7 Oct 2026):** AUM equals TigZig's `aaum_cr_quarterly_avg` for all 8,034 schemes both
  report for the same quarter. TER differs from the old-format GitHub tracker for many arbitrage and quant
  funds because AMFI's total now includes statutory levies (STT), not only the base expense ratio; fund pages
  say so. Neither check is an automated test (they need third-party downloads).
- **Quality gate:** the build fails if fewer than 90% of Direct plan Growth schemes get a TER, so a
  silent AMFI change cannot ship blank columns. Measured on 6 Oct 2026: 96.8% (1,752 of 1,810);
  AUM matched 8,493 of 8,650 schemes. `report.json` lists the numbers by asset class, any unmatched fund
  house, samples of unmatched names and sanity violations (TER outside 0 to 5%, Regular below Direct).

## Pipeline (`npm run data:build`)

`scripts/build-data.ts`, with the logic in `scripts/pipeline/` and the maths in `src/lib/calc/`.

1. Download `NAVAll.txt`, parse it (`pipeline/amfi.ts`).
2. Active schemes = latest NAV at most 10 days older than the newest NAV. Future-dated NAVs are dropped.
3. Names from MFapi's list; classify category, plan and option (`pipeline/classify.ts`).
4. For each active scheme, get history through the cache (`pipeline/history.ts`, see [CACHING.md](CACHING.md)).
5. Clean the series: remove one-day glitches, adjust for unit splits, cut history at unexplained jumps
   (`src/lib/calc/splits.ts`, see [METHODOLOGY](../src/content/pages/methodology.md)).
6. Compute metrics (`pipeline/metrics.ts`) and peer ranks.
7. Write the outputs below, plus `data/generated/report.json` (counts, anything suspicious).

Flags: `--limit=N`, `--amc=Name`, `--concurrency=5`, `--rps=10`, `--offline` (reuse the cached
NAVAll.txt and scheme list), and the TER/AUM flags below.

**Running inside a sandbox with an HTTP proxy:** Node's `fetch` ignores `HTTPS_PROXY` unless you set
`NODE_USE_ENV_PROXY=1`.

## Output files

| File | Used by | Notes |
| --- | --- | --- |
| `public/data/screener.json` | The screener, compare page, all static pages | Columnar JSON, about 2.2 MB raw, about 316 KB with Brotli |
| `public/data/nav/{code}.json` | Fund page chart, compare chart | `{ d: days[], n: navs[], splits, breaks, spikes }`, last year daily, older thinned |
| `data/generated/extra.json` | Static pages only | ISINs, and each scheme's TER for both plans with its breakdown (kept out of the public file) |
| `data/generated/report.json` | You | Counts, failures, suspicious values |

### `screener.json` (columnar)

One array per field, all `count` long. Small categorical fields are integer indexes into `dict`.

```
asOf, generatedAt, count
dict: { amc[], category[], assetClass[], plan[], option[], schemeType[] }
code[], name[], amc[], category[], assetClass[], plan[], option[], schemeType[]
ter[] (percent or null), aum[] (₹ crore or null), terAsOf, aumPeriod
nav[], navDate[] (day numbers), inception[] (day numbers), adj[] (0 none, 1 split-adjusted, 2 trimmed)
metrics: { r1m, r3m, r6m, r1y, r3y, r5y, r10y, rInc, sip1y, sip3y, sip5y,
           vol3y, sharpe3y, sortino3y, mdd3y, roll1yPos, roll1yAvg, roll1yMin, roll3yAvg, roll3yMin }  (fractions or null)
ranks: { r1yRank, r1yOf, r3yRank, r3yOf, r5yRank, r5yOf }
```

A *day number* is days since 1970-01-01 UTC (see `src/lib/calc/dates.ts`). The type is `ScreenerData`
in `src/lib/screener/types.ts`.

## File count

The static host's limit matters: Cloudflare Pages' free plan allows 20,000 files. A full build is
about 17,000 (one page and one chart file per scheme). The pipeline warns when it gets close; if
active schemes grow past about 9,500, host `public/data/nav/` elsewhere (for example R2) or build
fewer fund pages.
