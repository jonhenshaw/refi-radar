import { dateToMs, pathFor } from './scales';

import type { SeriesPoint } from '../../lib/api';

interface Props {
  points: SeriesPoint[];
  color: string;
  strokeWidth?: number;
  showFill?: boolean;
  className?: string;
}

/**
 * Mini line chart that fills its parent. Uses a fixed viewBox so it never
 * depends on a measured DOM size — pair with a parent that has explicit
 * height + width (e.g. h-8 w-32, or h-full inside a sized grid cell).
 */
const VB_W = 100;
const VB_H = 30;
const PAD = 1.5;

export function Sparkline({
  points,
  color,
  strokeWidth = 1.4,
  showFill = false,
  className,
}: Props) {
  if (points.length < 2) {
    return <div className={`h-full w-full ${className ?? ''}`} aria-hidden="true" />;
  }

  const xs = points.map((p) => dateToMs(p.date));
  const ys = points.map((p) => p.rate);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 0.0001;

  const innerH = VB_H - PAD * 2;
  const coords = points.map((p) => ({
    x: ((dateToMs(p.date) - xMin) / xSpan) * VB_W,
    y: PAD + ((yMax - p.rate) / ySpan) * innerH,
  }));

  const last = coords[coords.length - 1];
  const fillD =
    showFill && coords.length > 1
      ? `${pathFor(coords)} L ${last.x.toFixed(2)} ${VB_H} L ${coords[0].x.toFixed(2)} ${VB_H} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      className={`block h-full w-full ${className ?? ''}`}
      style={{ overflow: 'hidden' }}
      aria-hidden="true"
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
      {/* End dot — small absolute size via vector-effect to avoid distortion */}
      <circle cx={last.x} cy={last.y} r={1} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
