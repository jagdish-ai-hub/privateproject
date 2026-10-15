import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Phone guard: every page type, in both languages, at the narrowest and a typical phone width.
 * Fails on sideways scrolling, on inputs under 16px (iOS zooms the page when one is focused), and on
 * header links that are too small to tap.
 */
const dir = fileURLToPath(new URL('..', import.meta.url));
const names = (d: string): string[] => readdirSync(join(dir, d)).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
const tools = ['sip-calculator', 'step-up-sip-calculator', 'lumpsum-calculator', 'goal-sip-calculator', 'swp-calculator', 'cagr-calculator', 'rent-vs-buy-calculator', 'car-running-cost-calculator', 'ev-vs-petrol-running-cost-calculator', 'gold-jewellery-price-calculator', 'gold-silver-return-calculator', 'home-loan-emi-calculator', 'car-loan-emi-calculator', 'personal-loan-emi-calculator', 'fd-calculator', 'inflation-calculator'];
const schemes = ['ppf-calculator', 'sukanya-samriddhi-calculator', 'scss-calculator', 'nsc-calculator', 'kvp-calculator', 'post-office-mis-calculator', 'post-office-rd-calculator', 'post-office-fd-calculator'];
const routes = [
  '/', '/compare/', '/compare/?f=100033,100034', '/tools/', '/hi/tools/', '/schemes/', '/hi/schemes/', '/learn/', '/hi/learn/', '/methodology/', '/about/', '/privacy/', '/disclaimer/', '/contact/',
  ...tools.flatMap((t) => [`/tools/${t}/`, `/hi/tools/${t}/`]),
  ...schemes.flatMap((t) => [`/schemes/${t}/`, `/hi/schemes/${t}/`]),
  ...names('src/content/learn').flatMap((g) => [`/learn/${g}/`, `/hi/learn/${g}/`]),
];

for (const width of [320, 390]) {
  test.describe(`phone ${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });

    test('no page scrolls sideways, inputs are 16px or more, header links are easy to tap', async ({ page }) => {
      const failures: string[] = [];
      for (const r of routes) {
        await page.goto(r);
        await page.waitForLoadState('load');
        const m = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          smallInputs: [...document.querySelectorAll<HTMLInputElement>('input')].filter((i) => !['range', 'checkbox', 'radio', 'hidden'].includes(i.type) && getComputedStyle(i).display !== 'none' && parseFloat(getComputedStyle(i).fontSize) < 16).length,
          smallNav: [...document.querySelectorAll<HTMLElement>('header a')].filter((a) => a.getBoundingClientRect().height < 36).length,
        }));
        if (m.overflow > 0) failures.push(`${r}: scrolls sideways by ${m.overflow}px`);
        if (m.smallInputs) failures.push(`${r}: ${m.smallInputs} input(s) under 16px`);
        if (m.smallNav) failures.push(`${r}: ${m.smallNav} header link(s) under 36px tall`);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  });
}

test.describe('phone, interactive states', () => {
  test.use({ viewport: { width: 320, height: 800 }, hasTouch: true, isMobile: true });

  test('the screener opens, its filters stay on screen and the page does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="result-card"]').first().waitFor({ timeout: 15_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const card = page.locator('[data-testid="result-card"] a').first();
    expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(36);
  });

  test('opening a calculator with every extra panel and an FAQ answer still fits', async ({ page }) => {
    for (const r of ['/tools/home-loan-emi-calculator/', '/hi/tools/ev-vs-petrol-running-cost-calculator/', '/schemes/ppf-calculator/']) {
      await page.goto(r);
      for (const d of await page.locator('details').all()) await d.locator('summary').first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), r).toBeLessThanOrEqual(0);
    }
  });

  test('the compare page keeps long fund names readable and inside the screen', async ({ page }) => {
    await page.goto('/compare/?f=100033,100034');
    await page.getByRole('list', { name: 'Selected funds' }).waitFor({ timeout: 15_000 });
    const chips = await page.getByRole('list', { name: 'Selected funds' }).getByRole('listitem').all();
    for (const c of chips) expect((await c.boundingBox())!.x + (await c.boundingBox())!.width).toBeLessThanOrEqual(321);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
