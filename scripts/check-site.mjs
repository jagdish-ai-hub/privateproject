/**
 * Post-build sanity check of `dist/`. Exits with code 1 if it finds:
 *  - internal links (href) that do not resolve to a built file,
 *  - pages missing a <title>, meta description, canonical link or exactly one <h1>,
 *  - duplicate <title> or meta description across pages,
 *  - invalid JSON-LD blocks.
 * Usage: node scripts/check-site.mjs [--sample]
 *   --sample  the build only contains some fund pages (MAX_FUND_PAGES): do not treat missing /fund/ links as errors.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist');
const sample = process.argv.includes('--sample');
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) files.push(p);
  }
})(root);

const problems = [];
const titles = new Map();
const descriptions = new Map();
const checkedLinks = new Map(); // href -> ok

/** Does an internal path resolve to a file in dist? */
function resolves(path) {
  const clean = decodeURIComponent(path.split('#')[0].split('?')[0]);
  if (clean === '' ) return true;
  const target = join(root, clean);
  return existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
}

for (const file of files) {
  const rel = file.slice(root.length);
  if (rel === '/404.html') continue;
  const html = readFileSync(file, 'utf8');

  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim();
  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1];
  if (!title) problems.push(`${rel}: missing <title>`);
  else (titles.get(title) ?? titles.set(title, []).get(title)).push(rel);
  if (!desc) problems.push(`${rel}: missing meta description`);
  else (descriptions.get(desc) ?? descriptions.set(desc, []).get(desc)).push(rel);
  if (!/<link rel="canonical" href="[^"]+"/.test(html)) problems.push(`${rel}: missing canonical`);
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) problems.push(`${rel}: expected exactly one <h1>, found ${h1s}`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { problems.push(`${rel}: invalid JSON-LD`); }
  }

  for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue; // external, mailto, #anchor
    if (sample && href.startsWith('/fund/')) continue;
    if (!checkedLinks.has(href)) checkedLinks.set(href, resolves(href));
    if (!checkedLinks.get(href)) problems.push(`${rel}: broken link ${href}`);
  }
}
for (const [t, pages] of titles) if (pages.length > 1) problems.push(`duplicate title "${t}" on ${pages.length} pages, e.g. ${pages[0]}`);
for (const [d, pages] of descriptions) if (pages.length > 1) problems.push(`duplicate description on ${pages.length} pages, e.g. ${pages[0]}: ${d.slice(0, 60)}…`);

console.log(`checked ${files.length} pages, ${checkedLinks.size} distinct internal links`);
if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(' - ' + p);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log('site check passed');
