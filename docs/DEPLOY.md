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
