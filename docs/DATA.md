# Data

## Sources

| Source | Used for | When |
| --- | --- | --- |
| AMFI `NAVAll.txt` (`https://portal.amfiindia.com/spages/NAVAll.txt`) | Scheme list, latest NAV and date, fund house, SEBI category | Every pipeline run (1 request) |
| MFapi.in `GET /mf` | Full scheme names (including plan and option) for every code | Every run (1 request, 5.7 MB) |
| MFapi.in `GET /mf/{code}` | Full NAV history of one scheme | Once per scheme ever (then cached) |
| MFapi.in `GET /mf/{code}?startDate=YYYY-MM-DD` | Only the missing days, if the cache is more than 5 days behind | Rarely |

Visitors' browsers never call either service.

## What is missing from the free data

AUM, expense ratio, exit load, fund manager, portfolio holdings, riskometer, benchmark returns,
minimum SIP, ratings. They can be added later from other sources (AMFI publishes TER and AUM
separately); until then pages show nothing rather than an estimate.

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
NAVAll.txt and scheme list).

**Running inside a sandbox with an HTTP proxy:** Node's `fetch` ignores `HTTPS_PROXY` unless you set
`NODE_USE_ENV_PROXY=1`.

## Output files

| File | Used by | Notes |
| --- | --- | --- |
| `public/data/screener.json` | The screener, compare page, all static pages | Columnar JSON, about 2.2 MB raw, about 316 KB with Brotli |
| `public/data/nav/{code}.json` | Fund page chart, compare chart | `{ d: days[], n: navs[], splits, breaks, spikes }`, last year daily, older thinned |
| `data/generated/extra.json` | Static pages only | ISINs (kept out of the public file) |
| `data/generated/report.json` | You | Counts, failures, suspicious values |

### `screener.json` (columnar)

One array per field, all `count` long. Small categorical fields are integer indexes into `dict`.

```
asOf, generatedAt, count
dict: { amc[], category[], assetClass[], plan[], option[], schemeType[] }
code[], name[], amc[], category[], assetClass[], plan[], option[], schemeType[]
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
