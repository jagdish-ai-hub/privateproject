import { expect, test } from '@playwright/test';
import { rebase } from '../src/lib/compare.ts';
import type { ScreenerData } from '../src/lib/screener/types.ts';

/** Codes of the first funds that have 5Y returns (so a 5Y comparison window exists). */
async function oldFunds(page: import('@playwright/test').Page, n: number): Promise<{ code: number; name: string }[]> {
  const d = (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
  const out: { code: number; name: string }[] = [];
  for (let i = 0; i < d.count && out.length < n; i++) if (d.metrics.r5y[i] !== null && d.dict.plan[d.plan[i]] === 'direct' && d.dict.option[d.option[i]] === 'growth') out.push({ code: d.code[i], name: d.name[i] });
  return out;
}

test('empty state asks for two funds', async ({ page }) => {
  await page.goto('/compare/');
  await expect(page.getByTestId('compare-empty')).toBeVisible();
});

test('search, add two funds, see chart + metrics table; URL keeps the selection', async ({ page }) => {
  const [a, b] = await oldFunds(page, 2);
  await page.goto('/compare/');
  await page.getByLabel('Search a fund to add').fill(a.name.slice(0, 14));
  await page.getByRole('listbox', { name: 'Matching funds' }).getByRole('option').first().click();
  await expect(page).toHaveURL(/f=\d+/);
  await page.getByLabel('Search a fund to add').fill(b.name.slice(0, 14));
  await page.getByRole('listbox', { name: 'Matching funds' }).getByRole('option').first().click();
  await expect(page.locator('[data-compare-chart] canvas').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('table', { name: 'Side-by-side metrics' })).toContainText('1Y');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Selected funds' }).getByRole('listitem')).toHaveCount(2);
});

test('every legend value starts from the same scale, and the end values equal the rebased maths', async ({ page }) => {
  const funds = await oldFunds(page, 2);
  await page.goto(`/compare/?f=${funds.map((f) => f.code).join(',')}`);
  await expect(page.locator('[data-compare-chart] canvas').first()).toBeVisible({ timeout: 10_000 });
  const series = await Promise.all(funds.map(async (f) => { const j = await (await page.request.get(`/data/nav/${f.code}.json`)).json() as { d: number[]; n: number[] }; return { code: f.code, days: j.d, navs: j.n }; }));
  const active = (await page.getByRole('group', { name: 'Comparison window' }).locator('button[aria-pressed="true"]').innerText()).trim();
  const months = ({ '1Y': 12, '3Y': 36, '5Y': 60, Max: 0 } as Record<string, number>)[active];
  const expected = rebase(series, months);
  expect(expected).not.toBeNull();
  const legend = (await page.getByTestId('legend-value').allInnerTexts()).map((t) => parseFloat(t));
  expected?.lines.forEach((l, i) => expect(legend[i]).toBeCloseTo(l.values[l.values.length - 1], 1));
  // The ₹1 lakh view is the same numbers times 1,000, with Indian digit grouping.
  await page.getByRole('button', { name: '₹1 lakh invested' }).click();
  const rupees = await page.getByTestId('legend-value').allInnerTexts();
  expected?.lines.forEach((l, i) => expect(rupees[i]).toBe(`₹${Math.round(l.values[l.values.length - 1] * 1000).toLocaleString('en-IN')}`));
});

test('removing a fund goes back to the empty prompt; unknown codes in the URL are ignored', async ({ page }) => {
  const [a] = await oldFunds(page, 1);
  await page.goto(`/compare/?f=${a.code},999999999`);
  await expect(page.getByRole('list', { name: 'Selected funds' }).getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', { name: /^Remove/ }).click();
  await expect(page.getByTestId('compare-empty')).toBeVisible();
});

test('a young fund disables the long windows instead of showing a partial comparison', async ({ page }) => {
  const d = (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
  const newest = d.inception.reduce((best, v, i) => (v > d.inception[best] ? i : best), 0);
  const old = (await oldFunds(page, 1))[0];
  await page.goto(`/compare/?f=${old.code},${d.code[newest]}`);
  await expect(page.locator('[data-compare-chart] canvas, [role="alert"], :text("too new")').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('group', { name: 'Comparison window' }).getByRole('button', { name: '5Y', exact: true })).toBeDisabled();
});

test('on a phone the chart still shows the whole comparison window (nothing cut off on the left)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // The longest-lived Direct Growth funds: the most points to squeeze into a phone-width chart.
  const d = (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
  const funds = Array.from({ length: d.count }, (_, i) => i)
    .filter((i) => d.dict.plan[d.plan[i]] === 'direct' && d.dict.option[d.option[i]] === 'growth')
    .sort((a, b) => d.inception[a] - d.inception[b]).slice(0, 2).map((i) => ({ code: d.code[i] }));
  await page.goto(`/compare/?f=${funds.map((f) => f.code).join(',')}`);
  const box = page.locator('[data-compare-chart]');
  await expect(box.locator('canvas').first()).toBeVisible({ timeout: 10_000 });
  const series = await Promise.all(funds.map(async (f) => { const j = await (await page.request.get(`/data/nav/${f.code}.json`)).json() as { d: number[]; n: number[] }; return { code: f.code, days: j.d, navs: j.n }; }));
  for (const [label, months] of [['Max', 0], ['5Y', 60], ['3Y', 36], ['1Y', 12]] as const) {
    const btn = page.getByRole('group', { name: 'Comparison window' }).getByRole('button', { name: label, exact: true });
    if (await btn.isDisabled()) continue;
    await btn.click();
    const start = rebase(series, months)!.startDay;
    await expect(async () => {
      const from = Date.parse((await box.getAttribute('data-visible-from')) as string) / 86_400_000;
      expect(Math.abs(from - start)).toBeLessThanOrEqual(15);
    }).toPass({ timeout: 5000 });
  }
});

test('insights: the cost and size sentences quote the same numbers as the table, and an (i) explains the term', async ({ page }) => {
  const d = (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
  const picks = Array.from({ length: d.count }, (_, i) => i)
    .filter((i) => d.dict.plan[d.plan[i]] === 'direct' && d.dict.option[d.option[i]] === 'growth' && d.ter[i] !== null && d.aum[i] !== null && d.metrics.r3y[i] !== null && d.metrics.vol3y[i] !== null)
    .filter((i, k, a) => d.ter[i] !== d.ter[a[0]] || k === 0).slice(0, 2);
  expect(picks.length).toBe(2);
  await page.goto(`/compare/?f=${picks.map((i) => d.code[i]).join(',')}`);
  const panel = page.getByTestId('insights');
  await expect(panel).toBeVisible({ timeout: 10_000 });
  const cheaper = picks.reduce((a, b) => ((d.ter[a] as number) <= (d.ter[b] as number) ? a : b));
  await expect(panel.locator('[data-insight="cost"]')).toContainText(`${(d.ter[cheaper] as number).toFixed(2)}%`);
  await expect(page.getByTestId('insights-headline')).toContainText('leads on');
  await panel.locator('[data-insight="cost"]').getByRole('button', { name: /What is TER/ }).click();
  await expect(page.locator('.info-pop:popover-open')).toContainText('Total Expense Ratio');
});
