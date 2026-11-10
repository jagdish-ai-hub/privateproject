# Deploy and monetise

## Hosting (Cloudflare Workers static assets, free)

Cloudflare now steers new projects to **Workers** (with *static assets*) instead of Pages, so the site is
deployed as a Worker that serves the finished `dist/` folder. The setup is in `wrangler.jsonc`. There is
no Worker code: only files. (Pages still works and has the same limits, but is no longer recommended for new projects.)

The site is built here or in GitHub Actions, then `dist/` is uploaded with `wrangler deploy`. Cloudflare
never builds it: Cloudflare stops builds after 20 minutes, and downloading every fund's history from
scratch takes about that long. **Do not** connect the repository to Cloudflare (Workers Builds or Pages
"Connect to Git"): it would try to build the site itself and time out.

Limits: 20,000 files per Worker version on the free plan and 25 MiB per file. The site has about 10,800 files
(`wrangler deploy --dry-run` reports about 12,900, which seems to include folders); either is well under the limit.

You need one **API token** (Cloudflare → Manage account → Account API tokens → Create Token → Custom
token, permission *Account → Workers Scripts → Edit*; set an expiry) and your **account ID** (Workers & Pages
page). Three ways to deploy, from least to most automatic:

1. **From your own computer** (Node.js 22): `npm ci`, `npm run data:build`, `npm run build`, then
   `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npx wrangler deploy --name <name>`.
   The first run creates the Worker. Data is as fresh as your last run.
2. **From a Claude Code cloud session:** save the token as a network secret for `api.cloudflare.com` in
   the environment's settings; the session can then build and run the same `wrangler` command.
3. **Every night, automatically (recommended once live):** in the GitHub repository set the secrets
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and the variables `CLOUDFLARE_PROJECT` (the Worker name,
   for example `mf-compare`) and `PUBLIC_CONTACT_EMAIL`. The **Nightly data and deploy** workflow
   then rebuilds the data and uploads the site every night. This stores the token in GitHub; Cloudflare itself
   is still not connected to the repository. The domain (`https://mutualfundcompare.in`) is written in
   `astro.config.mjs` and the indexing stage (`core`) in `.github/workflows/nightly.yml`, so neither needs a GitHub setting.

The Worker is also reachable at `https://<name>.<your-subdomain>.workers.dev` (your subdomain is shown on the
Workers & Pages page). The pages' canonical links and the sitemap always name `mutualfundcompare.in`, so
until that domain is attached to the Worker (below), search engines cannot reach what they point to.

