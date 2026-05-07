import type { RangeKey } from '../lib/api';

export const visibleRanges: Array<{ key: RangeKey; label: string }> = [
  { key: '5D', label: '5D' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
  { key: '5Y', label: '5Y' },
  { key: 'MAX', label: 'MAX' },
];

export function RangeTabs({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  return (
    <div className="range-tabs" role="tablist" aria-label="Chart history range">
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
            className={active ? 'range-tab active' : 'range-tab'}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
