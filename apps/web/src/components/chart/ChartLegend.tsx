import type { RateSeries } from '../../lib/api';

interface Props {
  series: RateSeries[];
  demo?: boolean;
}

export function ChartLegend({ series, demo }: Props) {
  return (
    <div className="chart-legend">
      {series.map((item) => (
        <span key={item.sourceId} className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
      {demo ? <span className="chart-legend-demo">sample data</span> : null}
    </div>
  );
}
