import { useEffect, useRef, useState } from 'preact/hooks';
import { COLUMNS, RANGE_FILTERS, type Column } from '../../lib/screener/columns.ts';
import type { Prepared } from '../../lib/screener/query.ts';
import type { Filters, Range, RangeKey } from '../../lib/screener/types.ts';
import { MultiSelect } from './MultiSelect.tsx';
import { Popover } from './Popover.tsx';

const PLAN_LABELS = { direct: 'Direct', regular: 'Regular', na: 'No plans (ETFs)', unknown: 'Plan not stated' };
const OPTION_LABELS = { growth: 'Growth', idcw: 'IDCW (dividend)', bonus: 'Bonus', other: 'Other / not stated' };

interface Props {
  prepared: Prepared | null;
  filters: Filters;
  onFilters: (patch: Partial<Filters>, mode?: 'push' | 'replace') => void;
  visibleKeys: string[];
  onColumns: (keys: string[]) => void;
  compact: boolean;
  onCompact: (v: boolean) => void;
  onExport: () => void;
  onReset: () => void;
  isDefault: boolean;
  disabled: boolean;
}

/** Toolbar: debounced search, categorical filters, numeric range filters, column picker, density, export. */
export function FilterBar(props: Props) {
  const { prepared, filters, onFilters, visibleKeys, onColumns, compact, onCompact, onExport, onReset, isDefault, disabled } = props;
  const dict = prepared?.data.dict;

  // Search is debounced (150 ms) so typing never blocks on re-filtering.
  const [q, setQ] = useState(filters.q);
  const lastCommitted = useRef(filters.q);
  useEffect(() => { if (filters.q !== lastCommitted.current) { setQ(filters.q); lastCommitted.current = filters.q; } }, [filters.q]);
  useEffect(() => {
    if (q === lastCommitted.current) return;
    const t = setTimeout(() => { lastCommitted.current = q; onFilters({ q }, 'replace'); }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const setRange = (key: RangeKey, r: Range): void => {
    const ranges = { ...filters.ranges };
    if (r.min === undefined && r.max === undefined) delete ranges[key];
    else ranges[key] = r;
    onFilters({ ranges }, 'replace');
  };
  const activeRanges = Object.values(filters.ranges).filter((r) => r && (r.min !== undefined || r.max !== undefined)).length;
  const groups = [...new Set(COLUMNS.map((c) => c.group))];

  return (
    <div class="flex flex-wrap items-center gap-2" role="search" aria-label="Filter funds">
      <input
        type="search" value={q} disabled={disabled} placeholder="Search fund or fund house…" aria-label="Search funds"
        onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
        class="h-9 w-full rounded-md border border-line bg-bg px-3 text-sm sm:w-64"
      />
      {dict && (
        <>
          <MultiSelect label="Type" options={dict.assetClass} selected={filters.assetClass} onChange={(assetClass) => onFilters({ assetClass })} />
          <MultiSelect label="Category" options={dict.category} selected={filters.category} onChange={(category) => onFilters({ category })} />
          <MultiSelect label="Fund house" options={dict.amc} selected={filters.amc} onChange={(amc) => onFilters({ amc })} />
          <MultiSelect label="Plan" options={dict.plan} labels={PLAN_LABELS} selected={filters.plan} onChange={(plan) => onFilters({ plan })} />
          <MultiSelect label="Option" options={dict.option} labels={OPTION_LABELS} selected={filters.option} onChange={(option) => onFilters({ option })} />
        </>
      )}
      <Popover label="Ranges" badge={activeRanges} width="w-96">
        <p class="mb-2 text-xs text-muted">Funds with no value for a metric are left out when you filter on it.</p>
        <div class="space-y-2">
          {RANGE_FILTERS.map((rf) => (
            <RangeRow key={rf.key} label={rf.label} unit={rf.unit} value={filters.ranges[rf.key] ?? {}} onChange={(r) => setRange(rf.key, r)} />
          ))}
        </div>
      </Popover>
      <Popover label="Columns" width="w-72">
        <div class="max-h-80 space-y-3 overflow-auto">
          {groups.map((g) => (
            <fieldset key={g}>
              <legend class="mb-1 text-xs font-medium text-muted">{g}</legend>
              {COLUMNS.filter((c: Column) => c.group === g).map((c) => (
                <label key={c.key} class="flex cursor-pointer items-center gap-2 py-0.5 text-sm" title={c.help}>
                  <input
                    type="checkbox" checked={visibleKeys.includes(c.key)}
                    onChange={() => onColumns(visibleKeys.includes(c.key) ? visibleKeys.filter((k) => k !== c.key) : [...visibleKeys, c.key])}
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </Popover>
      <button type="button" class="h-9 rounded-md border border-line px-3 text-sm hover:bg-subtle" onClick={() => onCompact(!compact)} aria-pressed={compact}>
        {compact ? 'Compact' : 'Comfortable'}
      </button>
      <button type="button" class="h-9 rounded-md border border-line px-3 text-sm hover:bg-subtle disabled:opacity-40" disabled={disabled} onClick={onExport}>Export CSV</button>
      {!isDefault && <button type="button" class="h-9 px-2 text-sm text-muted underline hover:text-fg" onClick={onReset}>Reset</button>}
    </div>
  );
}

interface RowProps { label: string; unit: string; value: Range; onChange: (r: Range) => void }

/** One min / max pair. Keeps the typed text locally so "-" or "1." can be typed mid-edit. */
function RangeRow({ label, unit, value, onChange }: RowProps) {
  const [min, setMin] = useState(value.min === undefined ? '' : String(value.min));
  const [max, setMax] = useState(value.max === undefined ? '' : String(value.max));
  // Re-sync when the URL changes the value from outside (Back button, Reset).
  useEffect(() => { if (parse(min) !== value.min) setMin(value.min === undefined ? '' : String(value.min)); }, [value.min]);
  useEffect(() => { if (parse(max) !== value.max) setMax(value.max === undefined ? '' : String(value.max)); }, [value.max]);
  const commit = (nextMin: string, nextMax: string): void => {
    const lo = parse(nextMin);
    const hi = parse(nextMax);
    onChange({ ...(lo !== undefined && { min: lo }), ...(hi !== undefined && { max: hi }) });
  };
  const input = 'h-8 w-20 rounded-md border border-line bg-bg px-2 text-right text-sm font-mono';
  return (
    <div class="flex items-center justify-between gap-2 text-sm">
      <span class="min-w-0 flex-1 truncate">{label}</span>
      <input class={input} inputMode="decimal" placeholder="min" aria-label={`${label} minimum`} value={min}
        onInput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; setMin(v); commit(v, max); }} />
      <input class={input} inputMode="decimal" placeholder="max" aria-label={`${label} maximum`} value={max}
        onInput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; setMax(v); commit(min, v); }} />
      <span class="w-7 text-xs text-muted">{unit}</span>
    </div>
  );
}

/** Parse a typed number, or `undefined` for blank / not-yet-valid text. */
function parse(text: string): number | undefined {
  if (text.trim() === '') return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}
