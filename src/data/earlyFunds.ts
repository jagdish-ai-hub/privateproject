/**
 * Fund pages opened to Google ahead of the `funds` stage: a short, fixed, hand-picked list, open from
 * stage `core` onwards (see src/lib/indexStage.ts). Picked on 19 November 2026 as the two largest
 * Direct-plan Growth funds by fund size in eight popular categories: the best-known names people search for.
 * The list is fixed on purpose (not re-picked every night), so Google sees a stable set of pages.
 * AMFI scheme codes; a code that is not in the data is simply skipped.
 */
export const EARLY_FUND_CODES: readonly number[] = [
  122639, // Parag Parikh Flexi Cap Fund (Flexi Cap)
  118955, // HDFC Flexi Cap Fund (Flexi Cap)
  120586, // ICICI Prudential Large Cap Fund (Large Cap)
  119598, // SBI Large Cap Fund (Large Cap)
  118989, // HDFC Mid Cap Fund (Mid Cap)
  119775, // Kotak Mid Cap Fund (Mid Cap)
  118778, // Nippon India Small Cap Fund (Small Cap)
  130503, // HDFC Small Cap Fund (Small Cap)
  120503, // Axis ELSS Tax Saver Fund (ELSS)
  119723, // SBI ELSS Tax Saver Fund (ELSS)
  120716, // UTI Nifty 50 Index Fund (Index Fund)
  119063, // HDFC Nifty 50 Index Fund (Index Fund)
  119609, // SBI Aggressive Hybrid Fund (Aggressive Hybrid)
  120251, // ICICI Prudential Aggressive Hybrid Fund (Aggressive Hybrid)
  118968, // HDFC Balanced Advantage Fund (Balanced Advantage)
  120377, // ICICI Prudential Balanced Advantage Fund (Balanced Advantage)
];
