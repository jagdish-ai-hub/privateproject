import { expect, test } from '@playwright/test';
import { deposit, emi, flatEmi, inflation, loan, rateFromEmi } from '../src/lib/loans.ts';

const rs = (n: number): string => '₹' + Math.round(n).toLocaleString('en-IN');

test('home loan: default EMI, interest and total match the maths', async ({ page }) => {
  await page.goto('/tools/home-loan-emi-calculator/');
  const r = loan({ amount: 5_000_000, rate: 0.0875, years: 20, feePct: 0.005 });
  await expect(page.getByTestId('loan-emi')).toHaveText(rs(r.emi));
  await expect(page.getByTestId('loan-interest')).toHaveText(rs(r.totalInterest));
  await expect(page.getByTestId('loan-total')).toHaveText(rs(r.totalPaid));
  await expect(page.getByTestId('loan-saved')).toHaveCount(0);
});

test('home loan: an extra monthly payment shows the interest and time saved', async ({ page }) => {
  await page.goto('/tools/home-loan-emi-calculator/');
  await page.getByTestId('more-assumptions').locator('summary').click();
  await page.getByLabel('Extra payment every month', { exact: true }).fill('5000');
  const p = loan({ amount: 5_000_000, rate: 0.0875, years: 20, extraMonthly: 5_000, feePct: 0.005 });
  await expect(page.getByTestId('loan-saved')).toHaveText(rs(p.interestSaved));
  await expect(page.getByTestId('loan-timesaved')).toContainText(`${Math.floor(p.monthsSaved / 12)} year`);
  await expect(page.getByTestId('loan-emi')).toHaveText(rs(emi(5_000_000, 0.0875, 20)));
});

test('car loan: flat rate shows the equivalent reducing-balance rate and the flat-rate EMI', async ({ page }) => {
  await page.goto('/tools/car-loan-emi-calculator/');
  await page.getByTestId('rate-type').getByRole('button', { name: 'Flat rate' }).click();
  await page.getByLabel('Interest rate (per year)', { exact: true }).fill('8');
  const e = flatEmi(800_000, 0.08, 5);
  const eff = rateFromEmi(800_000, e, 5)!;
  await expect(page.getByTestId('loan-emi')).toHaveText(rs(e));
  await expect(page.getByTestId('loan-effrate')).toHaveText(`${(eff * 100).toFixed(2)}%`);
  expect(eff).toBeGreaterThan(0.13);
});

test('personal loan: the processing fee is in the total', async ({ page }) => {
  await page.goto('/tools/personal-loan-emi-calculator/');
  const r = loan({ amount: 300_000, rate: 0.14, years: 3, feePct: 0.02 });
  await expect(page.getByTestId('loan-emi')).toHaveText(rs(r.emi));
  await expect(page.getByTestId('loan-total')).toHaveText(rs(r.totalPaid));
});

test('FD: maturity, tax, after-tax and real return match the maths, and compounding changes the result', async ({ page }) => {
  await page.goto('/tools/fd-calculator/');
  const d = deposit({ amount: 100_000, rate: 0.07, years: 5, perYear: 4, taxRate: 0.3, inflation: 0.05 });
  await expect(page.getByTestId('fd-maturity')).toHaveText(rs(d.maturity));
  await expect(page.getByTestId('fd-tax')).toHaveText(rs(d.tax));
  await expect(page.getByTestId('fd-after')).toHaveText(rs(d.maturityAfterTax));
  await expect(page.getByTestId('fd-todays')).toHaveText(rs(d.maturityInTodaysMoney));
  await expect(page.getByTestId('fd-real')).toHaveText(`${(d.realRate * 100).toFixed(2)}%`);
  await page.getByTestId('compounding').getByRole('button', { name: 'Yearly', exact: true }).click();
  await expect(page.getByTestId('fd-maturity')).toHaveText(rs(deposit({ amount: 100_000, rate: 0.07, years: 5, perYear: 1, taxRate: 0.3, inflation: 0.05 }).maturity));
  await page.getByTestId('more-assumptions').locator('summary').click();
  await page.getByLabel('Inflation (per year)', { exact: true }).fill('9');
  await expect(page.getByTestId('fd-verdict')).toContainText('loses buying power');
});

test('inflation: future cost and buying power match the maths', async ({ page }) => {
  await page.goto('/tools/inflation-calculator/');
  const r = inflation(100_000, 0.06, 10);
  await expect(page.getByTestId('infl-future')).toHaveText(rs(r.futureCost));
  await expect(page.getByTestId('infl-power')).toHaveText(rs(r.buyingPower));
  await expect(page.getByTestId('infl-lost')).toHaveText(`${(r.lostShare * 100).toFixed(2)}%`);
});

test('the five new calculators have JSON-LD, link to their guide, and fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const slug of ['home-loan-emi-calculator', 'car-loan-emi-calculator', 'personal-loan-emi-calculator', 'fd-calculator', 'inflation-calculator']) {
    await page.goto(`/tools/${slug}/`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type']), slug).toEqual(expect.arrayContaining(['WebApplication', 'FAQPage']));
    await expect(page.getByTestId('tool-guide').getByRole('link')).toHaveAttribute('href', /^\/learn\//);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), slug).toBeLessThanOrEqual(0);
  }
});
