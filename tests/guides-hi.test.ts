import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOL_GUIDES } from '../src/lib/toolGuides.ts';
import { TOOLS } from '../src/lib/tools.ts';
import { TOOLS_HI } from '../src/lib/toolsContent.hi.ts';

const EN = join(__dirname, '../src/content/learn');
const HI = join(__dirname, '../src/content/learn-hi');
const files = readdirSync(EN).filter((f) => f.endsWith('.md'));

function front(text: string): { data: Record<string, string>; faqs: number; related: string; body: string } {
  const [, fm, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text) as RegExpExecArray;
  const data: Record<string, string> = {};
  for (const line of fm.split('\n')) { const m = /^([a-zA-Z]+): (.*)$/.exec(line); if (m) data[m[1]] = m[2]; }
  return { data, faqs: (fm.match(/^ {2}- question:/gm) ?? []).length, related: data.related, body };
}

describe('Hindi guides mirror the English ones', () => {
  it('has a Hindi file for every English guide, and none extra', () => {
    expect(readdirSync(HI).filter((f) => f.endsWith('.md')).sort()).toEqual([...files].sort());
  });
  for (const f of files) {
    it(`${f}: same group, order, dates, related guides and number of FAQs`, () => {
      const en = front(readFileSync(join(EN, f), 'utf8'));
      const hi = front(readFileSync(join(HI, f), 'utf8'));
      for (const k of ['group', 'order', 'datePublished', 'dateModified', 'related']) expect(hi.data[k], k).toBe(en.data[k]);
      expect(hi.faqs).toBe(en.faqs);
      expect(hi.data.title.length).toBeGreaterThan(5);
      expect(JSON.parse(hi.data.title).length).toBeLessThanOrEqual(70);
      expect(JSON.parse(hi.data.description).length).toBeLessThanOrEqual(170);
    });
    it(`${f}: is written in Hindi and its internal links stay in Hindi`, () => {
      const hi = front(readFileSync(join(HI, f), 'utf8')).body;
      const devanagari = (hi.match(/[ऀ-ॿ]/g) ?? []).length;
      const latinWords = (hi.replace(/\[[^\]]*\]\([^)]*\)/g, '').match(/\b[A-Za-z]{4,}\b/g) ?? []).length;
      expect(devanagari).toBeGreaterThan(latinWords * 5);
      const links = [...hi.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
      for (const l of links) expect(l, `English-only path ${l}`).not.toMatch(/^\/(learn|tools|schemes)\//);
      // the same internal links as the English guide, translated: same count
      const en = front(readFileSync(join(EN, f), 'utf8')).body;
      expect(links.length).toBe([...en.matchAll(/\]\((\/[^)]*)\)/g)].length);
    });
  }
});

describe('calculators and their guides', () => {
  it('every calculator has Hindi text and a guide that exists in both languages', () => {
    for (const t of TOOLS) {
      expect(TOOLS_HI[t.slug], t.slug).toBeDefined();
      expect(TOOLS_HI[t.slug].faqs.length).toBe(t.faqs.length);
      expect(files, t.kind).toContain(`${TOOL_GUIDES[t.kind].slug}.md`);
    }
  });
});
