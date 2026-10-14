/** Small building blocks shared by the newer calculators. */

export function Tile({ label, value, strong, testid }: { label: string; value: string; strong?: boolean; testid?: string }) {
  return (
    <div class="rounded-md border border-line p-4">
      <p class="text-xs text-muted">{label}</p>
      <p class={`num mt-1 text-left ${strong ? 'text-2xl font-semibold' : 'text-lg'}`} data-testid={testid}>{value}</p>
    </div>
  );
}

/** A row of buttons where exactly one option is selected. */
export function Choice<T extends string | number>({ label, value, options, onChange, testid }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; testid?: string }) {
  return (
    <fieldset data-testid={testid}>
      <legend class="text-sm">{label}</legend>
      <div class="mt-2 flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            class={`h-9 rounded-md border px-3 text-sm ${value === v ? 'border-fg bg-subtle font-medium' : 'border-line text-muted hover:bg-subtle'}`}
          >{text}</button>
        ))}
      </div>
    </fieldset>
  );
}
