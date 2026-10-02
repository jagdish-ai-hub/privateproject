import { expect, test, type Page } from '@playwright/test';
import { fundSlug } from '../src/lib/slug.ts';
import type { ScreenerData } from '../src/lib/screener/types.ts';

/** The first fund among the pages built for e2e (MAX_FUND_PAGES=30) with 1Y, 3Y and 5Y returns. */
async function pickFund(page: Page): Promise<{ path: string; name: string }> {
  const data = (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
  for (let i = 0; i < Math.min(30, data.count); i++) {
    if (data.metrics.r1y[i] !== null && data.metrics.r3y[i] !== null && data.metrics.r5y[i] !== null) {
      return { path: `/fund/${fundSlug(data.name[i], data.code[i])}/`, name: data.name[i] };
    }
  }
  throw new Error('no suitable fund among the first 30 built pages');
}

/** Days spanned by the chart's actual visible range (read from the data attributes the chart sets). */
async function visibleSpanDays(page: Page, expectDays: number): Promise<number> {
  const box = page.locator('[data-visible-from]');
  let span = 0;
  await expect(async () => {
    const from = await box.getAttribute('data-visible-from');
    const to = await box.getAttribute('data-visible-to');
    span = (Date.parse(to as string) - Date.parse(from as string)) / 86_400_000;
    expect(Math.abs(span - expectDays)).toBeLessThanOrEqual(15);
  }).toPass({ timeout: 5000 });
  return span;
}

/** The "Return" cell for a row label in the Returns table, e.g. "+11.95%". */
const tableReturn = (page: Page, label: string) =>
  page.locator('table', { has: page.locator('caption', { hasText: /^Returns of/ }) }).locator('tr', { hasText: label }).locator('td').nth(2);

test('fund page: heading, chart, and chart % always equals the returns table', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const fund = await pickFund(page);
  await page.goto(fund.path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fund.name);
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 });

  const shown = page.locator('p[aria-live="polite"]').first();
  for (const [button, row] of [['1Y', '1 year'], ['3Y', '3 years'], ['5Y', '5 years']] as const) {
    await page.getByRole('group', { name: 'Chart range' }).getByRole('button', { name: button, exact: true }).click();
    await expect(shown).toContainText((await tableReturn(page, row).innerText()).trim());
    await visibleSpanDays(page, { '1Y': 365, '3Y': 1096, '5Y': 1826 }[button]); // the chart really shows that window
  }
  expect(errors).toEqual([]);
});

test('fund page: the default chart range agrees with the table even when the chart loads late (race regression)', async ({ page }) => {
  // Delay the chart library so it finishes loading after the default range has been chosen.
  await page.route('**/lightweight-charts*.js', async (r) => { await new Promise((x) => setTimeout(x, 800)); await r.continue(); });
  await page.route('**/_astro/*lightweight*', async (r) => { await new Promise((x) => setTimeout(x, 800)); await r.continue(); });
  const fund = await pickFund(page);
  await page.goto(fund.path);
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 });
  const active = page.getByRole('group', { name: 'Chart range' }).locator('button[aria-pressed="true"]');
  const label = (await active.innerText()).trim();
  const row = ({ '1M': '1 month', '3M': '3 months', '6M': '6 months', '1Y': '1 year', '3Y': '3 years', '5Y': '5 years' } as Record<string, string>)[label];
  if (row) await expect(page.locator('p[aria-live="polite"]').first()).toContainText((await tableReturn(page, row).innerText()).trim());
  // The chart's real visible window must match the active button, not a stale default.
  const days = ({ '1M': 30, '3M': 91, '6M': 182, '1Y': 365, '3Y': 1096, '5Y': 1826 } as Record<string, number>)[label];
  expect(days, `unexpected active range ${label}`).toBeDefined();
  await visibleSpanDays(page, days);
});

test('fund page: JSON-LD is valid JSON with breadcrumb, fund and FAQ markup, and FAQ is visible', async ({ page }) => {
  const fund = await pickFund(page);
  await page.goto(fund.path);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type']);
  expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'InvestmentFund', 'FAQPage']));
  const faq = JSON.parse(blocks[types.indexOf('FAQPage')]) as { mainEntity: { name: string }[] };
  for (const q of faq.mainEntity) await expect(page.locator('summary', { hasText: q.name }).first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${fund.path}$`));
});

test('fund page: if the chart data fails to load, an error with Retry is shown, and Retry recovers', async ({ page }) => {
  await page.route('**/data/nav/*.json', (r) => r.abort());
  const fund = await pickFund(page);
  await page.goto(fund.path);
  await expect(page.getByRole('alert')).toContainText('chart data could not be loaded');
  await page.unroute('**/data/nav/*.json');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 });
});

test('fund page: a skeleton of the same height is shown while chart data loads (no layout jump)', async ({ page }) => {
  await page.route('**/data/nav/*.json', async (r) => { await new Promise((x) => setTimeout(x, 700)); await r.continue(); });
  const fund = await pickFund(page);
  await page.goto(fund.path);
  const skeleton = page.getByLabel('Loading chart');
  await expect(skeleton).toBeVisible();
  const h1 = (await skeleton.boundingBox())?.height ?? 0;
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 });
  const chartBox = await page.locator('[data-visible-from]').first().evaluate((el) => el.parentElement?.getBoundingClientRect().height ?? 0);
  expect(Math.abs(h1 - chartBox)).toBeLessThanOrEqual(2);
});