**Custom domain.** In Workers & Pages → your Worker → Settings → Domains & Routes → Add → Custom domain.
Unlike Pages, Workers only accepts a domain whose **DNS (nameservers) is managed by Cloudflare**. If you
buy the domain elsewhere, add it to Cloudflare (free plan) and change its nameservers at the registrar first.
Then submit `https://your-domain/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools.

Any static host works: build with `npm run data:build && npm run build` and upload `dist/`.
Mind the host's file limit ([DATA.md](DATA.md#file-count)).

## Which pages Google may list (staged indexing)

Every page is always built and works for visitors. One setting, `INDEX_STAGE`, decides which pages
Google may list. A page that is held back gets a "do not index" tag (`noindex, follow`), is left out of
the sitemaps, and is left out of the English/Hindi `hreflang` links. The menus, the screener and the
language switch still link to it. Rules and code: `src/lib/indexStage.ts`.

| `INDEX_STAGE` | Open to Google | Pages |
|---|---|---|
| `en` (default, also when empty) | the hand-written English pages: home, compare, calculators, schemes, guides, about, author, legal | 67 |
| `core` | + the Hindi pages | 121 |
| `lists` | + the 50 category and 55 fund-house list pages | 226 |
| `funds` | + the largest funds by fund size; how many is `INDEX_FUNDS` (default 250) | 226 + N |
| `all` | + every fund page | about 2,080 |

The shared `/fund/?code=…` page is never listed. A mistyped value (for example `everything`) stops the
build with a message, so it cannot silently open something else.

**Set it:** edit the `INDEX_STAGE:` line in `.github/workflows/nightly.yml` (currently `core`; it can be done
in the GitHub web editor), and for the funds stage the repository variable `INDEX_FUNDS`. Then run
**Nightly data and deploy** (or wait for the nightly run). A build with no setting at all is `en`. The sitemap is
`/sitemap-index.xml`, with one file per group (`sitemap-en-0.xml`, `sitemap-hi-0.xml`,
`sitemap-lists-0.xml`, `sitemap-funds-*.xml`), so Search Console shows how each group is indexed.

**Moving up a stage.** Each time: change the variable, redeploy, then in Search Console submit the
sitemap file of the group that just opened and, for a few main pages of that group, use URL Inspection
→ Request indexing. Google re-checks pages that were held back less often, so expect days to a few
weeks, not a penalty.

Move up only when the previous group has settled. Signals to look for (rules of thumb, not Google rules):

- Search Console → Indexing → Pages, filtered to that group's sitemap: most pages (about 80%) show as indexed.
- Few pages stuck as "Crawled - currently not indexed". If many are, do not open more templated pages:
  improve the pages that are already open first.
- Settings → Crawl stats shows steady daily crawling and mostly 200 responses.
- Performance shows impressions for calculator and scheme searches, not only for the home page.

Order: `en` → `core` (live now; the Hindi pages were read by a Hindi speaker) → `lists` →
`funds` with `INDEX_FUNDS=250`, then 700, 1200 → `all`.

**The `workers.dev` address:** switch it off once the custom domain works (Worker → Settings → Domains &
Routes), and do not add it to Search Console. Pages open at the current stage are open to Google on any
address that Google finds, but their canonical links point at `mutualfundcompare.in`.

**Check it:** `npm run check:stages` builds the site once per stage and checks the tags, sitemaps and
`hreflang` links (about a minute). CI runs it on every push.

## Data licensing: read this before you monetise

The site is free and ad-free as built. **Putting ads on it is commercial use**, and the data comes
from AMFI:

> AMFI grants you a non-exclusive, personal, non-transferable, non-sublicensable, limited and
> revocable right to access, use and display this Site ... for your personal and non-commercial use
> only ... No other use of the Site is authorised unless you and we have agreed otherwise in writing.
> (AMFI Terms of Use, https://www.amfiindia.com/terms-of-use, read 2 October 2026)

The expense ratio and AUM columns are fetched from AMFI's own website APIs, so the same terms apply to them.
MFapi.in is a free wrapper over the same AMFI file and does not change AMFI's terms. NAV data is
widely republished by commercial sites, but that is not the same as a licence. Before turning on ads:

1. Ask AMFI in writing whether and on what terms the daily NAV data may be used on a
   free, ad-supported website, or use a licensed data vendor instead.
2. Get legal advice if in doubt. This is a business risk, not a technical one.
3. Keep crediting AMFI and MFapi.in (the footer already does).

Switching data source is contained: only `scripts/pipeline/amfi.ts` and `scripts/pipeline/history.ts`
know where data comes from; everything downstream reads `screener.json` and the nav files.

## Moving to a new domain

Use this when you change from a temporary address (for example a subdomain) to the final domain.

1. Buy the new domain, put its DNS on Cloudflare, and add it to the same Worker as a second custom domain.
2. Change the `site` line in `astro.config.mjs` to the new address, push, and run the nightly workflow once. Every
   canonical link, `hreflang` link and the sitemap then use it.
3. Redirect the old address to the new one with a permanent (301) redirect that keeps the path, for
   example `old.example.com/fund/abc/` to `new.example.com/fund/abc/`. In Cloudflare this is one
   Redirect Rule on the old hostname; it needs the old domain's DNS to be managed in Cloudflare. Keep
   it for at least a year.
4. Add the new domain in Google Search Console, submit its sitemap and inspect the home page. If the
   change-of-address tool is offered for the old address, use it; for a subdomain it may not be.
5. Update the contact email domain, the AdSense site entry and `ads.txt` if ads are on.

Expect a short dip in search traffic while Google follows the redirects. Do not move twice.

## Before applying for Google AdSense

- A real domain (set in `astro.config.mjs`) and `PUBLIC_CONTACT_EMAIL` set (the contact page needs a way to
  reach you).
- The guides, methodology, about, privacy and disclaimer pages exist already. Read the privacy page and
  update it to match what you actually run.
- Some weeks of indexed traffic.

## Turning on Microsoft Clarity

1. Create a free project at clarity.microsoft.com and copy the project id (the short code in the install snippet).
2. Set the repository variable `PUBLIC_CLARITY_ID` to it. Without it, no analytics script is on the page.
3. The script loads after the page `load` event, so it does not affect first paint. The privacy page already describes it.
4. The site targets India only, so there is no consent banner. If you ever target the EEA / UK, add one before analytics and ads run.

## Turning ads on

1. Set the variable `PUBLIC_ADSENSE_CLIENT` (for example `ca-pub-1234567890123456`).
2. Add your slot ids where `AdSlot` is used (fund pages and guides) or add more placements. The component
   reserves a fixed minimum height so ads never shift the layout.
3. Add `public/ads.txt` with the line Google gives you.
4. Update `src/content/pages/privacy.md` to match the ads you run. No consent banner is planned because the
   site targets India only; add one first if that changes. Some EEA / UK visitors may still arrive, and Google
   limits the ads it shows them without a consent tool; this does not affect Indian visitors.
5. Keep the wording neutral on ranked lists ("sorted by 3-year return"), as it is now, and keep the
   disclaimer in the footer.

## Compliance notes

The site must not recommend funds or claim to be a SEBI-registered adviser. If you ever want to
recommend or rate funds, take professional advice on SEBI's investment adviser and research analyst rules first.
