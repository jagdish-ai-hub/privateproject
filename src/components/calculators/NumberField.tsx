import { useEffect, useState } from 'preact/hooks';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  /** Text shown after the input, e.g. "%" or "years". */
  unit?: string;
  /** Show a leading rupee sign. */
  rupee?: boolean;
  /** Upper end of the slider only (typing may go up to `max`); keeps typical values off the far-left edge. */
  sliderMax?: number;
}

/**
 * A labelled number input with a slider. Typing may pass through invalid states ("", "1."), so
 * the text is kept locally and only valid numbers inside [min, max] are reported. On blur an
 * out-of-range value snaps back to the nearest limit.
 */
export function NumberField({ label, value, onChange, min, max, step, unit, rupee, sliderMax }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => { if (Number(text) !== value) setText(String(value)); }, [value]);
  const id = `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const commit = (raw: string): void => {
    setText(raw);
    const n = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
  };
  return (
    <div>
      <div class="flex items-center justify-between gap-3">
        <label for={id} class="text-sm">{label}</label>
        <div class="flex items-center gap-1.5">
          {rupee && <span class="text-sm text-muted" aria-hidden="true">₹</span>}
          <input
            id={id} type="text" inputMode="decimal" value={text} aria-describedby={`${id}-hint`}
            onInput={(e) => commit((e.currentTarget as HTMLInputElement).value.replace(/,/g, ''))}
            onBlur={() => { const n = Math.min(max, Math.max(min, Number(text) || min)); setText(String(n)); onChange(n); }}
            class="num h-9 w-32 rounded-md border border-line bg-bg px-2 text-sm"
          />
          {unit && <span class="w-10 text-sm text-muted">{unit}</span>}
        </div>
      </div>
      <input
        type="range" min={min} max={sliderMax ?? max} step={step} value={Math.min(sliderMax ?? max, Math.max(min, value))} aria-label={`${label} slider`}
        onInput={(e) => { const n = Number((e.currentTarget as HTMLInputElement).value); setText(String(n)); onChange(n); }}
        class="mt-2 w-full accent-[var(--accent)]"
      />
      <p id={`${id}-hint`} class="sr-only">Between {min} and {max}</p>
    </div>
  );
}
