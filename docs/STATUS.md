# Project status

Last updated: 10 November 2026. Everything below is on `main` of
https://github.com/jagdish-ai-hub/privateproject (nothing is waiting to be pushed).

## What the site is

A free, no-sign-up Indian site to compare mutual funds and to calculate savings, home-buying,
car and gold decisions, in English and Hindi. A static site (Astro), rebuilt nightly from AMFI and
MFapi data. About 2,082 pages and 10,830 files. Plan for earning: Google AdSense, later, once traffic and the data
licence allow.

## Built

| Area | What exists |
|---|---|
| Mutual fund screener | About 8,600 schemes; filter and sort on returns, SIP returns, risk, expense ratio (TER) and fund size (AUM); phone card layout; shareable URLs; CSV export |
| Fund pages | One page per Direct Growth scheme (about 1,850, indexed by Google): returns, risk, NAV chart with drop-from-peak, costs and size (Direct vs Regular TER), peer comparison, FAQ. Every other variant (Regular, IDCW and so on, about 6,850) opens on one shared page, `/fund/?code=…`, which loads the figures in the browser, links to the Direct Growth page and is kept out of Google (`noindex`, not in the sitemap). This keeps the site under Cloudflare's 20,000-file limit and keeps Google's attention on one page per scheme |
| Category and fund-house pages | Lists with median expense ratio |
| Side-by-side compare | Up to several funds, chart, plain-language insights |
| Calculators (22: 16 in English and Hindi, 6 English only) | SIP, step-up SIP, lumpsum, goal SIP, SWP, CAGR, rent vs buy, car running cost, EV vs petrol, gold and silver jewellery price, gold and silver return, home loan EMI (with prepayment), car loan EMI (with flat-rate conversion), personal loan EMI, FD with tax and inflation, inflation. Pages: `/tools/…` and `/hi/tools/…`. **English only** (no Hindi page, no hreflang, no language switch): home loan eligibility, general EMI, XIRR, fuel cost, mileage, gold SIP (`englishOnly: true` in `src/lib/tools.ts`) |
| Government schemes (8, English and Hindi) | Hub with dated rates plus PPF, Sukanya Samriddhi, SCSS, NSC, KVP, Post Office MIS, RD and Time Deposit calculators, each stating its convention and a worked example. Pages: `/schemes/…` and `/hi/schemes/…` |
| Guides (26, English and Hindi) | Mutual funds and tax (16), government schemes (PPF, Sukanya Samriddhi, Post Office schemes, schemes compared, PPF vs mutual funds), planning (rent vs buy, EV vs petrol, buying gold and silver, how an EMI works, FD returns after tax and inflation). Pages: `/learn/…` and `/hi/learn/…` |
| Languages | `hreflang` links between each English page and its Hindi twin, a language switch in the header, Hindi navigation, Hindi page text |
| SEO | Titles, descriptions, canonical links, hreflang (en-IN, hi-IN), JSON-LD, sitemap with `lastmod` for every page, `robots.txt`, `llms.txt` for AI assistants |
| Trust | Author page for Omm of JGRF Software (`/author/omm/`, `/hi/author/omm/`), linked from the footer. Every calculator, scheme page and guide shows "Written and reviewed by Omm · Last reviewed …" and lists its official sources (Finance Ministry, India Post, RBI, SEBI, AMFI, Income Tax Department and others, in `src/lib/sources.ts`). JSON-LD names the author as a Person with `dateModified`. Calculator and scheme review date: `REVIEWED_ON` in `src/data/author.ts`; guides keep their own dates |
| Phone support | Every page type, in both languages, was audited at 320, 360, 390 and 412 px wide: no sideways scrolling, inputs at 16px (so iPhones do not zoom when you tap one), header and card links at least 36px tall, FAQ rows and chart buttons easy to tap. A test (`e2e/mobile.spec.ts`) keeps it that way |
| Quality | 438 unit tests, 158 end-to-end tests, lint, type check, site link check |
| Staged indexing | One setting, `INDEX_STAGE`, opens pages to Google in steps: `en` (67 English pages, the default) → `core` (+54 Hindi) → `lists` (+105 category and fund-house pages) → `funds` (+ largest funds, `INDEX_FUNDS`) → `all`. Held-back pages stay live for visitors, carry `noindex, follow`, and are left out of the sitemaps and `hreflang`. One sitemap file per group. How to move up and what to watch: `docs/DEPLOY.md`. Checked by `npm run check:stages` in CI |
| Delivery | CI on every push; nightly data build and deploy workflow (deploys only once Cloudflare is configured). Deploys use Cloudflare Workers static assets (`wrangler deploy`, configured in `wrangler.jsonc`); Cloudflare is never connected to the GitHub repository, because Cloudflare's own build stops at 20 minutes and the data build takes about 21 |
| Analytics | Microsoft Clarity, switched on by setting `PUBLIC_CLARITY_ID` |

## Known limits (read these)

(Car and EV fuel, electricity and vehicle prices are not a limit: by design the visitor types in their own prices and mileage, and the defaults are only starting examples.)

