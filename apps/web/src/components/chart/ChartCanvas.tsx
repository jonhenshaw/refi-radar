import type { CSSProperties } from 'react';

import type { RateSeries } from '../../lib/api';
import { dateToMs, pathFor, type ChartScales } from './scales';

const FALLBACK_PRIMARY = 'mnd_30y_fixed' as const;

interface Props {
  series: RateSeries[];
  scales: ChartScales;
  width: number;
  height: number;
  primarySourceId?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

export function ChartCanvas({ series, scales, width, height, primarySourceId, ariaLabel, style, children }: Props) {
  const primaryId = primarySourceId ?? FALLBACK_PRIMARY;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel ?? 'Mortgage rate history'}
      width={width}
      height={height}
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id="rateChartFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1D9BF0" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#1D9BF0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {scales.yTicks.map((rate, i) => {
        const y = scales.yToPx(rate);
        return (
          <g key={`y-${i}`} pointerEvents="none">
            <line
              x1={scales.xRange[0]}
              x2={scales.xRange[1]}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text
              x={scales.xRange[0] - 8}
              y={y + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.42)"
              fontSize="11"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {rate.toFixed(2)}%
            </text>
          </g>
        );
      })}

      {scales.xTicks.map((tick, i) => {
        const x = scales.xToPx(tick.timeMs);
        return (
          <text
            key={`x-${i}`}
            x={x}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === scales.xTicks.length - 1 ? 'end' : 'middle'}
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            pointerEvents="none"
          >
            {tick.label}
          </text>
        );
      })}

      {series.map((item) => {
        if (!item.points.length) return null;
        const coords = item.points.map((point) => ({
          x: scales.xToPx(dateToMs(point.date)),
          y: scales.yToPx(point.rate),
        }));
        const isPrimary = item.sourceId === primaryId;
        const last = coords.at(-1);
        return (
          <g key={item.sourceId}>
            {isPrimary && coords.length > 1 ? (
              <path
                d={`${pathFor(coords)} L ${last!.x.toFixed(1)} ${(scales.yRange[1]).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(scales.yRange[1]).toFixed(1)} Z`}
                fill="url(#rateChartFade)"
              />
            ) : null}
            <path
              d={pathFor(coords)}
              fill="none"
              stroke={item.color}
              strokeWidth={isPrimary ? 2.5 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isPrimary ? 1 : 0.85}
              vectorEffect="non-scaling-stroke"
            />
            {last ? (
              <circle
                cx={last.x}
                cy={last.y}
                r={isPrimary ? 4 : 3}
                fill={item.color}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="1"
              />
            ) : null}
          </g>
        );
      })}

      {children}
    </svg>
  );
}
