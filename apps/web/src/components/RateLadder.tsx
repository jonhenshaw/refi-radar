import type { RateSeries } from '../lib/api';
import { compareToBaseline, extremes, fmtPct } from '../lib/derive';
import { SOURCE_LABELS, SOURCE_ORDER } from '../lib/sourceTheme';

interface Props {
  series: RateSeries[];
}

const COLUMNS = [
  { key: 'today', label: 'Today', daysAgo: 0 },
  { key: '1d', label: '1d', daysAgo: 1 },
  { key: '7d', label: '7d', daysAgo: 7 },
  { key: '30d', label: '30d', daysAgo: 30 },
  { key: '90d', label: '90d', daysAgo: 90 },
  { key: '1y', label: '1y', daysAgo: 365 },
] as const;

export function RateLadder({ series }: Props) {
  return (
    <section
      aria-label="Rate ladder"
      className="border border-line rounded-md bg-surface-1/40"
    >
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Historical ladder</p>
        <p className="text-[10px] uppercase tracking-wider text-fg-faint">% by lookback</p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-[12px]">
          <thead>
            <tr className="text-left text-fg-dim">
              <th
                scope="col"
                className="sticky left-0 z-[1] bg-surface-1 border-r border-line px-3 py-2 text-[10px] uppercase tracking-wider font-medium"
              >
                Source
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-medium"
                >
                  {col.label}
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-medium"
              >
                Hi / Lo
              </th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_ORDER.map((sid, rowIdx) => {
              const sr = series.find((s) => s.sourceId === sid);
              const points = sr?.points ?? [];
              const today = points.at(-1)?.rate;
              const ext = extremes(points);
              const rowBg = rowIdx % 2 === 1 ? 'bg-surface-3' : '';
              return (
                <tr key={sid} className={`border-t border-line ${rowBg}`}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-[1] border-r border-line px-3 py-2 text-left font-medium ${
                      rowIdx % 2 === 1 ? 'bg-surface-2' : 'bg-surface-1'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: sr?.color ?? 'currentColor' }}
                      />
                      <span className="text-fg">{SOURCE_LABELS[sid]}</span>
                    </span>
                  </th>
                  {COLUMNS.map((col) => {
                    const v = col.daysAgo === 0 ? today : compareToBaseline(points, col.daysAgo);
                    const isToday = col.daysAgo === 0;
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2 text-right font-mono-tnum ${
                          isToday ? 'text-fg' : 'text-fg-muted'
                        }`}
                      >
                        {fmtPct(v)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono-tnum text-fg-muted whitespace-nowrap">
                    {ext ? `${ext.hi.toFixed(2)} / ${ext.lo.toFixed(2)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
