// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// SITE_URL is set in CI / hosting; the placeholder keeps canonical URLs valid locally.
const site = process.env.SITE_URL ?? 'https://mf-screener.example.com';

export default defineConfig({
  trailingSlash: 'always',
  site,
  integrations: [preact({ compat: false }), mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
