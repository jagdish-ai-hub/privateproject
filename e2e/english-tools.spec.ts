import { expect, test, type Page } from '@playwright/test';
import { TOOLS } from '../src/lib/tools.ts';
import { loanEligibility, emi } from '../src/lib/loans.ts';
import { fuelCost, mileage } from '../src/lib/vehicle.ts';
import { goldSip } from '../src/lib/metals.ts';
import { xirrOf } from '../src/lib/xirrTool.ts';

/** English-only calculators: they work, their numbers match the maths, and they have no Hindi twin. */
const ONLY = TOOLS.filter((t) => t.englishOnly);

/** Wait until the page's islands have hydrated, so a click or fill is not lost. */
async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
}
const rupees = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

test('six English-only calculators exist and are listed on the English index only', async ({ page }) => {
  expect(ONLY.map((t) => t.slug).sort()).toEqual(['emi-calculator', 'fuel-cost-calculator', 'gold-sip-calculator', 'home-loan-eligibility-calculator', 'mileage-calculator', 'xirr-calculator']);
  await page.goto('/tools/');
  for (const t of ONLY) await expect(page.locator(`ul.grid li a[href="/tools/${t.slug}/"]`)).toBeVisible();
  await page.goto('/hi/tools/');
  for (const t of ONLY) await expect(page.locator(`a[href="/hi/tools/${t.slug}/"]`)).toHaveCount(0);
});

