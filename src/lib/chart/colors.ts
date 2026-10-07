/**
 * Colours for the charts. The site UI is monochrome, so data colours come from one validated
 * categorical palette (`dataviz` skill, checked with its validator in both modes: adjacent CVD
 * separation above 8, normal-vision separation above 19). Slot order is fixed, never cycled, and a
 * fund keeps its colour for as long as it is selected.
 *
 * The same hex values live in `src/styles/global.css` as `--s1`..`--s4` (so HTML legends follow the theme
 * switch); a test keeps the two in sync.
 *
 * In light mode aqua and yellow are below 3:1 contrast on white, so every line is also
 * identified by the legend, the value label on its end and the metrics table.
 */
export const CATEGORICAL = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500'],
} as const;

/** Theme colours read from the CSS variables, so charts follow the page's light / dark switch. */
export interface ChartTheme {
  dark: boolean;
  bg: string;
  fg: string;
  muted: string;
  grid: string;
  line: string;
  pos: string;
  neg: string;
  border: string;
  series: readonly string[];
}

/**
 * Read the current theme (browser only).
 *
 * @returns Colours for the current `data-theme`.
 */
export function readTheme(): ChartTheme {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const v = (n: string): string => cs.getPropertyValue(n).trim();
  const dark = root.getAttribute('data-theme') === 'dark';
  return {
    dark, bg: v('--bg'), fg: v('--fg'), muted: v('--fg-muted'), grid: v('--chart-grid'), line: v('--chart-line'),
    pos: v('--pos'), neg: v('--neg'), border: v('--border'), series: [1, 2, 3, 4].map((n, i) => v(`--s${n}`) || (dark ? CATEGORICAL.dark : CATEGORICAL.light)[i]),
  };
}
