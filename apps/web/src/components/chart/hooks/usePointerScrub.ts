import { useCallback, useRef, useState } from 'react';

import type { RateSeries } from '../../../lib/api';
import { dateToMs, type ChartScales } from '../scales';

export interface ScrubInfo {
  primaryIndex: number;
  primaryDateMs: number;
  primaryDate: string;
  pxX: number;
  rows: Array<{ sourceId: string; label: string; color: string; rate: number; pxY: number }>;
}

interface UsePointerScrubArgs {
  series: RateSeries[];
  scales: ChartScales | null;
  primarySourceId: string;
  enabled?: boolean;
}

function lookupAt(points: Array<{ date: string; rate: number }>, targetMs: number): { rate: number; dateMs: number } | null {
  if (!points.length) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const m = dateToMs(points[mid].date);
    if (m < targetMs) lo = mid + 1;
    else hi = mid;
  }
  const cur = points[lo];
  const prev = lo > 0 ? points[lo - 1] : null;
  if (!prev) return { rate: cur.rate, dateMs: dateToMs(cur.date) };
  const dCur = Math.abs(dateToMs(cur.date) - targetMs);
  const dPrev = Math.abs(dateToMs(prev.date) - targetMs);
  return dPrev <= dCur ? { rate: prev.rate, dateMs: dateToMs(prev.date) } : { rate: cur.rate, dateMs: dateToMs(cur.date) };
}

export function usePointerScrub({ series, scales, primarySourceId, enabled = true }: UsePointerScrubArgs) {
  const [scrub, setScrub] = useState<ScrubInfo | null>(null);
  const frameRef = useRef<HTMLElement | null>(null);

  const compute = useCallback(
    (clientX: number): ScrubInfo | null => {
      const node = frameRef.current;
      if (!node || !scales) return null;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0) return null;

      // SVG viewBox matches measured pixel size, so chartX === clientX - rect.left.
      const chartX = Math.min(Math.max(clientX - rect.left, scales.xRange[0]), scales.xRange[1]);

      const primary = series.find((s) => s.sourceId === primarySourceId) ?? series.find((s) => s.points.length > 0);
      if (!primary || !primary.points.length) return null;
      const idx = scales.pxToIndex(chartX, primary.points);
      if (idx < 0 || idx >= primary.points.length) return null;
      const primaryPoint = primary.points[idx];
      const primaryDateMs = dateToMs(primaryPoint.date);

      const rows: ScrubInfo['rows'] = [];
      for (const item of series) {
        if (!item.points.length) continue;
        const v = lookupAt(item.points, primaryDateMs);
        if (!v) continue;
        rows.push({
          sourceId: item.sourceId,
          label: item.label,
          color: item.color,
          rate: v.rate,
          pxY: scales.yToPx(v.rate),
        });
      }

      return {
        primaryIndex: idx,
        primaryDateMs,
        primaryDate: primaryPoint.date,
        pxX: scales.xToPx(primaryDateMs),
        rows,
      };
    },
    [scales, series, primarySourceId],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      // Mouse: every move. Touch/pen: only while pressed (user is "tap-scrubbing").
      if (e.pointerType !== 'mouse' && e.buttons === 0) return;
      const info = compute(e.clientX);
      setScrub(info);
    },
    [compute, enabled],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        const info = compute(e.clientX);
        setScrub(info);
      }
    },
    [compute, enabled],
  );

  const onPointerLeave = useCallback(() => setScrub(null), []);
  const onPointerCancel = useCallback(() => setScrub(null), []);
  const setFrame = useCallback((node: HTMLElement | null) => {
    frameRef.current = node;
  }, []);

  return { scrub, setScrub, setFrame, onPointerMove, onPointerDown, onPointerLeave, onPointerCancel, clear: () => setScrub(null) };
}
