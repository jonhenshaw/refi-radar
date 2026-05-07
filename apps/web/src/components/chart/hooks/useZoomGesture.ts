import { useCallback, useEffect, useRef, useState } from 'react';

export type ZoomDomain = [number, number] | undefined;

export interface DragRect {
  fromPx: number;
  toPx: number;
}

interface UseZoomGestureArgs {
  enabled?: boolean;
  /** Total domain (in ms) the gesture maps over — typically `scales.xDomain`. */
  fullDomain: [number, number];
  /** Pixel range mapped onto fullDomain (typically `scales.xRange`). */
  pxRange: [number, number];
  onZoomChange: (next: ZoomDomain) => void;
}

const PIXEL_DRAG_THRESHOLD = 6;
const MIN_ZOOM_PX = 12;

interface PointerSnapshot {
  id: number;
  type: string;
  startClientX: number;
  startClientY: number;
  clientX: number;
  clientY: number;
}

export function useZoomGesture({ enabled = true, fullDomain, pxRange, onZoomChange }: UseZoomGestureArgs) {
  const pointers = useRef<Map<number, PointerSnapshot>>(new Map());
  const frameRef = useRef<HTMLElement | null>(null);
  const startDomainRef = useRef<[number, number] | null>(null);
  const startDistanceRef = useRef<number | null>(null);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const setFrame = useCallback((node: HTMLElement | null) => {
    frameRef.current = node;
  }, []);

  const clientXToDomain = useCallback(
    (clientX: number): number => {
      const node = frameRef.current;
      if (!node) return fullDomain[0];
      const rect = node.getBoundingClientRect();
      if (rect.width === 0) return fullDomain[0];
      const ratio = (clientX - rect.left) / rect.width;
      const px = pxRange[0] + ratio * (pxRange[1] - pxRange[0]);
      const dRatio = (px - pxRange[0]) / Math.max(pxRange[1] - pxRange[0], 1);
      return fullDomain[0] + dRatio * (fullDomain[1] - fullDomain[0]);
    },
    [fullDomain, pxRange],
  );

  const clientXToPx = useCallback(
    (clientX: number): number => {
      const node = frameRef.current;
      if (!node) return pxRange[0];
      const rect = node.getBoundingClientRect();
      if (rect.width === 0) return pxRange[0];
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      return pxRange[0] + ratio * (pxRange[1] - pxRange[0]);
    },
    [pxRange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      const isMouse = e.pointerType === 'mouse';
      if (isMouse && e.button !== 0) return;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // React 19 Strict Mode can throw here in dev; safe to ignore.
      }

      pointers.current.set(e.pointerId, {
        id: e.pointerId,
        type: e.pointerType,
        startClientX: e.clientX,
        startClientY: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
      });

      // Mouse: start a drag-to-zoom selection.
      if (isMouse) {
        setDragRect({ fromPx: clientXToPx(e.clientX), toPx: clientXToPx(e.clientX) });
        return;
      }

      // Touch: with 2 pointers down, capture starting state for pinch.
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        startDistanceRef.current = Math.abs(b.clientX - a.clientX);
        startDomainRef.current = [...fullDomain];
        setIsPanning(false);
      } else if (pointers.current.size === 1) {
        startDomainRef.current = [...fullDomain];
        setIsPanning(true);
      }
    },
    [enabled, fullDomain, clientXToPx],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      const snap = pointers.current.get(e.pointerId);
      if (!snap) return;
      snap.clientX = e.clientX;
      snap.clientY = e.clientY;

      // Mouse drag-to-zoom rectangle.
      if (snap.type === 'mouse') {
        if (Math.abs(e.clientX - snap.startClientX) < PIXEL_DRAG_THRESHOLD) return;
        setDragRect({ fromPx: clientXToPx(snap.startClientX), toPx: clientXToPx(e.clientX) });
        return;
      }

      // Touch / pen.
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        const startDistance = startDistanceRef.current;
        const startDomain = startDomainRef.current;
        if (!startDistance || !startDomain) return;
        const distance = Math.max(Math.abs(b.clientX - a.clientX), 1);
        const scale = startDistance / distance;
        const startSpan = startDomain[1] - startDomain[0];
        const newSpan = startSpan * scale;
        // Anchor zoom around the gesture midpoint.
        const midClientX = (a.startClientX + b.startClientX) / 2;
        const midDomain = clientXToDomain(midClientX);
        const before = midDomain - startDomain[0];
        const ratio = before / startSpan;
        const next: [number, number] = [midDomain - newSpan * ratio, midDomain + newSpan * (1 - ratio)];
        onZoomChange(clampToFull(next, fullDomain));
      } else if (pointers.current.size === 1) {
        const startDomain = startDomainRef.current;
        if (!startDomain) return;
        // Convert horizontal client delta into a domain pan.
        const node = frameRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.width === 0) return;
        const dxClient = e.clientX - snap.startClientX;
        const span = startDomain[1] - startDomain[0];
        const dDomain = (dxClient / rect.width) * span;
        const next: [number, number] = [startDomain[0] - dDomain, startDomain[1] - dDomain];
        onZoomChange(clampToFull(next, fullDomain));
      }
    },
    [enabled, clientXToPx, clientXToDomain, fullDomain, onZoomChange],
  );

  const finishPointer = useCallback(
    (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
      const snap = pointers.current.get(e.pointerId);
      if (!snap) return;
      pointers.current.delete(e.pointerId);

      if (snap.type === 'mouse') {
        const rect = dragRect;
        setDragRect(null);
        if (!cancelled && rect && Math.abs(rect.toPx - rect.fromPx) >= MIN_ZOOM_PX) {
          const lo = Math.min(rect.fromPx, rect.toPx);
          const hi = Math.max(rect.fromPx, rect.toPx);
          const span = pxRange[1] - pxRange[0];
          const dLo = fullDomain[0] + ((lo - pxRange[0]) / span) * (fullDomain[1] - fullDomain[0]);
          const dHi = fullDomain[0] + ((hi - pxRange[0]) / span) * (fullDomain[1] - fullDomain[0]);
          onZoomChange(clampToFull([dLo, dHi], fullDomain));
        }
        return;
      }

      if (pointers.current.size === 0) {
        startDistanceRef.current = null;
        startDomainRef.current = null;
        setIsPanning(false);
      } else if (pointers.current.size === 1) {
        const remaining = Array.from(pointers.current.values())[0];
        // Re-anchor for follow-up pan with one finger left on screen.
        remaining.startClientX = remaining.clientX;
        remaining.startClientY = remaining.clientY;
        startDistanceRef.current = null;
        startDomainRef.current = [...fullDomain];
        setIsPanning(true);
      }
    },
    [dragRect, fullDomain, pxRange, onZoomChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => finishPointer(e, false), [finishPointer]);
  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLElement>) => finishPointer(e, true), [finishPointer]);
  const onLostPointerCapture = useCallback((e: React.PointerEvent<HTMLElement>) => finishPointer(e, true), [finishPointer]);

  // Defensive: if the component unmounts mid-gesture, clear pointer map.
  useEffect(() => () => pointers.current.clear(), []);

  return { setFrame, dragRect, isPanning, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture };
}

function clampToFull([lo, hi]: [number, number], full: [number, number]): [number, number] {
  const span = hi - lo;
  let clampedLo = Math.max(lo, full[0]);
  let clampedHi = Math.min(hi, full[1]);
  if (clampedHi - clampedLo < span) {
    if (clampedLo === full[0]) clampedHi = Math.min(full[1], clampedLo + span);
    if (clampedHi === full[1]) clampedLo = Math.max(full[0], clampedHi - span);
  }
  if (clampedHi <= clampedLo) clampedHi = clampedLo + 1;
  return [clampedLo, clampedHi];
}
