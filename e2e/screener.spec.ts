import { expect, test, type Page } from '@playwright/test';
import { applyView, prepare } from '../src/lib/screener/query.ts';
import { parseView } from '../src/lib/screener/url.ts';
import type { ScreenerData } from '../src/lib/screener/types.ts';

/** The expected result count for a URL query, computed by the pure functions on the real data file. */
async function expectedTotal(page: Page, search: string): Promise<number> {
  const res = await page.request.get('/data/screener.json');
  const data = (await res.json()) as ScreenerData;
  return applyView(prepare(data), parseView(search)).total;
}

const showing = (page: Page) => page.getByTestId('result-count');

/** The built dataset, so tests derive their inputs from it instead of assuming a full-size dataset. */
async function loadData(page: Page): Promise<ScreenerData> {
  return (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
}
const firstRowName = (page: Page) => page.locator('tbody tr').first().locator('td').first();

test('shows a skeleton first, then the real table with the default Direct + Growth view', async ({ page }) => {
  await page.route('**/data/screener.json', async (route) => { await new Promise((r) => setTimeout(r, 600)); await route.continue(); });
  await page.goto('/');
  await expect(page.locator('tbody .skeleton').first()).toBeVisible();
  await expect(showing(page)).toBeVisible();
  await expect(page.locator('tbody .skeleton')).toHaveCount(0);
  const total = await expectedTotal(page, '');
  await expect(page.getByTestId('result-count')).toContainText(total.toLocaleString('en-IN'));
  await expect(page.getByRole('button', { name: /^Plan/ })).toContainText('1');
});

test('search filters the table, updates the URL and matches the pure function', async ({ page }) => {
  const data = await loadData(page);
  // Use the first two words of a real fund name, so there is always at least one match.
  const idx = data.name.findIndex((_, i) => data.dict.plan[data.plan[i]] === 'direct' && data.dict.option[data.option[i]] === 'growth');
  const term = data.name[idx].split(/\s+/).slice(0, 2).join(' ');
  await page.goto('/');
  await expect(showing(page)).toBeVisible();
  await page.getByLabel('Search funds').fill(term);
  await expect(page).toHaveURL(/q=/);
  const total = await expectedTotal(page, `?q=${encodeURIComponent(term)}`);
  expect(total).toBeGreaterThan(0);
  await expect(showing(page)).toContainText(total.toLocaleString('en-IN'));
  await expect(firstRowName(page)).toContainText(term.split(' ')[0], { ignoreCase: true });
});

test('sorting toggles direction and orders the rows', async ({ page }) => {
  await page.goto('/');
  await expect(showing(page)).toBeVisible();
  const header = page.getByRole('columnheader', { name: /^5Y/ });
  await header.getByRole('button', { name: /^5Y/ }).click();
  await expect(header).toHaveAttribute('aria-sort', 'descending');
  await expect(page).toHaveURL(/sort=r5y%3Adesc/);
  const col = async (): Promise<number[]> => {
    const idx = await page.locator('thead th').evaluateAll((ths) => ths.findIndex((t) => /^5Y/.test((t.textContent ?? '').trim())));
    const texts = await page.locator(`tbody tr td:nth-child(${idx + 1})`).allTextContents();
    return texts.filter((t) => t !== '—').map((t) => parseFloat(t.replace(/[+,%]/g, '')));
  };
  const desc = await col();
  expect(desc.slice(0, 10)).toEqual([...desc.slice(0, 10)].sort((a, b) => b - a));
  await header.getByRole('button', { name: /^5Y/ }).click();
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  const asc = await col();
  expect(asc.slice(0, 10)).toEqual([...asc.slice(0, 10)].sort((a, b) => a - b));
});

test('pagination moves pages, shows the range, and survives reload and Back', async ({ page }) => {
  const data = await loadData(page);
  const total = applyView(prepare(data), parseView('?size=25')).total;
  test.skip(total <= 25, `dataset too small for a second page (${total} funds in the default view)`);
  await page.goto('/?size=25');
  await expect(showing(page)).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(showing(page)).toContainText('26');
  await page.reload();
  await expect(showing(page)).toContainText('26');
  await page.goBack();
  await expect(showing(page)).toContainText('1–25');
});

test('range filter excludes funds without data and agrees with the pure function', async ({ page }) => {
  const data = await loadData(page);
  const vals = data.metrics.r5y.filter((v): v is number => v !== null).map((v) => v * 100).sort((a, b) => a - b);
  test.skip(vals.length === 0, 'no fund in this dataset has a 5-year return');
  const threshold = Math.floor(vals[Math.floor(vals.length / 2)]); // the median, so some but not all funds pass
  const search = `?min_r5y=${threshold}&plan=&opt=`;
  await page.goto(`/${search}`);
  await expect(showing(page)).toBeVisible();
  const total = await expectedTotal(page, search);
  expect(total).toBeGreaterThan(0);
  await expect(showing(page)).toContainText(total.toLocaleString('en-IN'));
  expect(total).toBeLessThanOrEqual(vals.length); // funds with no 5Y value are excluded, not counted as 0
  expect(parseView(search).filters.ranges.r5y).toEqual({ min: threshold });
});

test('impossible filters show the empty state, and Clear filters recovers', async ({ page }) => {
  await page.goto('/?q=zzzzqqqq');
  await expect(page.getByText('No funds match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(showing(page)).toContainText(/1–\d+/);
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

test.describe('phone layout', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('filter buttons sit behind a Filters toggle; popovers stay on screen', async ({ page }) => {
    await page.goto('/');
    await expect(showing(page)).toBeVisible();
    const toolbar = page.getByRole('search');
    await expect(toolbar.getByRole('button', { name: /^Category/ })).toBeHidden();
    await page.getByRole('button', { name: /^Filters/ }).click();
    await expect(toolbar.getByRole('button', { name: /^Category/ })).toBeVisible();

    for (const name of [/^Ranges/, /^Columns/, /^Fund house/]) {
      await toolbar.getByRole('button', { name }).click();
      const panel = page.locator('[role="dialog"], [role="listbox"]').first();
      await expect(panel).toBeVisible();
      const box = await panel.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? 0)).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(376);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await page.keyboard.press('Escape');
    }
  });

  test('active filters are counted on the Filters button', async ({ page }) => {
    await page.goto('/?cat=Any%20Category');
    await expect(showing(page)).toBeVisible();
    // Plan + Option defaults and Category = 3 active groups
    await expect(page.getByRole('button', { name: /^Filters/ })).toContainText('3');
  });
});

test('TER column: filter max_ter matches the pure function and every shown row is within the limit', async ({ page }) => {
  await page.goto('/?max_ter=1');
  const total = await expectedTotal(page, '?max_ter=1');
  await expect(showing(page)).toContainText(total.toLocaleString('en-IN'));
  const idx = await page.locator('thead th').evaluateAll((ths) => ths.findIndex((t) => /^TER/.test((t.textContent ?? '').trim())));
  expect(idx).toBeGreaterThan(0);
  const cells = await page.locator('tbody tr').evaluateAll((rows, i) => rows.map((r) => (r.querySelectorAll('td')[i]?.textContent ?? '').trim()), idx);
  for (const c of cells) {
    expect(c).not.toBe('—'); // a fund with no TER must not slip into "TER at most 1%"
    expect(parseFloat(c)).toBeLessThanOrEqual(1);
  }
});
