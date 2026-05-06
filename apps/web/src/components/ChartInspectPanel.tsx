import { X } from 'lucide-react';

import type { RangeKey, RateSeries } from '../lib/api';
import { RateChart } from './RateChart';
import { formatRate } from './MetricCard';

const rangeLabels: Record<RangeKey, string> = {
  '5D': '5-day',
  '1M': '1-month',
  '3M': '3-month',
  '1Y': '12-month',
};

function countPoints(series: RateSeries[]): number {
  return series.reduce((sum, item) => sum + item.points.length, 0);
}

function latestPrimaryRate(series: RateSeries[]): number | undefined {
  const primary = series.find((item) => item.sourceId === 'mnd_30y_fixed') ?? series[0];
  return primary?.points.at(-1)?.rate;
}

export function ChartInspectPanel({ series, range, onClose }: { series: RateSeries[]; range: RangeKey; onClose: () => void }) {
  const points = countPoints(series);
  const feeds = series.filter((item) => item.points.length > 0).length;
  const latest = latestPrimaryRate(series);

  return (
    <div className="rate-detail-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Expanded mortgage rate history chart"
        className="rate-detail-dialog panel chart-inspect-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rate-detail-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9BF0]">Expanded chart</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{rangeLabels[range]} multi-source trend</h2>
            <p className="mt-2 text-sm text-white/45">Inspect all tracked feeds across the selected date filter.</p>
          </div>
          <button type="button" aria-label="Close expanded chart" onClick={onClose} className="rate-detail-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="chart-inspect-summary">
          <div className="subpanel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">Primary latest</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-white">{formatRate(latest)}</p>
          </div>
          <div className="subpanel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">Feeds</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-white">{feeds}</p>
          </div>
          <div className="subpanel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">Points</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-white">{points}</p>
          </div>
        </div>

        <div className="chart-inspect-chart rate-detail-chart">
          <RateChart series={series} />
        </div>
      </section>
    </div>
  );
}
