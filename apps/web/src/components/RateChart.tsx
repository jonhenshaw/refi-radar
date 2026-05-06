import type { RateSeries } from '../lib/api';

function pathFor(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

export function RateChart({
  series,
  loading = false,
  demo = false,
  onInspect,
}: {
  series: RateSeries[];
  loading?: boolean;
  demo?: boolean;
  onInspect?: () => void;
}) {
  const width = 920;
  const height = 340;
  const padding = { top: 24, right: 32, bottom: 36, left: 46 };
  const all = series.flatMap((item) => item.points.map((point) => point.rate));
  const min = Math.min(...all, 5.5);
  const max = Math.max(...all, 7.5);
  const domain = Math.max(max - min, 0.5);
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  if (loading) {
    return <div className="h-[340px] animate-pulse rounded-3xl border border-white/8 bg-white/[0.03]" />;
  }

  if (!series.length || !all.length) {
    return <div className="flex h-[340px] items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-white/45">No rate history available.</div>;
  }

  const chart = (
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-b from-white/[0.045] to-transparent">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mortgage rate history chart" className="h-[340px] w-full">
        <defs>
          <linearGradient id="chartFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1D9BF0" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1D9BF0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((tick) => {
          const y = padding.top + (plotH / 3) * tick;
          const label = max - (domain / 3) * tick;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text x={12} y={y + 4} fill="rgba(255,255,255,0.38)" fontSize="12" fontFamily="monospace">
                {label.toFixed(2)}%
              </text>
            </g>
          );
        })}

        {series.map((item) => {
          const count = Math.max(item.points.length - 1, 1);
          const coords = item.points.map((point, index) => ({
            x: padding.left + (plotW * index) / count,
            y: padding.top + ((max - point.rate) / domain) * plotH,
          }));
          return (
            <g key={item.sourceId}>
              {item.sourceId === 'mnd_30y_fixed' && coords.length > 1 ? (
                <path d={`${pathFor(coords)} L ${coords.at(-1)?.x ?? padding.left} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`} fill="url(#chartFade)" />
              ) : null}
              <path d={pathFor(coords)} fill="none" stroke={item.color} strokeWidth={item.sourceId === 'mnd_30y_fixed' ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />
              {coords.at(-1) ? <circle cx={coords.at(-1)!.x} cy={coords.at(-1)!.y} r="4" fill={item.color} /> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );

  return (
    <div>
      {onInspect ? (
        <button type="button" className="chart-inspect-button" aria-label="Open mortgage rate history chart" onClick={onInspect}>
          {chart}
          <span className="chart-inspect-hint">Inspect</span>
        </button>
      ) : chart}
      <div className="mt-4 flex flex-wrap gap-3">
        {series.map((item) => (
          <div key={item.sourceId} className="flex items-center gap-2 text-xs text-white/55">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
        {demo ? <span className="text-xs uppercase tracking-[0.16em] text-[#1D9BF0]">Sample trend</span> : null}
      </div>
    </div>
  );
}
