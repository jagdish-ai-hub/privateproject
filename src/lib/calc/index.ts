/**
 * Public surface of the calculation library. Pure functions only: no DOM, no network,
 * no dependencies, so the same code runs in the data pipeline and in the browser.
 */
export * from './dates.ts';
export * from './series.ts';
export * from './returns.ts';
export * from './xirr.ts';
export * from './sip.ts';
export * from './risk.ts';
export * from './rolling.ts';
export * from './downsample.ts';
