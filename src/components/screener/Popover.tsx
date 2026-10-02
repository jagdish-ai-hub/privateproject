import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  /** Button label. */
  label: string;
  /** Small badge on the button (e.g. number of active filters). */
  badge?: number;
  /** Width class for the panel. */
  width?: string;
  children: ComponentChildren;
}

/** Button that toggles a floating panel. Closes on outside click or Escape. */
export function Popover({ label, badge = 0, width = 'w-80', children }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div class="relative" ref={root}>
      <button
        type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}
        class={`h-9 rounded-md border px-3 text-sm hover:bg-subtle ${badge ? 'border-line-strong' : 'border-line'}`}
      >
        {label}
        {badge > 0 && <span class="ml-1.5 rounded bg-accent px-1.5 text-xs text-accent-fg">{badge}</span>}
        <span aria-hidden="true" class="ml-1.5 text-muted">▾</span>
      </button>
      {open && <div role="dialog" aria-label={label} class={`absolute left-0 z-30 mt-1 rounded-md border border-line bg-bg p-3 shadow-sm ${width} max-sm:fixed max-sm:inset-x-3 max-sm:top-24 max-sm:mt-0 max-sm:max-h-[70vh] max-sm:w-auto max-sm:overflow-auto`}>{children}</div>}
    </div>
  );
}
