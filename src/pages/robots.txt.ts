import type { APIRoute } from 'astro';

/** robots.txt: allow everything and point crawlers at the sitemap index (needs `site` in astro.config). */
export const GET: APIRoute = ({ site }) => {
  const base = site?.toString() ?? 'https://mf-screener.example.com/';
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', base).toString()}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
