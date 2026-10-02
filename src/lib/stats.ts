/**
 * Median of the non-null numbers in a list.
 *
 * @param values - Numbers, possibly with nulls.
 * @returns The median, or `null` if there are no numbers.
 * @example
 * median([3, 1, null, 2]); // 2
 */
export function median(values: readonly (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Trim text to a maximum length on a word boundary, adding an ellipsis when cut.
 *
 * @param text - Text to shorten.
 * @param max - Maximum length including the ellipsis.
 * @returns The (possibly shortened) text.
 */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).trimEnd()}…`;
}
