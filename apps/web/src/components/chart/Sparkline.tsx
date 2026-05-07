import { useResizeObserver } from './hooks/useResizeObserver';
import { dateToMs, pathFor } from './scales';

import type { SeriesPoint } from '../../lib/api';

interface Props {
  points: SeriesPoint[];
  color: string;
  strokeWidth?: number;
  showFill?: boolean;
  className?: string;
  /** Force aspect ratio. If omitted, the component fills its parent. */
  width?: number;
  height?: number;
}

const PADDING_Y = 2;

export function Sparkline({
  points,
  color,
  strokeWidth = 1.4,
  showFill = false,
  className,
  width: widthProp,
  height: heightProp,
}: Props) {
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const width = widthProp ?? size.width ?? 0;
  const height = heightProp ?? size.height ?? 0;

  if (!points.length || width <= 0 || height <= 0) {
    return <div ref={ref} className={`h-full w-full ${className ?? ''}`} />;
  }

  const xs = points.map((p) => dateToMs(p.date));
  const ys = points.map((p) => p.rate);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 0.0001;

  const innerH = Math.max(1, height - PADDING_Y * 2);

  const coords = points.map((p, i) => ({
    x: ((dateToMs(p.date) - xMin) / xSpan) * width,
    y: PADDING_Y + ((yMax - p.rate) / ySpan) * innerH,
  }));

  const last = coords[coords.length - 1];
  const fillD =
    showFill && coords.length > 1
      ? `${pathFor(coords)} L ${last.x.toFixed(1)} ${(height - 0.5).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - 0.5).toFixed(1)} Z`
      : '';

  return (
    <div ref={ref} className={`h-full w-full ${className ?? ''}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {showFill && fillD ? (
          <path d={fillD} fill={color} fillOpacity={0.12} />
        ) : null}
        <path
          d={pathFor(coords)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {last ? <circle cx={last.x} cy={last.y} r={1.6} fill={color} /> : null}
      </svg>
    </div>
  );
}
