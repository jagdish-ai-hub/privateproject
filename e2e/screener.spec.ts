import { expect, test, type Page } from '@playwright/test';
import { applyView, prepare } from '../src/lib/screener/query.ts';
import { DEFAULT_VIEW, parseView } from '../src/lib/screener/url.ts';
import type { ScreenerData } from '../src/lib/screener/types.ts';

/** The expected result count for a URL query, computed by the pure functions on the real data file. */
async function expectedTotal(page: Page, search: string): Promise<number> {
  const res = await page.request.get('/data/screener.json');
  const data = (await res.json()) as ScreenerData;
  return applyView(prepare(data), parseView(search)).total;
}

const showing = (page: Page) => page.getByText(/Showing/).first();
const firstRowName = (page: Page) => page.locator('tbody tr').first().locator('td').first();

test('shows a skeleton first, then the real table with the default Direct + Growth view', async ({ page }) => {
  await page.route('**/data/screener.json', async (route) => { await new Promise((r) => setTimeout(r, 600)); await route.continue(); });
  await page.goto('/');
  await expect(page.locator('tbody .skeleton').first()).toBeVisible();
  await expect(showing(page)).toBeVisible();
  await expect(page.locator('tbody .skeleton')).toHaveCount(0);
  const total = await expectedTotal(page, '');
  await expect(page.getByText(/of .* funds/).first()).toContainText(total.toLocaleString('en-IN'));
  await expect(page.getByRole('button', { name: /^Plan/ })).toContainText('1');
});

test('search filters the table, updates the URL and matches the pure function', async ({ page }) => {
  await page.goto('/');
  await expect(showing(page)).toBeVisible();
  await page.getByLabel('Search funds').fill('small cap');
  await expect(page).toHaveURL(/q=small(\+|%20)cap/);
  const total = await expectedTotal(page, '?q=small cap');
  expect(total).toBeGreaterThan(0);
  await expect(page.getByText(/of .* funds/).first()).toContainText(total.toLocaleString('en-IN'));
  await expect(firstRowName(page)).toContainText(/small/i);
});

test('sorting toggles direction and orders the rows', async ({ page }) => {
  await page.goto('/');
  await expect(showing(page)).toBeVisible();
  const header = page.getByRole('columnheader', { name: /^5Y/ });
  await header.getByRole('button').click();
  await expect(header).toHaveAttribute('aria-sort', 'descending');
  await expect(page).toHaveURL(/sort=r5y%3Adesc/);
  const col = async (): Promise<number[]> => {
    const idx = await page.locator('thead th').evaluateAll((ths) => ths.findIndex((t) => /^5Y/.test((t.textContent ?? '').trim())));
    const texts = await page.locator(`tbody tr td:nth-child(${idx + 1})`).allTextContents();
    return texts.filter((t) => t !== '—').map((t) => parseFloat(t.replace(/[+,%]/g, '')));
  };
  const desc = await col();
  expect(desc.slice(0, 10)).toEqual([...desc.slice(0, 10)].sort((a, b) => b - a));
  await header.getByRole('button').click();
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  const asc = await col();
  expect(asc.slice(0, 10)).toEqual([...asc.slice(0, 10)].sort((a, b) => a - b));
});

test('pagination moves pages, shows the range, and survives reload and Back', async ({ page }) => {
  await page.goto('/');
  await expect(showing(page)).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(showing(page)).toContainText('51');
  await page.reload();
  await expect(showing(page)).toContainText('51');
  await page.goBack();
  await expect(showing(page)).toContainText('1–50');
});

test('range filter excludes funds without data and agrees with the pure function', async ({ page }) => {
  await page.goto('/?min_r5y=15');
  await expect(showing(page)).toBeVisible();
  const total = await expectedTotal(page, '?min_r5y=15');
  expect(total).toBeGreaterThan(0);
  await expect(page.getByText(/of .* funds/).first()).toContainText(total.toLocaleString('en-IN'));
  const view = parseView('?min_r5y=15');
  expect(view.filters.ranges.r5y).toEqual({ min: 15 });
  expect(view.filters.plan).toEqual(DEFAULT_VIEW.filters.plan);
});

test('impossible filters show the empty state, and Clear filters recovers', async ({ page }) => {
  await page.goto('/?q=zzzzqqqq');
  await expect(page.getByText('No funds match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(showing(page)).toContainText('1–50');
});

test('a failed data load shows an error with Retry, and Retry recovers', async ({ page }) => {
  await page.route('**/data/screener.json', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Could not load fund data');
  await page.unroute('**/data/screener.json');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(showing(page)).toBeVisible();
});

test('theme toggle switches and is remembered after reload', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  const after = await html.getAttribute('data-theme');
  expect(after).not.toBe(before);
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', after as string);
});

test('no horizontal page scroll on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(showing(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
