import { X } from 'lucide-react';

import type { RangeKey, RateSeries } from '../lib/api';
import { RateChart } from './RateChart';
import { formatRate } from './MetricCard';

const compactRangeLabels: Record<RangeKey, string> = {
  '5D': '5D',
  '1M': '1M',
  '3M': '3M',
  '1Y': '1Y',
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
  const title = `${compactRangeLabels[range]} Trend`;

  return (
    <div className="rate-detail-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Expanded mortgage rate history chart"
        className="rate-detail-dialog panel chart-inspect-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="chart-inspect-topbar">
          <div>
            <p className="chart-inspect-eyebrow">Expanded chart</p>
            <h2 className="chart-inspect-topline">{title}</h2>
          </div>
          <button type="button" aria-label="Close expanded chart" onClick={onClose} className="rate-detail-close chart-inspect-close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="chart-inspect-chart rate-detail-chart">
          <RateChart series={series} />
        </div>

        <div className="chart-inspect-compact-summary" aria-label="Chart summary">
          <span>{formatRate(latest)} latest</span>
          <span>{feeds} feeds</span>
          <span>{points} pts</span>
        </div>
      </section>
    </div>
  );
}
