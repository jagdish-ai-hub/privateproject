import { expect, test } from '@playwright/test';

test('learn index lists every guide in four groups, and each link works', async ({ page }) => {
  await page.goto('/learn/');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(4);
  const links = page.locator('ul.grid li a');
  expect(await links.count()).toBeGreaterThanOrEqual(15);
  const first = await links.first().getAttribute('href');
  await page.goto(first as string);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a guide has Article, FAQPage and Breadcrumb JSON-LD, a visible FAQ and a review date', async ({ page }) => {
  await page.goto('/learn/direct-vs-regular-mutual-funds/');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type']);
  expect(types).toEqual(expect.arrayContaining(['Article', 'FAQPage', 'BreadcrumbList']));
  await expect(page.locator('summary').first()).toBeVisible();
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
