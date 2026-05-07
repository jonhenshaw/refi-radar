import { useEffect, useRef, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

const FALLBACK: ElementSize = { width: 920, height: 340 };

export function useResizeObserver<T extends HTMLElement>(): { ref: (node: T | null) => void; size: ElementSize } {
  const [size, setSize] = useState<ElementSize>(FALLBACK);
  const cleanupRef = useRef<(() => void) | null>(null);

  const refCallback = (node: T | null): void => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (!node) return;

    const measure = (): void => {
      const rect = node.getBoundingClientRect();
      const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
      if (next.width > 0 && next.height > 0) {
        setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
      }
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    cleanupRef.current = () => ro.disconnect();
  };

  useEffect(() => () => {
    if (cleanupRef.current) cleanupRef.current();
  }, []);

  return { ref: refCallback, size };
}
