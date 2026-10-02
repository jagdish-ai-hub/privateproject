import { describe, expect, it } from 'vitest';
import { addMonths, formatIso, parseDMonY, parseDmy, toDayNumber } from '../src/lib/calc/index.ts';
import { iso } from './helpers.ts';

describe('parseDmy', () => {
  it('reads dd-mm-yyyy day-first (not month-first)', () => {
    expect(parseDmy('01-10-2026')).toBe(toDayNumber(2026, 10, 1));
    expect(formatIso(parseDmy('05-03-2026') as number)).toBe('2026-03-05');
  });
  it('rejects impossible and malformed dates', () => {
    expect(parseDmy('31-02-2026')).toBeNull();
    expect(parseDmy('2026-10-01')).toBeNull();
    expect(parseDmy('')).toBeNull();
  });
});

describe('parseDMonY', () => {
  it('reads AMFI dd-Mon-yyyy', () => {
    expect(parseDMonY('01-Oct-2026')).toBe(toDayNumber(2026, 10, 1));
    expect(parseDMonY('01-Foo-2026')).toBeNull();
  });
});

describe('addMonths', () => {
  it('clamps 29 Feb to 28 Feb a year earlier', () => {
    expect(addMonths(iso('2024-02-29'), -12)).toBe(iso('2023-02-28'));
  });
  it('clamps 31st into shorter months', () => {
    expect(addMonths(iso('2026-03-31'), -1)).toBe(iso('2026-02-28'));
    expect(addMonths(iso('2026-01-31'), 1)).toBe(iso('2026-02-28'));
  });
  it('crosses year boundaries in both directions', () => {
    expect(addMonths(iso('2026-01-15'), -2)).toBe(iso('2025-11-15'));
    expect(addMonths(iso('2025-11-15'), 3)).toBe(iso('2026-02-15'));
  });
});
