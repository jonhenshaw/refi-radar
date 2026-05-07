import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SourceId } from '@refi-radar/shared';

import type { RateSeries } from '../../lib/api';
import { ChartCanvas } from './ChartCanvas';
import { ChartLegend } from './ChartLegend';
import { Crosshair } from './Crosshair';
import { StackedSparklines } from './StackedSparklines';
import { Tooltip } from './Tooltip';
import { ZoomResetChip } from './ZoomResetChip';
import { useChartKeyboard } from './hooks/useChartKeyboard';
import { useChartScales } from './hooks/useChartScales';
import { usePointerScrub } from './hooks/usePointerScrub';
import { useResizeObserver } from './hooks/useResizeObserver';
import { useZoomGesture, type ZoomDomain } from './hooks/useZoomGesture';
import { buildScales, dateToMs } from './scales';

type Padding = { top: number; right: number; bottom: number; left: number };

interface Layout {
  padding: Padding;
  fontSize: number;
  showGradient: boolean;
}

function layoutForWidth(width: number, expanded: boolean): Layout {
  if (expanded) return { padding: { top: 18, right: 22, bottom: 30, left: 58 }, fontSize: 12, showGradient: true };
  if (width >= 960) return { padding: { top: 16, right: 18, bottom: 26, left: 52 }, fontSize: 12, showGradient: true };
  if (width >= 720) return { padding: { top: 14, right: 16, bottom: 24, left: 44 }, fontSize: 11, showGradient: true };
  return { padding: { top: 12, right: 12, bottom: 22, left: 36 }, fontSize: 10, showGradient: false };
}

export interface RateChartProps {
  series: RateSeries[];
  loading?: boolean;
  demo?: boolean;
  expanded?: boolean;
  primarySourceId?: SourceId;
  height?: number;
  ariaLabel?: string;
  /** When the chart is too narrow to render a useful multi-line view, switch to stacked sparklines. */
  forceMode?: 'multi' | 'stack';
  onSelectSource?: (sourceId: SourceId) => void;
}

interface ChartBodyProps {
  series: RateSeries[];
  height: number;
  layout: Layout;
  primarySourceId: SourceId;
  ariaLabel: string;
}

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

function ChartBody({ series, height, layout, primarySourceId, ariaLabel }: ChartBodyProps) {
  const { ref: sizeRef, size } = useResizeObserver<HTMLDivElement>();
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain>(undefined);

  const fullDomain = useMemo(() => fullDomainFor(series), [series]);

  useEffect(() => setZoomDomain(undefined), [series]);

  const padding = layout.padding;
  const viewport = { width: size.width, height, padding };
  const scales = useChartScales({ series, viewport, zoomDomain });

  const fullScales = useMemo(() => {
    if (!size.width) return null;
    return buildScales({ series, viewport: { width: size.width, height, padding } });
  }, [series, size.width, height, padding]);

  const {
    scrub,
    setScrub,
    setFrame: setScrubFrame,
    onPointerMove: onScrubMove,
    onPointerDown: onScrubDown,
    onPointerLeave,
    onPointerCancel: onScrubCancel,
  } = usePointerScrub({ series, scales, primarySourceId });

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
      if (e.pointerType === 'mouse') onZoomCancel(e);
    },
    [onPointerLeave, onZoomCancel],
  );

  return (
    <div
      ref={setRef}
      className="chart-frame"
      style={{ height }}
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
            fontSize={layout.fontSize}
            showGradient={layout.showGradient}
          >
            {scrub ? <Crosshair scrub={scrub} scales={scales} /> : null}
            {dragRect ? (
              <rect
                x={Math.min(dragRect.fromPx, dragRect.toPx)}
                y={scales.yRange[0]}
                width={Math.abs(dragRect.toPx - dragRect.fromPx)}
                height={scales.yRange[1] - scales.yRange[0]}
                fill="rgba(77,159,255,0.16)"
                stroke="rgba(77,159,255,0.5)"
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

interface ResolvedHeight {
  bodyHeight: number;
  cssMinHeight: string | undefined;
}

function resolveHeight(explicit: number | undefined, expanded: boolean, mode: 'multi' | 'stack'): ResolvedHeight {
  if (explicit) return { bodyHeight: explicit, cssMinHeight: undefined };
  if (expanded) return { bodyHeight: 440, cssMinHeight: 'clamp(360px, 60vh, 560px)' };
  if (mode === 'stack') return { bodyHeight: 200, cssMinHeight: undefined };
  return { bodyHeight: 320, cssMinHeight: 'clamp(260px, 38vh, 340px)' };
}

export function RateChart({
  series,
  loading = false,
  demo = false,
  expanded = false,
  primarySourceId = 'mnd_30y_fixed',
  height,
  ariaLabel,
  forceMode,
  onSelectSource,
}: RateChartProps) {
  const { ref: outerRef, size: outerSize } = useResizeObserver<HTMLDivElement>();
  const containerWidth = outerSize.width;

  const detectedMode: 'multi' | 'stack' = expanded
    ? 'multi'
    : containerWidth > 0 && containerWidth < 480
      ? 'stack'
      : 'multi';
  const mode = forceMode ?? detectedMode;

  const layout = useMemo(
    () => layoutForWidth(containerWidth || 920, expanded),
    [containerWidth, expanded],
  );

  const { bodyHeight, cssMinHeight } = resolveHeight(height, expanded, mode);

  if (loading) {
    return (
      <div
        ref={outerRef}
        className="chart-skeleton"
        style={{ height: bodyHeight, minHeight: cssMinHeight }}
        aria-hidden="true"
      />
    );
  }

  const hasPoints = series.some((s) => s.points.length > 0);
  if (!series.length || !hasPoints) {
    return (
      <div
        ref={outerRef}
        className="chart-empty"
        style={{ height: bodyHeight, minHeight: cssMinHeight }}
      >
        No rate history available.
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="flex flex-col gap-3"
      style={{ minHeight: cssMinHeight }}
    >
      {mode === 'stack' && !expanded ? (
        <StackedSparklines
          series={series}
          height={bodyHeight}
          onSelect={onSelectSource}
        />
      ) : (
        <ChartBody
          series={series}
          height={bodyHeight}
          layout={layout}
          primarySourceId={primarySourceId}
          ariaLabel={ariaLabel ?? 'Mortgage rate history chart'}
        />
      )}
      <ChartLegend series={series} demo={demo} />
    </div>
  );
}
