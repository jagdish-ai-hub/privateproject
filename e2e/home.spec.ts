import { expect, test } from '@playwright/test';
import type { ScreenerData } from '../src/lib/screener/types.ts';

test('hero shows the real dataset numbers and one h1', async ({ page }) => {
  const d = (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Compare mutual funds in India');
  const stats = page.getByTestId('hero-stats');
  await expect(stats).toContainText(d.count.toLocaleString('en-IN'));
  await expect(stats).toContainText(String(d.dict.amc.length));
});

test('the hero button and the nav item both take you straight to the screener', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^Compare mutual funds/ }).first().click();
  await expect(page).toHaveURL(/#screener$/);
  await expect(page.getByRole('heading', { name: 'Mutual fund screener' })).toBeInViewport();
  // From any other page the nav item leads back to the screener, scrolled into place.
  await page.goto('/compare/');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Compare Mutual Funds' }).click();
  await expect(page).toHaveURL(/\/#screener$/);
  await expect(page.getByRole('heading', { name: 'Mutual fund screener' })).toBeInViewport();
  await expect(page.locator('tbody tr td a').first()).toBeVisible({ timeout: 10_000 });
});

test('a popular comparison opens the compare page with both funds already chosen', async ({ page }) => {
  await page.goto('/');
  // The block only exists when a category has two Direct Growth funds with a known size; a small CI sample may have none.
  test.skip((await page.getByTestId('popular').count()) === 0, 'no popular comparisons in this dataset');
  const chip = page.getByTestId('popular').getByRole('link').first();
  const href = (await chip.getAttribute('href')) as string;
  expect(href).toMatch(/^\/compare\/\?f=\d+,\d+$/);
  await chip.click();
  await expect(page.getByRole('list', { name: 'Selected funds' }).getByRole('listitem')).toHaveCount(2, { timeout: 10_000 });
  await expect(page.locator('[data-compare-chart] canvas').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('insights')).toBeVisible();
});

test('the hero fits a phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(page.getByTestId('hero-stats')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
