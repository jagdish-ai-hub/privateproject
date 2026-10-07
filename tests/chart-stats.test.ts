import { describe, expect, it } from 'vitest';
import { dropFromPeak, windowStats, withAlpha } from '../src/lib/chart/stats.ts';

const days = [1, 2, 3, 4, 5, 6];
const navs = [10, 12, 9, 15, 11, 13];

describe('windowStats', () => {
  it('finds start, end, high and low from the window start', () => {
    const w = windowStats(days, navs, 0)!;
    expect(w.start).toEqual({ day: 1, nav: 10 });
    expect(w.end).toEqual({ day: 6, nav: 13 });
    expect(w.high).toEqual({ day: 4, nav: 15 });
    expect(w.low).toEqual({ day: 3, nav: 9 });
  });
  it('ignores points before the window', () => {
    const w = windowStats(days, navs, 3)!;
    expect(w.low).toEqual({ day: 5, nav: 11 });
    expect(w.start.nav).toBe(15);
  });
  it('clamps the start and handles an empty series', () => {
    expect(windowStats(days, navs, 99)!.start.day).toBe(6);
    expect(windowStats([], [], 0)).toBeNull();
  });
});

describe('dropFromPeak', () => {
  it('is 0 at new highs and the fall below the running peak otherwise', () => {
    const d = dropFromPeak(days, navs, 0).map((p) => Math.round(p.value * 1000) / 1000);
    expect(d).toEqual([0, 0, -0.25, 0, -0.267, -0.133]);
  });
  it('measures the peak from the window start only', () => {
    const d = dropFromPeak(days, navs, 4);
    expect(d.map((p) => p.day)).toEqual([5, 6]);
    expect(d[0].value).toBe(0);
  });
});

describe('withAlpha', () => {
  it('converts short and long hex, and leaves other text alone', () => {
    expect(withAlpha('#0f7b3f', 0.5)).toBe('rgba(15, 123, 63, 0.5)');
    expect(withAlpha('#fff', 0.1)).toBe('rgba(255, 255, 255, 0.1)');
    expect(withAlpha('red', 0.1)).toBe('red');
  });
});

import { readFileSync } from 'node:fs';
import { CATEGORICAL } from '../src/lib/chart/colors.ts';
import { shortName } from '../src/lib/compare.ts';

describe('series colours', () => {
  it('the CSS variables match the validated palette, light and dark', () => {
    const css = readFileSync('src/styles/global.css', 'utf8');
    const light = css.slice(css.indexOf(':root {'), css.indexOf(":root[data-theme='dark']"));
    const dark = css.slice(css.indexOf(":root[data-theme='dark']"));
    CATEGORICAL.light.forEach((hex, i) => expect(light).toContain(`--s${i + 1}: ${hex};`));
    CATEGORICAL.dark.forEach((hex, i) => expect(dark).toContain(`--s${i + 1}: ${hex};`));
  });
});

describe('shortName', () => {
  it('drops plan and option tails but never returns an empty name', () => {
    expect(shortName('Parag Parikh Flexi Cap Fund - Direct Plan - Growth')).toBe('Parag Parikh Flexi Cap Fund');
    expect(shortName('UTI Nifty 50 Index Fund - Growth Option - Direct')).toBe('UTI Nifty 50 Index Fund');
    expect(shortName('HDFC Liquid Fund - Regular Plan - IDCW')).toBe('HDFC Liquid Fund');
    expect(shortName('Plain Fund')).toBe('Plain Fund');
    expect(shortName('- Direct Plan')).toBe('- Direct Plan');
  });
});

import { valueOn } from '../src/components/compare/CompareChart.tsx';

describe('valueOn', () => {
  const line = { days: [10, 12, 15], values: [100, 110, 120] };
  it('uses the latest point on or before the day, so funds that skip a day still have a value', () => {
    expect(valueOn(line, 12)).toBe(110);
    expect(valueOn(line, 14)).toBe(110);
    expect(valueOn(line, 99)).toBe(120);
  });
  it('is null before the line starts', () => {
    expect(valueOn(line, 9)).toBeNull();
    expect(valueOn({ days: [], values: [] }, 1)).toBeNull();
  });
});
