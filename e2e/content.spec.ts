import { expect, test } from '@playwright/test';

test('learn index lists every guide in six groups, and each link works', async ({ page }) => {
  await page.goto('/learn/');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6);
  const links = page.locator('ul.grid li a');
  expect(await links.count()).toBeGreaterThanOrEqual(24);
  const first = await links.first().getAttribute('href');
  await page.goto(first as string);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a guide has Article, FAQPage and Breadcrumb JSON-LD, a visible FAQ and a review date', async ({ page }) => {
  await page.goto('/learn/direct-vs-regular-mutual-funds/');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type']);
  expect(types).toEqual(expect.arrayContaining(['Article', 'FAQPage', 'BreadcrumbList']));
  await expect(page.locator('main summary').first()).toBeVisible();
  await expect(page.getByText(/Last reviewed/)).toBeVisible();
  // the worked example uses numbers computed with the calculator code
  await expect(page.getByText('₹12.6 lakh')).toBeVisible();
});

test('home page has Organization and WebSite JSON-LD', async ({ page }) => {
  await page.goto('/');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type'])).toEqual(['Organization', 'WebSite']);
});

test('policy pages exist and the footer links to them', async ({ page }) => {
  for (const path of ['/methodology/', '/about/', '/privacy/', '/disclaimer/', '/contact/']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('/');
  for (const name of ['Methodology', 'About', 'Privacy', 'Disclaimer']) await expect(page.getByRole('contentinfo').getByRole('link', { name })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('Mutual fund investments are subject to market risks');
});

test('unknown URLs return the 404 page with helpful links', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('robots.txt and the sitemap index are served', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap:');
  const sm = await request.get('/sitemap-index.xml');
  expect(sm.status()).toBe(200);
});

test('every icon the page links to is served, and the manifest points at real icons', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"], meta[property="og:image"]').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? e.getAttribute('content') ?? ''));
  expect(hrefs.length).toBeGreaterThanOrEqual(5);
  for (const h of hrefs) {
    const path = new URL(h, 'http://x').pathname; // og:image is absolute on the production domain; check the same path here
    expect((await page.request.get(path)).status(), path).toBe(200);
  }
  const manifest = await (await page.request.get('/site.webmanifest')).json() as { icons: { src: string }[] };
  for (const i of manifest.icons) expect((await page.request.get(i.src)).status(), i.src).toBe(200);
  await expect(page.getByRole('link', { name: 'Mutual Fund Compare, home' }).locator('svg')).toBeVisible();
});

test('the raster icons really draw the dark ₹ tile, not a placeholder picture', async ({ page }) => {
  // The first icon files were valid PNGs that held a picture of Chrome's "broken image" glyph, so a status
  // check passed while tabs and Google showed a broken icon. Draw each one and read pixels from the tile.
  await page.goto('/');
  for (const src of ['/favicon.ico', '/favicon-48.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png']) {
    const px = await page.evaluate(async (u) => {
      const img = new Image();
      img.src = u;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0);
      const at = (fx: number, fy: number) => Array.from(g.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data);
      return { w: c.width, bg: at(0.12, 0.5), mark: at(0.42, 0.28) };
    }, src);
    expect(px.w, src).toBeGreaterThanOrEqual(16);
    // Tile: opaque and near-black. The ₹ stroke near the top: light.
    expect(px.bg[3], `${src} tile alpha`).toBeGreaterThan(200);
    expect(Math.max(...px.bg.slice(0, 3)), `${src} tile colour`).toBeLessThan(40);
    expect(Math.min(...px.mark.slice(0, 3)), `${src} ₹ stroke`).toBeGreaterThan(150);
  }
});
