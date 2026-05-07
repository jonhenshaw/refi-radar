import { useCallback } from 'react';

import type { RateSeries } from '../../../lib/api';
import { dateToMs, type ChartScales } from '../scales';
import type { ScrubInfo } from './usePointerScrub';
import type { ZoomDomain } from './useZoomGesture';

interface UseChartKeyboardArgs {
  series: RateSeries[];
  scales: ChartScales | null;
  primarySourceId: string;
  scrub: ScrubInfo | null;
  setScrub: (info: ScrubInfo | null) => void;
  zoomDomain: ZoomDomain;
  setZoomDomain: (next: ZoomDomain) => void;
  fullDomain: [number, number] | null;
}

export function useChartKeyboard({
  series,
  scales,
  primarySourceId,
  scrub,
  setScrub,
  zoomDomain,
  setZoomDomain,
  fullDomain,
}: UseChartKeyboardArgs) {
  return useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!scales) return;
      const primary = series.find((s) => s.sourceId === primarySourceId) ?? series.find((s) => s.points.length > 0);
      if (!primary || primary.points.length === 0) return;

      const moveBy = (delta: number) => {
        const currentIdx = scrub ? scrub.primaryIndex : Math.floor(primary.points.length / 2);
        const next = Math.min(Math.max(currentIdx + delta, 0), primary.points.length - 1);
        const point = primary.points[next];
        const dateMs = dateToMs(point.date);
        const rows: ScrubInfo['rows'] = [];
        for (const s of series) {
          if (!s.points.length) continue;
          // Reuse simple linear lookup-by-equal-date for keyboard-driven scrub.
          const matchIdx = bisectBy(s.points, dateMs);
          if (matchIdx < 0) continue;
          const v = s.points[matchIdx];
          rows.push({ sourceId: s.sourceId, label: s.label, color: s.color, rate: v.rate, pxY: scales.yToPx(v.rate) });
        }
        setScrub({
          primaryIndex: next,
          primaryDateMs: dateMs,
          primaryDate: point.date,
          pxX: scales.xToPx(dateMs),
          rows,
        });
      };

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        moveBy(step * (e.shiftKey ? 7 : 1));
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        moveBy(-primary.points.length);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        moveBy(primary.points.length);
        return;
      }

      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
        if (!fullDomain) return;
        e.preventDefault();
        const center = scrub ? scrub.primaryDateMs : (scales.xDomain[0] + scales.xDomain[1]) / 2;
        const zoomFactor = e.key === '-' || e.key === '_' ? 1.6 : 1 / 1.6;
        const span = scales.xDomain[1] - scales.xDomain[0];
        const newSpan = span * zoomFactor;
        let lo = center - newSpan / 2;
        let hi = center + newSpan / 2;
        if (lo < fullDomain[0]) {
          hi += fullDomain[0] - lo;
          lo = fullDomain[0];
        }
        if (hi > fullDomain[1]) {
          lo -= hi - fullDomain[1];
          hi = fullDomain[1];
        }
        lo = Math.max(lo, fullDomain[0]);
        hi = Math.min(hi, fullDomain[1]);
        if (newSpan >= fullDomain[1] - fullDomain[0]) {
          setZoomDomain(undefined);
        } else {
          setZoomDomain([lo, hi]);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (zoomDomain) {
          e.preventDefault();
          setZoomDomain(undefined);
        } else if (scrub) {
          e.preventDefault();
          setScrub(null);
        }
      }
    },
    [scales, series, primarySourceId, scrub, setScrub, zoomDomain, setZoomDomain, fullDomain],
  );
}

function bisectBy(points: Array<{ date: string }>, targetMs: number): number {
  if (!points.length) return -1;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const m = dateToMs(points[mid].date);
    if (m < targetMs) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0) {
    const dCur = Math.abs(dateToMs(points[lo].date) - targetMs);
    const dPrev = Math.abs(dateToMs(points[lo - 1].date) - targetMs);
    if (dPrev <= dCur) return lo - 1;
  }
  return lo;
}
