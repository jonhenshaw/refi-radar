import type { SourceId } from '@refi-radar/shared';

import type { RateSeries } from '../../lib/api';
import { ChartCanvas } from './ChartCanvas';
import { ChartLegend } from './ChartLegend';
import { useChartScales } from './hooks/useChartScales';
import { useResizeObserver } from './hooks/useResizeObserver';

const DEFAULT_PADDING = { top: 16, right: 18, bottom: 26, left: 52 };
const EXPANDED_PADDING = { top: 18, right: 22, bottom: 30, left: 58 };

export interface RateChartProps {
  series: RateSeries[];
  loading?: boolean;
  demo?: boolean;
  expanded?: boolean;
  primarySourceId?: SourceId;
  height?: number;
  ariaLabel?: string;
}

interface ChartBodyProps {
  series: RateSeries[];
  height: number;
  padding: typeof DEFAULT_PADDING;
  primarySourceId: SourceId;
  ariaLabel: string;
}

function ChartBody({ series, height, padding, primarySourceId, ariaLabel }: ChartBodyProps) {
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const viewport = { width: size.width, height, padding };
  const scales = useChartScales({ series, viewport });

  return (
    <div
      ref={ref}
      className="chart-frame"
      style={{ position: 'relative', width: '100%', height, touchAction: 'none' }}
      aria-label={ariaLabel}
    >
      {scales && size.width > 0 ? (
        <ChartCanvas
          series={series}
          scales={scales}
          width={size.width}
          height={height}
          primarySourceId={primarySourceId}
          ariaLabel={ariaLabel}
        />
      ) : null}
    </div>
  );
}

export function RateChart({
  series,
  loading = false,
  demo = false,
  expanded = false,
  primarySourceId = 'mnd_30y_fixed',
  height,
  ariaLabel,
}: RateChartProps) {
  const padding = expanded ? EXPANDED_PADDING : DEFAULT_PADDING;
  const frameHeight = height ?? (expanded ? 440 : 300);

  if (loading) {
    return <div className="chart-skeleton" style={{ height: frameHeight }} aria-hidden="true" />;
  }

  const hasPoints = series.some((s) => s.points.length > 0);
  if (!series.length || !hasPoints) {
    return (
      <div className="chart-empty" style={{ height: frameHeight }}>
        No rate history available.
      </div>
    );
  }

  return (
    <div className={expanded ? 'rate-chart rate-chart-expanded' : 'rate-chart'}>
      <ChartBody
        series={series}
        height={frameHeight}
        padding={padding}
        primarySourceId={primarySourceId}
        ariaLabel={ariaLabel ?? 'Mortgage rate history chart'}
      />
      <ChartLegend series={series} demo={demo} />
    </div>
  );
}
