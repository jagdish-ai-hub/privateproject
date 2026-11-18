// Usage: node scripts/make-icons.mjs public   (needs Playwright's Chromium). Check the result by eye afterwards.
// Renders the raster icons from public/favicon.svg (light variant) with Chromium, and packs favicon.ico (16/32/48 PNG entries).
import fs from 'node:fs';
import { chromium } from '@playwright/test';
const pub = process.argv[2];
const svg = fs.readFileSync(`${pub}/favicon.svg`, 'utf8').replace(/<style>.*?<\/style>/, '');
const square = svg.replace(' rx="8"', ''); // full-bleed tile for iOS, which rounds corners itself
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  async function render(src, size) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    return p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  fs.writeFileSync(`${pub}/apple-touch-icon.png`, await render(square, 180));
  fs.writeFileSync(`${pub}/icon-192.png`, await render(svg, 192));
  fs.writeFileSync(`${pub}/icon-512.png`, await render(svg, 512));
  fs.writeFileSync(`${pub}/favicon-48.png`, await render(svg, 48));
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) pngs.push(await render(svg, s));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
    off += pngs[i].length;
  });
  fs.writeFileSync(`${pub}/favicon.ico`, Buffer.concat([head, ...pngs]));
  await b.close();
})();