for (const t of ONLY) {
  test(`${t.slug}: English only (no Hindi alternate, no language switch, no Hindi page), with byline, sources, FAQ and structured data`, async ({ page }) => {
    await page.goto(`/tools/${t.slug}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');
    await expect(page.locator('link[rel="alternate"][hreflang="hi-IN"]')).toHaveCount(0);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(0);
    await expect(page.getByTestId('lang-switch')).toHaveCount(0);
    await expect(page.getByTestId('lang-switch-mobile')).toHaveCount(0);
    expect((await page.request.get(`/hi/tools/${t.slug}/`)).status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByTestId('byline')).toContainText('Omm');
    await expect(page.getByTestId('sources')).toBeVisible();
    await expect(page.getByTestId('tool-guide')).toBeVisible();
    await expect(page.getByTestId('related-tools').locator('a').first()).toBeVisible();
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type']);
    expect(types).toEqual(expect.arrayContaining(['WebApplication', 'FAQPage', 'WebPage']));
    const faq = JSON.parse(blocks[types.indexOf('FAQPage')]) as { mainEntity: unknown[] };
    expect(faq.mainEntity.length).toBe(t.faqs.length);
    await expect(page.locator('details summary').filter({ hasText: t.faqs[0].question })).toBeVisible();
    // every input has its own id and every label points at an input that exists
    const ids = await page.locator('form input[id]').evaluateAll((els) => els.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    const broken = await page.locator('form label[for]').evaluateAll((ls) => ls.filter((l) => document.getElementById((l as HTMLLabelElement).htmlFor) === null).length);
    expect(broken).toBe(0);
  });
}

test('home loan eligibility matches the maths and reacts to the inputs', async ({ page }) => {
  await page.goto('/tools/home-loan-eligibility-calculator/');
  await hydrated(page);
  const r = loanEligibility({ income: 100_000, existingEmi: 0, emiShare: 0.5, rate: 0.0875, years: 20 });
  await expect(page.getByTestId('elig-loan')).toHaveText(rupees(r.maxLoan));
  await expect(page.getByTestId('elig-emi')).toHaveText(rupees(r.maxEmi));
  expect(emi(r.maxLoan, 0.0875, 20)).toBeCloseTo(r.maxEmi, 4);
  await page.getByLabel('EMIs you already pay each month', { exact: true }).fill('20000');
  const r2 = loanEligibility({ income: 100_000, existingEmi: 20_000, emiShare: 0.5, rate: 0.0875, years: 20 });
  await expect(page.getByTestId('elig-loan')).toHaveText(rupees(r2.maxLoan));
  await page.getByLabel('EMIs you already pay each month', { exact: true }).fill('60000');
  await expect(page.getByTestId('elig-verdict')).toContainText('no room for a new loan');
  await expect(page.getByTestId('elig-loan')).toHaveText('₹0');
});

test('general EMI calculator gives the same EMI as the loan maths and shows the prepayment section', async ({ page }) => {
  await page.goto('/tools/emi-calculator/');
  await hydrated(page);
  await expect(page.getByTestId('loan-emi')).toHaveText(rupees(emi(1_000_000, 0.10, 5)));
  await expect(page.getByTestId('more-assumptions')).toBeVisible();
  await expect(page.getByTestId('rate-type')).toBeVisible();
});

test('XIRR calculator: example matches the maths, rows can be added and removed, bad dates are explained', async ({ page }) => {
  await page.goto('/tools/xirr-calculator/');
  await hydrated(page);
  const rows = [
    { date: '2023-01-10', amount: 100_000, kind: 'in' as const },
    { date: '2024-01-10', amount: 100_000, kind: 'in' as const },
    { date: '2025-01-10', amount: 100_000, kind: 'in' as const },
  ];
  const want = xirrOf(rows, 400_000, '2026-01-10');
  await expect(page.getByTestId('xirr-rate')).toHaveText(`${(want.rate! * 100).toFixed(2)}%`);
  await expect(page.getByTestId('xirr-invested')).toHaveText('₹3,00,000');
  await expect(page.getByTestId('xirr-row')).toHaveCount(3);
  await page.getByTestId('xirr-add').click();
  await expect(page.getByTestId('xirr-row')).toHaveCount(4);
  await page.getByRole('button', { name: 'Remove row 4' }).click();
  await expect(page.getByTestId('xirr-row')).toHaveCount(3);
  await page.getByTestId('xirr-value').fill('250000');
  const loss = xirrOf(rows, 250_000, '2026-01-10');
  await expect(page.getByTestId('xirr-rate')).toHaveText(`${(loss.rate! * 100).toFixed(2)}%`);
  expect(loss.rate!).toBeLessThan(0);
  await page.getByTestId('xirr-value-date').fill('2022-01-01');
  await expect(page.getByTestId('xirr-problem')).toContainText('after the first investment');
  await expect(page.getByTestId('xirr-rate')).toHaveText('—');
});

test('fuel cost calculator matches the maths, switches fuel and applies the real-world cut', async ({ page }) => {
  await page.goto('/tools/fuel-cost-calculator/');
  await hydrated(page);
  const base = fuelCost({ fuelPrice: 100, kmPerUnit: 18, mileageCut: 0, tripKm: 300, kmPerMonth: 1_000, people: 1 });
  await expect(page.getByTestId('fuel-trip')).toHaveText(rupees(base.tripCost));
  await expect(page.getByTestId('fuel-month')).toHaveText(rupees(base.perMonth));
  await expect(page.getByTestId('fuel-perkm')).toHaveText(`₹${base.perKm.toFixed(2)}`);
  await page.getByTestId('more-assumptions').locator('summary').click();
  await page.getByLabel('Lower the mileage for real driving by', { exact: true }).fill('20');
  const cut = fuelCost({ fuelPrice: 100, kmPerUnit: 18, mileageCut: 0.2, tripKm: 300, kmPerMonth: 1_000, people: 1 });
  await expect(page.getByTestId('fuel-trip')).toHaveText(rupees(cut.tripCost));
  await page.getByLabel('People sharing the trip cost', { exact: true }).fill('4');
  await expect(page.getByTestId('fuel-perperson')).toHaveText(rupees(cut.tripCost / 4));
  await page.getByTestId('fuel-type').getByRole('button', { name: 'CNG' }).click();
  await expect(page.getByLabel('Fuel price per kg', { exact: true })).toHaveValue('80');
});

test('mileage calculator matches the maths', async ({ page }) => {
  await page.goto('/tools/mileage-calculator/');
  await hydrated(page);
  const m = mileage(450, 30, 100)!;
  await expect(page.getByTestId('mileage-kmpl')).toHaveText(m.kmPerUnit.toFixed(2));
  await expect(page.getByTestId('mileage-per100')).toHaveText(m.per100Km.toFixed(2));
  await page.getByLabel('Distance driven between two full tanks', { exact: true }).fill('600');
  const m2 = mileage(600, 30, 100)!;
  await expect(page.getByTestId('mileage-kmpl')).toHaveText(m2.kmPerUnit.toFixed(2));
  await expect(page.getByTestId('mileage-verdict')).toContainText('km/l');
});

test('gold SIP calculator matches the maths and shows a year-by-year table', async ({ page }) => {
  await page.goto('/tools/gold-sip-calculator/');
  await hydrated(page);
  const r = goldSip({ monthly: 5_000, pricePerGram: 10_000, growth: 0.08, years: 10, buyCost: 0.03 });
  await expect(page.getByTestId('goldsip-value')).toHaveText(rupees(r.value));
  await expect(page.getByTestId('goldsip-invested')).toHaveText('₹6,00,000');
  await page.getByLabel('Assumed rise in the gold price (per year)', { exact: true }).fill('0');
  const flat = goldSip({ monthly: 5_000, pricePerGram: 10_000, growth: 0, years: 10, buyCost: 0.03 });
  await expect(page.getByTestId('goldsip-value')).toHaveText(rupees(flat.value));
  await expect(page.getByTestId('goldsip-gain')).toContainText('-');
  await page.locator('summary', { hasText: 'Year-by-year breakdown' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
});

test('extra English FAQs appear on existing English pages and not on the Hindi twins', async ({ page }) => {
  await page.goto('/tools/fd-calculator/');
  await expect(page.locator('details summary').filter({ hasText: 'What is TDS on FD interest?' })).toBeVisible();
  const fd = TOOLS.find((t) => t.kind === 'fd')!;
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = JSON.parse(blocks.find((b) => b.includes('"FAQPage"'))!) as { mainEntity: unknown[] };
  expect(faq.mainEntity.length).toBeGreaterThan(fd.faqs.length);
  await page.goto('/hi/tools/fd-calculator/');
  await expect(page.locator('details summary').filter({ hasText: 'TDS' })).toHaveCount(0);
  await page.goto('/schemes/post-office-mis-calculator/');
  await expect(page.locator('details summary').filter({ hasText: 'per ₹1 lakh' })).toBeVisible();
  await page.goto('/schemes/scss-calculator/');
  await expect(page.locator('details summary').filter({ hasText: 'Can I close an SCSS account before 5 years?' })).toBeVisible();
  await page.goto('/hi/schemes/scss-calculator/');
  await expect(page.locator('details summary').filter({ hasText: 'Can I close an SCSS account' })).toHaveCount(0);
});
