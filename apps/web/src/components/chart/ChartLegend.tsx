import type { RateSeries } from '../../lib/api';

interface Props {
  series: RateSeries[];
  demo?: boolean;
}

export function ChartLegend({ series, demo }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
      {series.map((item) => {
        const last = item.points.at(-1);
        return (
          <span key={item.sourceId} className="inline-flex items-center gap-2">
            <span
              className="h-[3px] w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-fg-muted">{item.label}</span>
            {last ? (
              <span className="font-mono-tnum text-fg">{last.rate.toFixed(2)}%</span>
            ) : null}
          </span>
        );
      })}
      {demo ? (
        <span className="rounded-xs border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-dim">
          sample data
        </span>
      ) : null}
    </div>
  );
}
