import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  /** Button label, e.g. "Category". */
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional display text per option value. */
  labels?: Record<string, string>;
}

/**
 * Dropdown with checkboxes (multi-select) and an optional search box for long lists.
 * Closes on outside click or Escape. An empty selection means "no restriction".
 */
export function MultiSelect({ label, options, selected, onChange, labels = {} }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const text = (o: string): string => labels[o] ?? o;
  const shown = options.filter((o) => text(o).toLowerCase().includes(query.toLowerCase()));
  const toggle = (o: string): void => onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);

  return (
    <div class="relative" ref={root}>
      <button
        type="button"
        class={`h-9 rounded-md border px-3 text-sm hover:bg-subtle ${selected.length ? 'border-line-strong' : 'border-line'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
        {selected.length > 0 && <span class="ml-1.5 rounded bg-accent px-1.5 text-xs text-accent-fg">{selected.length}</span>}
        <span aria-hidden="true" class="ml-1.5 text-muted">▾</span>
      </button>
      {open && (
        <div class="absolute left-0 z-30 mt-1 w-72 rounded-md border border-line bg-bg shadow-sm max-sm:fixed max-sm:inset-x-3 max-sm:top-24 max-sm:mt-0 max-sm:w-auto">
          {options.length > 8 && (
            <input
              type="search" autoFocus placeholder={`Search ${label.toLowerCase()}…`} value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
              class="w-full border-b border-line bg-bg px-3 py-2 text-sm outline-none"
              aria-label={`Search ${label}`}
            />
          )}
          <ul class="max-h-64 overflow-auto py-1" role="listbox" aria-multiselectable="true" aria-label={label}>
            {shown.map((o) => (
              <li key={o}>
                <label class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-subtle">
                  <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
                  <span class="truncate">{text(o)}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li class="px-3 py-2 text-sm text-muted">No matches</li>}
          </ul>
          <div class="flex justify-between border-t border-line px-3 py-2 text-xs">
            <button type="button" class="text-muted hover:text-fg" onClick={() => onChange([])}>Any (clear)</button>
            <button type="button" class="hover:underline" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
