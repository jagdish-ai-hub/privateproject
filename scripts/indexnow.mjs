/**
 * Tell IndexNow search engines (Bing, Yandex, Seznam, Naver and others; not Google) that pages changed.
 * Reads every URL from the live sitemaps, so only pages open to search engines are sent.
 * The key is the 32-character file in public/ (public/<key>.txt, served at https://<site>/<key>.txt).
 *
 * Usage: node scripts/indexnow.mjs [https://mutualfundcompare.in]
 */
import { readdirSync } from 'node:fs';

const site = (process.argv[2] ?? 'https://mutualfundcompare.in').replace(/\/$/, '');
const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('No IndexNow key file (public/<32 hex>.txt)');
const key = keyFile.replace(/\.txt$/, '');

const text = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
};
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if ((await text(`${site}/${keyFile}`)).trim() !== key) throw new Error('The live key file does not match the local one; deploy first.');
const urls = [];
for (const map of locs(await text(`${site}/sitemap-index.xml`))) urls.push(...locs(await text(map)));
if (urls.length === 0) throw new Error('No URLs in the sitemaps');

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/${keyFile}`, urlList: urls }),
});
console.log(`Sent ${urls.length} URLs to IndexNow: HTTP ${res.status} ${res.statusText}`);
if (res.status >= 400) {
  console.log(await res.text());
  process.exit(1);
}
