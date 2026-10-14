import { expect, test } from '@playwright/test';
import { TOOLS } from '../src/lib/tools.ts';

test('the Hindi calculators index lists every calculator and links to its Hindi page', async ({ page }) => {
  await page.goto('/hi/tools/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('कैलकुलेटर');
  await expect(page.locator('ul.grid li a')).toHaveCount(TOOLS.length);
  for (const t of TOOLS) await expect(page.locator(`ul.grid li a[href="/hi/tools/${t.slug}/"]`)).toBeVisible();
});

for (const t of TOOLS) {
  test(`${t.slug}: Hindi page has its own metadata, a working calculator and unique form ids`, async ({ page }) => {
    await page.goto(`/hi/tools/${t.slug}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en-IN"]')).toHaveAttribute('href', new RegExp(`/tools/${t.slug}/$`));
    await expect(page.locator('link[rel="alternate"][hreflang="hi-IN"]')).toHaveAttribute('href', new RegExp(`/hi/tools/${t.slug}/$`));
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type'])).toEqual(expect.arrayContaining(['WebApplication', 'FAQPage']));
    // the calculator renders with results (rupees, or a percentage for CAGR)
    await expect(page.getByTestId('results').first()).toContainText(/₹|%/);
    // every input has its own id and each label points at an existing input
    const ids = await page.locator('form input[id]').evaluateAll((els) => els.map((e) => e.id));
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    const broken = await page.locator('form label[for]').evaluateAll((ls) => ls.filter((l) => document.getElementById((l as HTMLLabelElement).htmlFor) === null).length);
    expect(broken).toBe(0);
    // no English UI labels leaked into the form
    const form = await page.locator('form').first().innerText();
    expect(form).not.toMatch(/Expected return|Time period|Monthly SIP|Home price|Distance driven|Making charges|Amount to invest/);
    // the language switch goes to the English twin
    await page.getByTestId('lang-switch').click();
    await expect(page).toHaveURL(new RegExp(`/tools/${t.slug}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');
  });
}

test('Hindi SIP matches English SIP and the Hindi labels drive the numbers', async ({ page }) => {
  await page.goto('/tools/sip-calculator/');
  const en = await page.getByTestId('results').innerText();
  await page.goto('/hi/tools/sip-calculator/');
  expect(await page.getByTestId('results').innerText()).toContain(en.match(/₹[\d,]+/g)![2]);
  await page.getByLabel('हर महीने की SIP राशि', { exact: true }).fill('20000');
  const doubled = await page.getByTestId('results').innerText();
  expect(doubled).toContain('₹24,00,000');
});

test('Hindi rent vs buy shows the same buyer and renter figures as English', async ({ page }) => {
  await page.goto('/tools/rent-vs-buy-calculator/');
  const buyer = await page.getByTestId('rvb-buyer').innerText();
  const renter = await page.getByTestId('rvb-renter').innerText();
  await page.goto('/hi/tools/rent-vs-buy-calculator/');
  await expect(page.getByTestId('rvb-buyer')).toHaveText(buyer);
  await expect(page.getByTestId('rvb-renter')).toHaveText(renter);
  await expect(page.getByTestId('rvb-verdict')).toContainText('साल');
});

test('Hindi navigation points at Hindi pages, and the English calculators page offers the Hindi twin', async ({ page }) => {
  await page.goto('/hi/tools/');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'कैलकुलेटर' })).toHaveAttribute('href', '/hi/tools/');
  await page.goto('/tools/');
  await expect(page.getByTestId('lang-switch')).toHaveAttribute('href', '/hi/tools/');
});
