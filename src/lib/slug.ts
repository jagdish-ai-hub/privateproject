/**
 * URL-safe slug from a name. Lower-case ASCII words joined with hyphens.
 *
 * @param text - Any text.
 * @returns The slug (may be empty).
 * @example
 * slugify('HDFC Mid-Cap Opportunities Fund - Direct Plan'); // "hdfc-mid-cap-opportunities-fund-direct-plan"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Page slug for a fund: readable name plus the scheme code (the code makes it unique and
 * stable even if the name is edited).
 *
 * @param name - Full scheme name.
 * @param code - AMFI scheme code.
 * @returns e.g. "sbi-small-cap-fund-direct-plan-growth-125497".
 */
export function fundSlug(name: string, code: number): string {
  return `${slugify(name)}-${code}`;
}
