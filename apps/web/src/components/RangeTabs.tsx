import type { RangeKey } from '../lib/api';

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: '5D', label: '5D' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
];

export function RangeTabs({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
      {ranges.map((range) => (
        <button
          key={range.key}
          type="button"
          onClick={() => onChange(range.key)}
          className={
            value === range.key
              ? 'rounded-full bg-[#1D9BF0] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_24px_rgba(29,155,240,0.35)]'
              : 'rounded-full px-3 py-1.5 text-xs font-semibold text-white/45 transition hover:text-white'
          }
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
