import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSeries, periodReturn, riskStats, sipReturn } from '../src/lib/calc/index.ts';

/**
 * Cross-implementation check on REAL NAV history (SBI Small Cap, Parag Parikh Flexi Cap,
 * Axis ELSS, as of the fixture date). Expected values come from the independent Python
 * implementation in scripts/crosscheck_reference.py. This proves the TypeScript maths
 * agrees with a separately written implementation on real data. It does NOT prove
 * agreement with AMC factsheets (see docs/METHODOLOGY.md, "Verification").
 */
const expected = JSON.parse(readFileSync('tests/fixtures/expected.json', 'utf8')) as Record<string, {
  ret: Record<string, number | null>;
  sip: Record<string, number | null>;
  risk36: { volatility: number; sharpe: number; maxDrawdown: number } | null;
}>;

for (const code of Object.keys(expected)) {
  describe(`fund ${code}`, () => {
    const raw = JSON.parse(readFileSync(`tests/fixtures/raw-${code}.json`, 'utf8')).data;
    const s = parseSeries(raw);
    const exp = expected[code];

    it.each(Object.keys(exp.ret))('%s-month return matches', (m) => {
      const got = periodReturn(s, Number(m))?.value ?? null;
      if (exp.ret[m] === null) expect(got).toBeNull();
      else expect(got).toBeCloseTo(exp.ret[m] as number, 9);
    });
    it.each(Object.keys(exp.sip))('%s-month SIP XIRR matches', (m) => {
      const got = sipReturn(s, Number(m))?.xirr ?? null;
      if (exp.sip[m] === null) expect(got).toBeNull();
      else expect(got).toBeCloseTo(exp.sip[m] as number, 7);
    });
    it('3Y risk stats match', () => {
      const r = riskStats(s, 36);
      expect(r?.volatility).toBeCloseTo(exp.risk36?.volatility as number, 9);
      expect(r?.sharpe).toBeCloseTo(exp.risk36?.sharpe as number, 8);
      expect(r?.maxDrawdown).toBeCloseTo(exp.risk36?.maxDrawdown as number, 9);
    });
  });
}
