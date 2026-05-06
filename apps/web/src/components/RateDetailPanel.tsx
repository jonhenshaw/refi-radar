import type { RateObservation, SourceId } from '@refi-radar/shared';
import { X } from 'lucide-react';

import type { RateSeries, SeriesPoint } from '../lib/api';
import { formatBps, formatRate } from './MetricCard';

type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendStats {
  latest?: number;
  first?: number;
  high?: number;
  low?: number;
  changeBps?: number;
  direction: TrendDirection;
}

function pathFor(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

function formatDate(value?: string): string {
  if (!value) return 'No observation yet';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function calculateTrendStats(points: SeriesPoint[]): TrendStats {
  if (!points.length) return { direction: 'flat' };

  const rates = points.map((point) => point.rate);
  const first = rates[0];
  const latest = rates.at(-1)!;
  const changeBps = Math.round((latest - first) * 100);
  const direction: TrendDirection = Math.abs(changeBps) < 1 ? 'flat' : changeBps > 0 ? 'up' : 'down';

  return {
    latest,
    first,
    high: Math.max(...rates),
    low: Math.min(...rates),
    changeBps,
    direction,
  };
}

export function RateDetailPanel({
  label,
  sourceId,
  series,
  latest,
  onClose,
}: {
  label: string;
  sourceId: SourceId;
  series?: RateSeries;
  latest?: RateObservation;
  onClose: () => void;
}) {
  const points = series?.points ?? [];
  const stats = calculateTrendStats(points);
  const width = 900;
  const height = 360;
  const padding = { top: 26, right: 30, bottom: 40, left: 54 };
  const all = points.map((point) => point.rate);
  const min = Math.min(...all, (stats.latest ?? latest?.rate ?? 6) - 0.25);
  const max = Math.max(...all, (stats.latest ?? latest?.rate ?? 6) + 0.25);
  const domain = Math.max(max - min, 0.25);
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const count = Math.max(points.length - 1, 1);
  const coords = points.map((point, index) => ({
    x: padding.left + (plotW * index) / count,
    y: padding.top + ((max - point.rate) / domain) * plotH,
  }));
  const changeLabel = formatBps(stats.changeBps) ?? '0 bps';
  const trendLabel = stats.direction === 'down' ? 'Downtrend' : stats.direction === 'up' ? 'Uptrend' : 'Flat trend';
  const trendClass = stats.direction === 'down' ? 'text-emerald-200' : stats.direction === 'up' ? 'text-red-200' : 'text-white/65';
  const color = series?.color ?? '#1D9BF0';

  return (
    <div className="rate-detail-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${label} details`}
        className="rate-detail-dialog panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rate-detail-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9BF0]">Zoomed rate history</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{label}</h2>
            <p className="mt-2 text-sm text-white/45">Historical values and short-term trend for {sourceId}.</p>
          </div>
          <button
            type="button"
            aria-label="Close rate details"
            onClick={onClose}
            className="rate-detail-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rate-detail-body">
          <div className="rate-detail-stats">
          <div className="subpanel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">Latest</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-white">{formatRate(stats.latest ?? latest?.rate)}</p>
            <p className="mt-1 text-xs text-white/35">{formatDate(latest?.observedAt)}</p>
          </div>
          <div className="subpanel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">Period move</p>
            <p className={`mt-2 font-mono text-3xl font-semibold ${trendClass}`}>{changeLabel}</p>
            <p className="mt-1 text-xs text-white/35">{trendLabel}</p>
          </div>
          <div className="subpanel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">High</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-white">{formatRate(stats.high)}</p>
            <p className="mt-1 text-xs text-white/35">Selected range</p>
          </div>
          <div className="subpanel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">Low</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-white">{formatRate(stats.low)}</p>
            <p className="mt-1 text-xs text-white/35">Selected range</p>
          </div>
          </div>

          <div className="rate-detail-chart">
          {coords.length ? (
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} historical rate trend`} className="h-[360px] w-full">
              <defs>
                <linearGradient id={`detailFade-${sourceId}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.24" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((tick) => {
                const y = padding.top + (plotH / 3) * tick;
                const rate = max - (domain / 3) * tick;
                return (
                  <g key={tick}>
                    <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
                    <text x={12} y={y + 4} fill="rgba(255,255,255,0.38)" fontSize="12" fontFamily="monospace">{rate.toFixed(2)}%</text>
                  </g>
                );
              })}
              {coords.length > 1 ? (
                <path d={`${pathFor(coords)} L ${coords.at(-1)?.x ?? padding.left} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`} fill={`url(#detailFade-${sourceId})`} />
              ) : null}
              <path d={pathFor(coords)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {coords.map((coord, index) => <circle key={`${points[index].date}-${points[index].rate}`} cx={coord.x} cy={coord.y} r={index === coords.length - 1 ? 5 : 3} fill={color} opacity={index === coords.length - 1 ? 1 : 0.55} />)}
              {points[0] ? <text x={padding.left} y={height - 12} fill="rgba(255,255,255,0.38)" fontSize="12">{points[0].date}</text> : null}
              {points.at(-1) ? <text x={width - padding.right - 82} y={height - 12} fill="rgba(255,255,255,0.38)" fontSize="12">{points.at(-1)!.date}</text> : null}
            </svg>
          ) : (
            <div className="flex h-[360px] items-center justify-center text-sm text-white/45">No historical points are available for this feed yet.</div>
          )}
          </div>
        </div>
      </section>
    </div>
  );
}
