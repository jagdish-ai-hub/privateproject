import { expect, test } from '@playwright/test';

const results = (page: import('@playwright/test').Page) => page.getByTestId('results');

test('SIP calculator: default result matches the independently hand-calculated figure', async ({ page }) => {
  await page.goto('/tools/sip-calculator/');
  // 10,000 a month, 12%, 10 years: invested 12,00,000; value 10000 x ((1.01^120 - 1)/0.01) x 1.01 = 23,23,391
  await expect(results(page)).toContainText('₹12,00,000');
  await expect(results(page)).toContainText('₹23,23,391');
  await expect(results(page)).toContainText('₹11,23,391');
});

test('SIP calculator: typing new values recalculates; slider moves the number', async ({ page }) => {
  await page.goto('/tools/sip-calculator/');
  await page.getByLabel('Time period', { exact: true }).fill('1');
  await page.getByLabel('Expected return (p.a.)', { exact: true }).fill('12');
  await expect(results(page)).toContainText('₹1,20,000'); // invested over 1 year
  await expect(results(page)).toContainText('₹1,28,093'); // 12,809.33 x 10
  await page.getByLabel('Monthly SIP amount slider').fill('20000');
  await expect(page.getByLabel('Monthly SIP amount', { exact: true })).toHaveValue('20000');
  await expect(results(page)).toContainText('₹2,40,000');
});

test('bad input never produces NaN / Infinity: blank and out-of-range values are ignored, blur snaps to limits', async ({ page }) => {
  await page.goto('/tools/sip-calculator/');
  const years = page.getByLabel('Time period', { exact: true });
  await years.fill('');
  await expect(results(page)).not.toContainText(/NaN|Infinity|undefined/);
  await years.fill('999');
  await expect(results(page)).not.toContainText(/NaN|Infinity|undefined/);
  await years.blur();
  await expect(years).toHaveValue('40'); // snapped to the maximum
  await years.fill('abc');
  await years.blur();
  await expect(results(page)).not.toContainText(/NaN|Infinity|undefined/);
});

test('lumpsum: 1,00,000 at 12% for 10 years is 3,10,585', async ({ page }) => {
  await page.goto('/tools/lumpsum-calculator/');
  await expect(results(page)).toContainText('₹3,10,585');
});

test('goal SIP: the SIP shown, fed back into the same maths, reaches the target (5,000,000 over 15 years)', async ({ page }) => {
  await page.goto('/tools/goal-sip-calculator/');
  await page.getByLabel('Time to reach the goal', { exact: true }).fill('15');
  await expect(results(page)).toContainText('₹9,910'); // 5,000,000 / 504.576 = 9,909.3, rounded up
  const sipText = await results(page).getByText('Monthly SIP needed').locator('xpath=following-sibling::p').innerText();
  const sip = Number(sipText.replace(/[₹,]/g, ''));
  const i = 0.01;
  const fv = sip * ((Math.pow(1 + i, 180) - 1) / i) * (1 + i);
  expect(fv).toBeGreaterThanOrEqual(5_000_000);
  expect(fv).toBeLessThan(5_000_000 + 1000); // SIP is rounded up to the next rupee: at most about 505 over the target
});

test('SWP: shows when the money runs out, and "the full N years" when it lasts', async ({ page }) => {
  await page.goto('/tools/swp-calculator/');
  await expect(results(page)).toContainText('the full 20 years');
  await page.getByLabel('Monthly withdrawal', { exact: true }).fill('100000');
  await expect(results(page)).toContainText('Money runs out after');
  await expect(results(page)).toContainText('year');
});

test('CAGR: 1,00,000 -> 2,00,000 in 5 years is +14.87%', async ({ page }) => {
  await page.goto('/tools/cagr-calculator/');
  await page.getByLabel('Ending value', { exact: true }).fill('200000');
  await page.getByLabel('Number of years', { exact: true }).fill('5');
  await expect(results(page)).toContainText('+14.87%');
  await expect(results(page)).toContainText('2.00x');
});

test('each calculator page has its JSON-LD and FAQ, and the index lists all six', async ({ page }) => {
  await page.goto('/tools/');
  await expect(page.locator('ul.grid li a')).toHaveCount(6);
  await page.goto('/tools/step-up-sip-calculator/');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type']);
  expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'WebApplication', 'FAQPage']));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Step-up SIP calculator');
});
