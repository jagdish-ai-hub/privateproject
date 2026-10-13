import { expect, test } from '@playwright/test';
import { RENT_VS_BUY_DEFAULTS, breakEvenRent, rentVsBuy } from '../src/lib/rentVsBuy.ts';

const rs = (n: number): string => '₹' + Math.round(n).toLocaleString('en-IN');

test('defaults show the same numbers as the maths and the worked example', async ({ page }) => {
  await page.goto('/tools/rent-vs-buy-calculator/');
  const r = rentVsBuy(RENT_VS_BUY_DEFAULTS);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rent vs buy calculator');
  await expect(page.getByTestId('rvb-buyer')).toHaveText(rs(r.buyerNetWorth));
  await expect(page.getByTestId('rvb-renter')).toHaveText(rs(r.renterNetWorth));
  await expect(page.getByTestId('rvb-breakeven')).toContainText(rs(breakEvenRent(RENT_VS_BUY_DEFAULTS)!));
  await expect(page.locator('main')).toContainText(`the buyer owns about ${rs(r.buyerNetWorth)}`);
});

test('raising the rent flips the verdict to buying, and the verdict follows the numbers', async ({ page }) => {
  await page.goto('/tools/rent-vs-buy-calculator/');
  await expect(page.getByTestId('rvb-verdict')).toContainText('renting and investing the difference leaves you');
  await page.getByLabel('Rent for a similar home (per month)', { exact: true }).fill('60000');
  await expect(page.getByTestId('rvb-verdict')).toContainText('buying leaves you');
  const r = rentVsBuy({ ...RENT_VS_BUY_DEFAULTS, monthlyRent: 60_000 });
  await expect(page.getByTestId('rvb-buyer')).toHaveText(rs(r.buyerNetWorth));
  await expect(page.getByTestId('rvb-note')).toContainText('Buying is ahead from year');
});

test('the extra assumptions are tucked away but reachable, and the page fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/tools/rent-vs-buy-calculator/');
  await page.getByTestId('more-assumptions').locator('summary').click();
  await expect(page.getByLabel('Cost of selling', { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the calculators index lists it', async ({ page }) => {
  await page.goto('/tools/');
  await expect(page.getByRole('link', { name: /Rent vs buy calculator/ })).toBeVisible();
});
