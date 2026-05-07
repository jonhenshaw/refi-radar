import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SourceId } from '@refi-radar/shared';

import type { RateSeries } from '../../lib/api';
import { ChartCanvas } from './ChartCanvas';
import { ChartLegend } from './ChartLegend';
import { Crosshair } from './Crosshair';
import { Tooltip } from './Tooltip';
import { ZoomResetChip } from './ZoomResetChip';
import { useChartKeyboard } from './hooks/useChartKeyboard';
import { useChartScales } from './hooks/useChartScales';
import { usePointerScrub } from './hooks/usePointerScrub';
import { useResizeObserver } from './hooks/useResizeObserver';
import { useZoomGesture, type ZoomDomain } from './hooks/useZoomGesture';
import { buildScales, dateToMs } from './scales';

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

/** Compute the full unzoomed domain to feed the zoom gesture. */
function fullDomainFor(series: RateSeries[]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      const ms = dateToMs(p.date);
      if (ms < lo) lo = ms;
      if (ms > hi) hi = ms;
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (hi === lo) hi = lo + 86_400_000;
  return [lo, hi];
}

function ChartBody({ series, height, padding, primarySourceId, ariaLabel }: ChartBodyProps) {
  const { ref: sizeRef, size } = useResizeObserver<HTMLDivElement>();
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain>(undefined);

  const fullDomain = useMemo(() => fullDomainFor(series), [series]);

  // Reset zoom whenever the underlying series identity changes (range switch, refresh).
  useEffect(() => setZoomDomain(undefined), [series]);

  const viewport = { width: size.width, height, padding };
  const scales = useChartScales({ series, viewport, zoomDomain });

  // For zoom gestures we need a "full" set of scales (unzoomed) to map gestures over.
  const fullScales = useMemo(() => {
    if (!size.width) return null;
    return buildScales({ series, viewport: { width: size.width, height, padding } });
  }, [series, size.width, height, padding]);

  const { scrub, setScrub, setFrame: setScrubFrame, onPointerMove: onScrubMove, onPointerDown: onScrubDown, onPointerLeave, onPointerCancel: onScrubCancel } = usePointerScrub({
    series,
    scales,
    primarySourceId,
  });

  const {
    setFrame: setZoomFrame,
    dragRect,
    onPointerDown: onZoomDown,
    onPointerMove: onZoomMove,
    onPointerUp: onZoomUp,
    onPointerCancel: onZoomCancel,
    onLostPointerCapture,
  } = useZoomGesture({
    fullDomain: fullScales?.xDomain ?? fullDomain ?? [0, 1],
    pxRange: fullScales?.xRange ?? [padding.left, Math.max(size.width - padding.right, padding.left + 1)],
    onZoomChange: (next) => setZoomDomain(next),
  });

  const handleKeyDown = useChartKeyboard({
    series,
    scales,
    primarySourceId,
    scrub,
    setScrub,
    zoomDomain,
    setZoomDomain,
    fullDomain: fullScales?.xDomain ?? fullDomain,
  });

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      sizeRef(node);
      setScrubFrame(node);
      setZoomFrame(node);
    },
    [sizeRef, setScrubFrame, setZoomFrame],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onScrubDown(e);
      onZoomDown(e);
    },
    [onScrubDown, onZoomDown],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onScrubMove(e);
      onZoomMove(e);
    },
    [onScrubMove, onZoomMove],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onZoomUp(e);
    },
    [onZoomUp],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onScrubCancel();
      onZoomCancel(e);
    },
    [onScrubCancel, onZoomCancel],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave();
      // Treat leaving while mouse-dragging as a cancel of the zoom rect.
      if (e.pointerType === 'mouse') onZoomCancel(e);
    },
    [onPointerLeave, onZoomCancel],
  );

  return (
    <div
      ref={setRef}
      className="chart-frame"
      style={{ position: 'relative', width: '100%', height, touchAction: 'none' }}
      tabIndex={0}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onLostPointerCapture={onLostPointerCapture}
      onKeyDown={handleKeyDown}
    >
      {scales && size.width > 0 ? (
        <>
          <ChartCanvas
            series={series}
            scales={scales}
            width={size.width}
            height={height}
            primarySourceId={primarySourceId}
            ariaLabel={ariaLabel}
          >
            {scrub ? <Crosshair scrub={scrub} scales={scales} /> : null}
            {dragRect ? (
              <rect
                x={Math.min(dragRect.fromPx, dragRect.toPx)}
                y={scales.yRange[0]}
                width={Math.abs(dragRect.toPx - dragRect.fromPx)}
                height={scales.yRange[1] - scales.yRange[0]}
                fill="rgba(29,155,240,0.18)"
                stroke="rgba(29,155,240,0.55)"
                strokeWidth={1}
                pointerEvents="none"
              />
            ) : null}
          </ChartCanvas>
          {scrub ? <Tooltip scrub={scrub} containerWidth={size.width} /> : null}
          {zoomDomain ? <ZoomResetChip onReset={() => setZoomDomain(undefined)} /> : null}
        </>
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
