import { expect, test } from '@playwright/test';
import type { ScreenerData } from '../src/lib/screener/types.ts';
import { hasFundPage } from '../src/lib/fundLinks.ts';

const ld = async (page: import('@playwright/test').Page) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).map((b) => JSON.parse(b) as Record<string, unknown>);

test.describe('fund pages', () => {
  test('a variant without its own page opens the on-demand page, which is not indexed and shows its numbers', async ({ page }) => {
    const d = (await (await page.request.get('/data/screener.json')).json()) as ScreenerData;
    const i = d.code.findIndex((_, j) => !hasFundPage(d.dict.plan[d.plan[j]], d.dict.option[d.option[j]]));
    test.skip(i < 0, 'no non-Direct-Growth variant in this dataset');
    await page.goto(`/fund/?code=${d.code[i]}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await expect(page.getByTestId('fund-on-demand')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(d.name[i]);
    await expect(page.getByTestId('fund-on-demand')).toContainText('Returns');
    await expect(page.getByTestId('fund-on-demand')).toContainText(String(d.nav[i]).slice(0, 3));
  });

  test('an unknown code says so instead of showing an empty page', async ({ page }) => {
    await page.goto('/fund/?code=1');
    await expect(page.getByTestId('fund-missing')).toContainText('No active fund has the scheme code 1');
  });

  test('the sitemap has no on-demand page and gives last-changed dates', async ({ page }) => {
    const index = await (await page.request.get('/sitemap-index.xml')).text();
    const first = /<loc>[^<]*?(\/sitemap-\d+\.xml)<\/loc>/.exec(index)![1];
    const xml = await (await page.request.get(first)).text();
    expect(xml).not.toMatch(/<loc>[^<]*\/fund\/<\/loc>/);
    expect(xml).toMatch(/<loc>[^<]*\/tools\/sip-calculator\/<\/loc><lastmod>\d{4}-\d{2}-\d{2}/);
    expect(xml).toMatch(/<loc>[^<]*\/hi\/learn\/what-is-sip\/<\/loc><lastmod>\d{4}-\d{2}-\d{2}/);
  });
});

test.describe('author, review date and sources', () => {
  for (const [path, lang] of [['/tools/home-loan-emi-calculator/', 'en'], ['/hi/tools/fd-calculator/', 'hi'], ['/schemes/nsc-calculator/', 'en'], ['/hi/schemes/ppf-calculator/', 'hi']] as const) {
    test(`${path}: byline with the review date, official sources, and WebPage markup with the author`, async ({ page }) => {
      await page.goto(path);
      const byline = page.getByTestId('byline');
      await expect(byline).toContainText(lang === 'hi' ? 'आशीष' : 'Asish');
      await expect(byline.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
      await expect(byline.getByRole('link')).toHaveAttribute('href', lang === 'hi' ? '/hi/author/asish/' : '/author/asish/');
      const links = page.getByTestId('sources').getByRole('link');
      expect(await links.count()).toBeGreaterThanOrEqual(1);
      for (const l of await links.all()) expect(await l.getAttribute('href')).toMatch(/^https:\/\/[^/]*(gov\.in|org\.in|amfiindia\.com)\//);
      const webPage = (await ld(page)).find((o) => o['@type'] === 'WebPage') as { dateModified: string; author: { name: string }; reviewedBy: { name: string } };
      expect(webPage.dateModified).toBe(await byline.locator('time').getAttribute('datetime'));
      expect(webPage.author.name).toBe('Asish');
      expect(webPage.reviewedBy.name).toBe('Asish');
    });
  }

  test('guides credit the author as a Person and keep their own review date', async ({ page }) => {
    await page.goto('/learn/what-is-sip/');
    const article = (await ld(page)).find((o) => o['@type'] === 'Article') as { author: { '@type': string; name: string }; dateModified: string };
    expect(article.author).toMatchObject({ '@type': 'Person', name: 'Asish' });
    await expect(page.getByTestId('byline').locator('time')).toHaveAttribute('datetime', article.dateModified);
  });

  test('the author page exists in both languages and is linked from the footer', async ({ page }) => {
    await page.goto('/author/asish/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Asish');
    await expect(page.getByTestId('author-page')).toContainText('JGRF Software');
    await expect(page.getByTestId('author-page')).toContainText('not a SEBI-registered investment adviser');
    expect((await ld(page)).some((o) => o['@type'] === 'ProfilePage')).toBe(true);
    await page.getByTestId('lang-switch').click();
    await expect(page).toHaveURL(/\/hi\/author\/asish\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('आशीष के बारे में');
    await page.goto('/tools/');
    await expect(page.locator('footer a[href="/author/asish/"]')).toBeVisible();
  });
});
