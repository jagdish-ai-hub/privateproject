# Deploy and monetise

## Hosting (Cloudflare Pages, free)

1. Create a Pages project (direct upload, no build settings needed: the nightly workflow builds).
2. In the GitHub repo set **secrets** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and
   **variables** `CLOUDFLARE_PROJECT` (project name), `SITE_URL` (for example `https://example.com`,
   used for canonical URLs, the sitemap and robots.txt), `PUBLIC_CONTACT_EMAIL`.
3. Run the **Nightly data and deploy** workflow once manually (`workflow_dispatch`). The first run
   backfills all histories (about 10 minutes); later runs are fast ([CACHING.md](CACHING.md)).
4. Add a custom domain in Cloudflare Pages.
5. Submit `https://your-domain/sitemap-index.xml` in Google Search Console.

Any static host works. Build with `npm run data:build && npm run build` and upload `dist/`.
Mind the host's file limit ([DATA.md](DATA.md#file-count)).

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

## Before applying for Google AdSense

- A real domain, `SITE_URL` set, and `PUBLIC_CONTACT_EMAIL` set (the contact page needs a way to
  reach you).
- The guides, methodology, about, privacy and disclaimer pages exist already. Read the privacy page and
  update it to match what you actually run.
- Some weeks of indexed traffic.

## Turning ads on

1. Set the variable `PUBLIC_ADSENSE_CLIENT` (for example `ca-pub-1234567890123456`).
2. Add your slot ids where `AdSlot` is used (fund pages and guides) or add more placements. The component
   reserves a fixed minimum height so ads never shift the layout.
3. Add `public/ads.txt` with the line Google gives you.
4. Add a consent banner where required (EEA / UK visitors) **before** enabling, and update
   `src/content/pages/privacy.md`.
5. Keep the wording neutral on ranked lists ("sorted by 3-year return"), as it is now, and keep the
   disclaimer in the footer.

## Compliance notes

The site must not recommend funds or claim to be a SEBI-registered adviser. If you ever want to
recommend or rate funds, take professional advice on SEBI's investment adviser and research analyst rules first.
