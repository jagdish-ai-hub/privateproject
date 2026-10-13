import { expect, test } from '@playwright/test';
import { SMALL_SAVINGS } from '../src/data/small-savings.ts';

const SLUGS = [
  'ppf-calculator',
  'sukanya-samriddhi-calculator',
  'scss-calculator',
  'nsc-calculator',
  'kvp-calculator',
  'post-office-mis-calculator',
  'post-office-rd-calculator',
  'post-office-fd-calculator',
];

test('the hub lists every scheme with its notified rate and the period it applies to', async ({ page }) => {
  await page.goto('/schemes/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const table = page.getByTestId('rates-table');
  await expect(table).toContainText(`${SMALL_SAVINGS.rates.ppf}%`);
  await expect(table).toContainText(`${SMALL_SAVINGS.rates.ssy}%`);
  await expect(table).toContainText(`${SMALL_SAVINGS.rates.scss}%`);
  await expect(page.locator('main')).toContainText(SMALL_SAVINGS.period.label);
  for (const slug of SLUGS) await expect(table.locator(`a[href="/schemes/${slug}/"]`).first()).toBeVisible();
});

for (const slug of SLUGS) {
  test(`${slug}: the default result equals the worked example, and the rate and rules are shown`, async ({ page }) => {
    await page.goto(`/schemes/${slug}/`);
    const result = (await page.getByTestId('scheme-result').innerText()).trim();
    expect(result).toMatch(/₹/);
    await expect(page.getByTestId('worked-example')).toContainText(result);
    await expect(page.getByTestId('rate-notice')).toContainText(SMALL_SAVINGS.notice.number);
    await expect(page.getByTestId('conventions')).toBeVisible();
  });
}

test('PPF reproduces the published figure and responds to inputs', async ({ page }) => {
  await page.goto('/schemes/ppf-calculator/');
  await expect(page.getByTestId('scheme-result')).toHaveText('₹40,68,209');
  await page.getByRole('button', { name: /every month/i }).click();
  const monthly = (await page.getByTestId('scheme-result').innerText()).trim();
  expect(monthly).not.toBe('₹40,68,209');
});

test('KVP has a fixed rate, so no rate field; other schemes have one', async ({ page }) => {
  await page.goto('/schemes/kvp-calculator/');
  await expect(page.getByTestId('scheme-calculator').getByText(/notified/i)).toHaveCount(0);
  await page.goto('/schemes/nsc-calculator/');
  await expect(page.getByTestId('scheme-calculator').getByText(/notified/i)).toBeVisible();
});

test('Hindi page declares hi-IN, links both languages and the switch leads to the English page', async ({ page }) => {
  await page.goto('/hi/schemes/ppf-calculator/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('PPF');
  await expect(page.locator('link[rel="alternate"][hreflang="en-IN"]')).toHaveAttribute('href', /\/schemes\/ppf-calculator\/$/);
  await expect(page.locator('link[rel="alternate"][hreflang="hi-IN"]')).toHaveAttribute('href', /\/hi\/schemes\/ppf-calculator\/$/);
  await expect(page.getByTestId('scheme-result')).toHaveText('₹40,68,209');
  await page.getByTestId('lang-switch').click();
  await expect(page).toHaveURL(/\/schemes\/ppf-calculator\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');
});

test('Hindi hub shows the same rates in Hindi and no stale-rate warning while the period is current', async ({ page }) => {
  await page.goto('/hi/schemes/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
  await expect(page.getByTestId('rates-table')).toContainText(`${SMALL_SAVINGS.rates.ppf}%`);
  const today = new Date().toISOString().slice(0, 10);
  if (today <= SMALL_SAVINGS.period.to) await expect(page.getByTestId('stale-rates')).toHaveCount(0);
});

test('scheme pages fit a phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/schemes/', '/schemes/ppf-calculator/', '/hi/schemes/ppf-calculator/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('English scheme pages link to their guides, and the guides link back to the calculators', async ({ page }) => {
  await page.goto('/schemes/ppf-calculator/');
  await expect(page.getByTestId('scheme-guides').getByRole('link', { name: 'PPF explained' })).toBeVisible();
  await page.getByTestId('scheme-guides').getByRole('link', { name: 'PPF explained' }).click();
  await expect(page).toHaveURL(/\/learn\/ppf-explained\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('PPF explained');
  await expect(page.locator('main a[href="/schemes/ppf-calculator/"]').first()).toBeVisible();
  await page.goto('/hi/schemes/ppf-calculator/');
  await expect(page.getByTestId('scheme-guides')).toHaveCount(0);
});

test('the rent vs buy page links to its guide', async ({ page }) => {
  await page.goto('/tools/rent-vs-buy-calculator/');
  await page.getByTestId('tool-guide').getByRole('link').click();
  await expect(page).toHaveURL(/\/learn\/rent-vs-buy-house-india\/$/);
  await expect(page.locator('main a[href="/tools/rent-vs-buy-calculator/"]').first()).toBeVisible();
});
