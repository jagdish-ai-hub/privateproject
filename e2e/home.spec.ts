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

test('highest returns: one list at a time, tabs switch it, and every list is in the page for search engines', async ({ page }) => {
  await page.goto('/');
  const block = page.getByTestId('top-returns');
  test.skip((await block.count()) === 0, 'no fund passes the size filter in this dataset');
  const panels = block.locator('[data-top-panel]');
  expect(await panels.count()).toBeGreaterThan(0);
  await expect(block.locator('[data-top-panel]:visible')).toHaveCount(1);
  const tabs = block.getByRole('tab');
  const last = tabs.last();
  await last.click();
  await expect(last).toHaveAttribute('aria-selected', 'true');
  const key = await last.getAttribute('data-top-tab');
  await expect(block.locator(`[data-top-panel="${key}"]`)).toBeVisible();
  // every row links to a fund page and shows a signed percentage
  const row = block.locator(`[data-top-panel="${key}"] li a`).first();
  await expect(row).toHaveAttribute('href', /^\/fund\//);
  await expect(row).toContainText(/[+-]\d+\.\d{2}%/);
  // the screener link opens a sorted view
  const more = block.locator(`[data-top-panel="${key}"]`).getByRole('link', { name: /See every equity fund/ });
  await expect(more).toHaveAttribute('href', /sort=r\w+%3Adesc/);
});

test('home page sections: category tops link to category pages, calculators and guides are listed', async ({ page }) => {
  await page.goto('/');
  const tops = page.getByTestId('category-tops');
  if (await tops.count()) await expect(tops.getByRole('link', { name: /^All .* funds$/ }).first()).toHaveAttribute('href', /^\/category\/[a-z0-9-]+\/$/);
  await expect(page.getByRole('heading', { name: 'Calculators', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home loan eligibility calculator' })).toHaveAttribute('href', '/tools/home-loan-eligibility-calculator/');
  await expect(page.getByRole('link', { name: 'SIP vs FD' }).first()).toHaveAttribute('href', '/learn/sip-vs-fd/');
});
