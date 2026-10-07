import { GLOSSARY, type TermKey } from '../lib/glossary.ts';

interface Props {
  term: TermKey;
  /** Distinguishes several tips of the same term on one page (ids must be unique). */
  instance?: string;
}

/**
 * Small (i) button that opens a plain-language explanation. Uses the browser's native popover
 * (top layer, closes on Escape or a tap outside, works with the keyboard), so it is not clipped by
 * scrolling tables and needs no positioning code. The text comes from {@link GLOSSARY}.
 *
 * @param props - Which term to explain.
 * @returns The button and its popover.
 */
export function InfoTip({ term, instance = '' }: Props) {
  const t = GLOSSARY[term];
  const id = `tip-${term}${instance ? `-${instance}` : ''}`;
  return (
    <>
      <button type="button" class="info-btn" aria-label={`What is ${t.title}?`} {...{ popovertarget: id }}>i</button>
      <div id={id} class="info-pop" {...{ popover: 'auto' }}>
        <p class="font-semibold">{t.title}</p>
        <p class="mt-2">{t.what}</p>
        <p class="mt-2 text-muted">{t.read}</p>
        <div class="mt-3 flex items-center justify-between gap-3">
          {t.learn ? <a class="underline" href={t.learn.href}>{t.learn.label}</a> : <span />}
          <button type="button" class="h-8 rounded-md border border-line px-3 text-sm hover:bg-subtle" {...{ popovertarget: id, popovertargetaction: 'hide' }}>Close</button>
        </div>
      </div>
    </>
  );
}
