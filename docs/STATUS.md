# Project status

Last updated: 14 October 2026. Everything below is on `main` of
https://github.com/jagdish-ai-hub/privateproject (nothing is waiting to be pushed).

## What the site is

A free, no-sign-up Indian site to compare mutual funds and to calculate savings and
home-buying decisions. A static site (Astro), rebuilt nightly from AMFI and MFapi data.
8,767 pages. Plan for earning: Google AdSense, later, once traffic and the data licence allow.

## Built

| Area | What exists |
|---|---|
| Mutual fund screener | About 8,600 schemes; filter and sort on returns, SIP returns, risk, expense ratio (TER) and fund size (AUM); phone card layout; shareable URLs; CSV export |
| Fund pages | Returns, risk, NAV chart with drop-from-peak, costs and size (Direct vs Regular TER), peer comparison, FAQ |
| Category and fund-house pages | Lists with median expense ratio |
| Side-by-side compare | Up to several funds, chart, plain-language insights |
| Calculators (7) | SIP, step-up SIP, lumpsum, goal SIP, SWP, CAGR, rent vs buy |
| Government schemes (English and Hindi) | Hub with dated rates plus PPF, Sukanya Samriddhi, SCSS, NSC, KVP, Post Office MIS, RD and Time Deposit calculators, each stating its convention and a worked example |
| Guides (22) | 16 on mutual funds and tax, plus PPF, Sukanya Samriddhi, Post Office schemes, schemes compared, PPF vs mutual funds, rent vs buy |
| SEO | Titles, descriptions, canonical links, hreflang (en-IN, hi-IN), JSON-LD, sitemap |
| Quality | 325 unit tests, 67 end-to-end tests, lint, type check, site link check (about 11,670 links) |
| Delivery | CI on every push; nightly data build and deploy workflow (deploys only once Cloudflare is configured) |
| Analytics | Microsoft Clarity, switched on by setting `PUBLIC_CLARITY_ID` |

## Not built yet

- Car and EV running cost calculator (planned).
- Gold and silver price page (data source not chosen).
- Hindi versions of the guides, the mutual fund calculators and rent vs buy.
- A consent banner (not needed: the site targets India only).

## Waiting on the owner

1. Pick and buy the final domain; until then a subdomain can be used (see `docs/DEPLOY.md`).
2. Cloudflare Pages project and the repository variables `CLOUDFLARE_PROJECT`, `SITE_URL`.
3. Set `PUBLIC_CLARITY_ID` after creating a Clarity project.
4. Email AMFI about commercial use of their data. Keep ads off until they answer.
5. Name an author or reviewer for the finance content, and have the scheme rates, tax wording and guides checked once.
6. Apply for AdSense once the site is live and has traffic.

## Things to re-check regularly

- **Every quarter:** government scheme rates in `src/data/small-savings.ts` (steps in `docs/DATA.md`). The pages warn when the quarter has ended.
- **Tax wording:** written for the Income-tax Act, 2025 (Section 123, formerly 80C).
- **AMFI endpoints** used for expense ratio and fund size are website APIs, not a documented service. The pipeline keeps the last good data if they change.

## Where to read more

- `README.md`: features, folders, how to run.
- `docs/DATA.md`: data sources, the pipeline, scheme rates.
- `docs/DEPLOY.md`: hosting, domain, analytics, ads.
- `docs/METHODOLOGY.md`: how each number is calculated.
- `docs/DESIGN.md`: design rules.
- Research notes behind the product choices: repository `jagdish-ai-hub/DAMS-project`, branch `claude/admiring-turing-5wrjbm`.