- **Hindi text was written by an AI assistant and has not been read by a native speaker.** The
  maths, numbers and links are checked by tests, but the wording, tone and finance terms need one
  careful read by a Hindi speaker who knows personal finance before the Hindi pages are promoted.
- **Six calculators and the extra FAQs are English only.** The six newest calculators (eligibility, EMI, XIRR, fuel cost, mileage, gold SIP) have no Hindi page. The extra FAQs added on the English calculator and scheme pages (`src/lib/toolsExtraFaqs.ts`, `src/lib/schemeExtraFaqs.ts`) have no Hindi twin, so the Hindi pages have fewer questions. A test keeps the shared FAQs the same count in both languages.
- **Hindi covers calculators, schemes and guides only.** The home page, screener, fund pages,
  compare, category and fund-house pages, and the Methodology, About, Privacy and Disclaimer pages
  are English only. The Hindi footer links to the English legal pages. The first item in the Hindi
  menu goes to the English home page.
- **Gold and silver have no live prices.** The two calculators use a rate you type in; there is no
  price page and no price history, because a feed needs a licensed source. Choosing one is a
  decision for later (see "Waiting on the owner").
- **Facts written from general knowledge** (not from a primary source), to be checked once by a
  person: PPF and Sukanya Samriddhi withdrawal rules, the rental yield remark in the rent vs buy
  guide, GST on jewellery (3%), the 12.5% gains-tax default in rent vs buy, and the wording about
  gold bonds and hallmarking. Also from secondary sources or memory, in the newer FAQs: the FD TDS limit (₹50,000, ₹1 lakh for seniors) and the single self-declaration form (Form 121) under the Income-tax Act, 2025; the SCSS TDS limit (₹1 lakh); the home loan interest deduction (₹2 lakh, old regime only); RBI's loan-to-value limits for home loans (90%/80%/75%); the DICGC cover (₹5 lakh); and the tola (11.66 g). Early-closure, extension, loan and withdrawal rules for the post office schemes are from India Post's booklet "Post Office Savings Schemes" version 2.0 dated 7 October 2024 (NSC from the NSI scheme rules); confirm they are unchanged. The scheme interest rates come from two copies of the Finance
  Ministry notice because the official sites could not be reached.

## Not built yet

- Hindi home page, screener, fund pages and the legal pages.
- Next batch (proposed, English only): income tax old vs new, salary in hand, EPF, NPS, capital gains, retirement, GST; category hub pages. Each needs its rules checked against the Income Tax Department first.
- A gold and silver price page and price history (needs a licensed data source).
- Hindi versions of the six English-only calculators and of the extra FAQs.
- A consent banner (not needed: the site targets India only).

## Waiting on the owner

0. Test the site on its `workers.dev` address first (do not share the link), have the Hindi pages read, then set `INDEX_STAGE` to `en` (or `core`) when the domain is ready.

1. Pick and buy the final domain; until then a subdomain can be used (see `docs/DEPLOY.md`).
2. The Cloudflare token and the GitHub variables for the Workers deploy (never "Connect to Git"), and one of the deploy routes in `docs/DEPLOY.md`: run wrangler on your own computer, give a Claude session a Cloudflare token, or add the token as a GitHub secret for nightly deploys.
3. Set `PUBLIC_CLARITY_ID` after creating a Clarity project.
4. Email AMFI about commercial use of their data. Keep ads off until they answer.
5. Have a Hindi speaker read the Hindi pages;
   have the "known limits" facts above checked once.
6. Decide where gold and silver prices should come from, if a price page is wanted.
7. Apply for AdSense once the site is live and has traffic.

## Things to re-check regularly

- **Every quarter:** government scheme rates in `src/data/small-savings.ts` (steps in `docs/DATA.md`). The pages warn when the quarter has ended.
- **Tax wording:** written for the Income-tax Act, 2025 (Section 123, formerly 80C). It appears in the scheme pages, the ELSS guide and the rent vs buy and gold guides, in both languages.
- **AMFI endpoints** used for expense ratio and fund size are website APIs, not a documented service. The pipeline keeps the last good data if they change.

## How the two languages are kept in step

- Calculators: English text in `src/lib/tools.ts`, Hindi text in `src/lib/toolsContent.hi.ts`, same slug. A test checks every calculator has Hindi text with the same number of FAQs.
- Guides: English in `src/content/learn/`, Hindi in `src/content/learn-hi/`, same file name. A test checks the same group, order, dates, related guides, number of FAQs and number of links, that Hindi links stay on Hindi pages, and that the text is Hindi.
- Schemes: `src/lib/schemeContent.ts` and `src/lib/schemeContent.hi.ts`.
- When you change an English page, change its Hindi twin; the tests catch a missing twin or a changed structure, but not a changed sentence.

## Where to read more

- `README.md`: features, folders, how to run.
- `docs/DATA.md`: data sources, the pipeline, scheme rates, what has no data feed.
- `docs/DEPLOY.md`: hosting, domain, analytics, ads.
- `docs/METHODOLOGY.md`: how each number is calculated.
- `docs/DESIGN.md`: design rules.
- Research notes behind the product choices: repository `jagdish-ai-hub/DAMS-project`, branch `claude/admiring-turing-5wrjbm`.
