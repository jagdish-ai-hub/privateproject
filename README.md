# MF Screener

A free, no-sign-up screener for Indian mutual funds, built with [Astro](https://astro.build) on
official AMFI NAV data (via [MFapi.in](https://www.mfapi.in)).

- **Screener**: every active scheme (~8,450), filter by category, plan, option, returns, SIP returns,
  volatility, drawdown; sort, paginate, share a link, export CSV.
- **Fund pages** (one per scheme): NAV chart, returns with peer rank, SIP returns, risk, rolling returns, FAQ.
- **Compare** up to four funds on a rebased chart.
- **Calculators**: SIP, step-up SIP, lumpsum, goal SIP, SWP, CAGR.
- **Guides**: 16 plain-language articles with FAQs and JSON-LD.
- Category and fund-house pages, methodology page, sitemap, light and dark themes.

Everything is static: a nightly job builds the data and the site and deploys it. There is no server
and no database.

## Quick start

Requires Node 22.18 or newer.

```bash
npm install
npm run data:build -- --limit=150   # small real dataset (full run: see below)
npm run dev                          # http://localhost:4321
```

A full data build downloads ~8,450 histories once (about 10 minutes, cached afterwards):

```bash
npm run data:build
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Build all pages into `dist/` (about 25 s for ~8,600 pages) |
| `npm run data:build` | Download AMFI and MFapi data, compute everything. Flags in [docs/DATA.md](docs/DATA.md) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Build a 30-page sample and run the browser tests (Playwright) |
| `npm run lint` | ESLint, including the rule that every exported function has TSDoc |
| `npm run check:site` | After a build: broken links, duplicate titles, missing descriptions, invalid JSON-LD |

## How it is organised

```
scripts/
  build-data.ts            pipeline entry point
  pipeline/                AMFI parser, classifier, cached MFapi client, metrics, chart thinning
  check-site.mjs           post-build link / SEO checker
  serve-dist.mjs           tiny foreground static server used by the e2e tests
src/
  lib/calc/                the maths: dates, series, returns, XIRR, SIP, risk, rolling, splits, downsample
  lib/screener/            pure filter / sort / paginate / URL state / CSV (no UI code)
  lib/                     calculators, compare, format, seo (JSON-LD), faq, data (build-time loader)
  components/              Preact islands (screener, compare, charts, calculators) and Astro components
  pages/                   index, fund/[slug], category/[slug], amc/[slug], compare, tools/*, learn/*, ...
  content/learn/           the guides (Markdown)
  content/pages/           methodology, about, privacy, disclaimer (Markdown)
tests/                     unit tests; e2e/ has the browser tests
docs/                      DATA, CACHING, DESIGN, DEPLOY
```

## The rules this project follows

- **Numbers must be right.** All maths is in `src/lib/calc/`, pure and tested with hand-calculated
  cases, plus a cross-check against an independent Python implementation on real NAV data
  (`scripts/crosscheck_reference.py`). Chart percentages come from the same function as the tables.
  See the [methodology](src/content/pages/methodology.md).
- **Bad data is handled, not hidden.** Unit splits are adjusted, one-day glitches removed, unexplained
  jumps cut off, and the fund page says so.
- **A missing value is a dash, never zero.**
- **The browser makes one data request** (`screener.json`, about 316 KB compressed) and never calls MFapi.
- **Every data view has loading, error and empty states.**
- **Every exported function has TSDoc**, enforced by lint.

## Documentation

[DATA](docs/DATA.md) · [CACHING](docs/CACHING.md) · [DESIGN](docs/DESIGN.md) · [DEPLOY and ads](docs/DEPLOY.md) ·
[Methodology](src/content/pages/methodology.md)

## Disclaimer

Educational information only, not investment advice. Mutual fund investments are subject to market risks.
