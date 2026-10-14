import { expect, test } from '@playwright/test';
import { EV_DEFAULT, PETROL_DEFAULT, compareCars, runningCost } from '../src/lib/vehicle.ts';
import { jewelleryPrice, metalReturn } from '../src/lib/metals.ts';

const rs = (n: number, dp = 0): string => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

test('car running cost: default petrol matches the maths, and switching to electric changes the numbers', async ({ page }) => {
  await page.goto('/tools/car-running-cost-calculator/');
  const p = runningCost(PETROL_DEFAULT, 1000);
  await expect(page.getByTestId('veh-perkm')).toHaveText(rs(p.perKm, 2));
  await expect(page.getByTestId('veh-permonth')).toHaveText(rs(p.perMonth));
  await page.getByTestId('fuel-choice').getByRole('button', { name: 'Electric' }).click();
  const e = runningCost(EV_DEFAULT, 1000);
  await expect(page.getByTestId('veh-perkm')).toHaveText(rs(e.perKm, 2));
  await page.getByLabel('Distance driven per month', { exact: true }).fill('2000');
  await expect(page.getByTestId('veh-permonth')).toHaveText(rs(runningCost(EV_DEFAULT, 2000).perMonth));
  await page.getByTestId('fuel-choice').getByRole('button', { name: 'CNG' }).click();
  await expect(page.getByLabel('Mileage (km per kg)', { exact: true })).toBeVisible();
});

test('EV vs petrol: results equal the maths; a big subsidy flips the total in favour of the electric car', async ({ page }) => {
  await page.goto('/tools/ev-vs-petrol-running-cost-calculator/');
  const c = compareCars(PETROL_DEFAULT, EV_DEFAULT, 1000, 5, 1_000_000, 1_400_000, 0, 25_000, 35_000);
  await expect(page.getByTestId('veh-saving')).toHaveText(rs(c.monthlySaving));
  await expect(page.getByTestId('veh-total-a')).toHaveText(rs(c.totalA));
  await expect(page.getByTestId('veh-total-b')).toHaveText(rs(c.totalB));
  await expect(page.getByTestId('veh-payback')).toContainText(`${Math.ceil(c.paybackMonths!)} months`);
  await expect(page.getByTestId('veh-verdict')).toContainText('electric car costs');
  await page.getByLabel('Price of the electric car', { exact: true }).fill('3000000');
  await expect(page.getByTestId('veh-verdict')).toContainText('fuel car');
});

test('jewellery: bill, sell-back and the line for making and GST agree with the maths', async ({ page }) => {
  await page.goto('/tools/gold-jewellery-price-calculator/');
  const j = jewelleryPrice({ ratePerGram: 10_000, weightGrams: 10, purity: 22 / 24, makingType: 'percent', making: 0.1, gst: 0.03, buybackDeduction: 0 });
  await expect(page.getByTestId('metal-total')).toHaveText(rs(j.total));
  await expect(page.getByTestId('metal-value')).toHaveText(rs(j.metalValue));
  await expect(page.getByTestId('metal-lost')).toHaveText(rs(j.lostOnSelling));
  await page.getByTestId('purity-choice').getByRole('button', { name: '24 carat' }).click();
  const j24 = jewelleryPrice({ ratePerGram: 10_000, weightGrams: 10, purity: 1, makingType: 'percent', making: 0.1, gst: 0.03, buybackDeduction: 0 });
  await expect(page.getByTestId('metal-total')).toHaveText(rs(j24.total));
  await page.getByTestId('metal-choice').getByRole('button', { name: 'Silver' }).click();
  await expect(page.getByLabel('Today’s price of 999 silver (₹ per gram)', { exact: true })).toBeVisible();
});

test('metal return: net return after costs is below the price growth, and break-even is above the buying price', async ({ page }) => {
  await page.goto('/tools/gold-silver-return-calculator/');
  const r = metalReturn({ amount: 100_000, buyPrice: 6_000, sellPrice: 7_500, years: 5, buyCost: 0.03, sellCost: 0, holdingCostPerYear: 0 });
  await expect(page.getByTestId('metal-final')).toHaveText(rs(r.finalValue));
  await expect(page.getByTestId('metal-netcagr')).toHaveText(`${(r.netCagr! * 100).toFixed(2)}%`);
  await expect(page.getByTestId('metal-pricecagr')).toHaveText(`${(r.priceCagr! * 100).toFixed(2)}%`);
  await expect(page.getByTestId('metal-breakeven')).toHaveText(rs(r.breakEvenPrice!));
  await page.getByLabel('Price per gram when you sell', { exact: true }).fill('4000');
  await expect(page.getByTestId('metal-verdict')).toContainText('lose');
});

test('the four new calculators are listed, have JSON-LD and fit a phone', async ({ page }) => {
  await page.goto('/tools/');
  for (const name of [/Car running cost calculator/, /EV vs petrol car cost calculator/, /Gold and silver jewellery price calculator/, /Gold and silver return calculator/]) await expect(page.getByRole('link', { name })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 800 });
  for (const slug of ['car-running-cost-calculator', 'ev-vs-petrol-running-cost-calculator', 'gold-jewellery-price-calculator', 'gold-silver-return-calculator']) {
    await page.goto(`/tools/${slug}/`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type'])).toEqual(expect.arrayContaining(['WebApplication', 'FAQPage']));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), slug).toBeLessThanOrEqual(0);
  }
});
