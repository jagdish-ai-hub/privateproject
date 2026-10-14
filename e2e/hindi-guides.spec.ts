import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const slugs = readdirSync(join(fileURLToPath(new URL('.', import.meta.url)), '../src/content/learn-hi')).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

test('the Hindi guides index lists every guide in six groups, all links stay in Hindi', async ({ page }) => {
  await page.goto('/hi/learn/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('सीखें');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6);
  const hrefs = await page.locator('ul.grid li a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toHaveLength(slugs.length);
  for (const h of hrefs) expect(h).toMatch(/^\/hi\/learn\//);
});

for (const slug of slugs) {
  test(`/hi/learn/${slug}/: Hindi page with Article and FAQ markup, review date and a working language switch`, async ({ page }) => {
    await page.goto(`/hi/learn/${slug}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByText(/अंतिम समीक्षा/).first()).toBeVisible();
    await expect(page.locator('summary').first()).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="en-IN"]')).toHaveAttribute('href', new RegExp(`/learn/${slug}/$`));
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((b) => JSON.parse(b) as { '@type': string; inLanguage?: string });
    expect(parsed.map((p) => p['@type'])).toEqual(expect.arrayContaining(['Article', 'FAQPage', 'BreadcrumbList']));
    expect(parsed.find((p) => p['@type'] === 'Article')?.inLanguage).toBe('hi-IN');
    // every internal link in the article body stays on Hindi pages (or the language-neutral screener, compare and methodology)
    const hrefs = await page.locator('.prose-mf a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const h of hrefs) expect(h, h).not.toMatch(/^\/(learn|tools|schemes)\//);
    await page.getByTestId('lang-switch').click();
    await expect(page).toHaveURL(new RegExp(`/learn/${slug}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');
  });
}

test('English guides offer the Hindi twin, and Hindi calculators and scheme pages link to Hindi guides', async ({ page }) => {
  await page.goto('/learn/what-is-sip/');
  await expect(page.getByTestId('lang-switch')).toHaveAttribute('href', '/hi/learn/what-is-sip/');
  await page.goto('/hi/tools/sip-calculator/');
  await page.getByTestId('tool-guide').getByRole('link').click();
  await expect(page).toHaveURL(/\/hi\/learn\/what-is-sip\/$/);
  await page.goto('/hi/schemes/ppf-calculator/');
  await page.getByTestId('scheme-guides').getByRole('link', { name: 'PPF समझें' }).click();
  await expect(page).toHaveURL(/\/hi\/learn\/ppf-explained\/$/);
  await page.goto('/tools/car-running-cost-calculator/');
  await page.getByTestId('tool-guide').getByRole('link').click();
  await expect(page).toHaveURL(/\/learn\/ev-vs-petrol-running-cost-india\/$/);
});

test('Hindi guide pages fit a phone, tables included', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const slug of ['small-savings-schemes-compared', 'ppf-vs-mutual-funds', 'mutual-fund-taxation-india']) {
    await page.goto(`/hi/learn/${slug}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), slug).toBeLessThanOrEqual(0);
  }
});
