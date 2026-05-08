import type { RangeKey } from '../lib/api';

export const visibleRanges: Array<{ key: RangeKey; label: string }> = [
  { key: '1D', label: '1D' },
  { key: '5D', label: '5D' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
  { key: '5Y', label: '5Y' },
  { key: 'MAX', label: 'MAX' },
];

export function RangeTabs({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Chart history range"
      className="inline-flex rounded-sm border border-line bg-surface-1 p-0.5"
    >
      {visibleRanges.map((range) => {
        const active = value === range.key;
        return (
          <button
            key={range.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-pressed={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(range.key)}
            className={`min-w-[36px] rounded-xs px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider font-mono-tnum ${
              active
                ? 'bg-white/10 text-fg ring-1 ring-line-strong'
                : 'text-fg-dim hover:text-fg'
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
