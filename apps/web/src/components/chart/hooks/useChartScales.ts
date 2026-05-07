import { useMemo } from 'react';

import type { RateSeries } from '../../../lib/api';
import { buildScales, type ChartScales, type Viewport } from '../scales';

export interface UseChartScalesArgs {
  series: RateSeries[];
  viewport: Viewport;
  zoomDomain?: [number, number];
}

export function useChartScales({ series, viewport, zoomDomain }: UseChartScalesArgs): ChartScales | null {
  return useMemo(
    () => buildScales({ series, viewport, zoomDomain }),
    [series, viewport.width, viewport.height, viewport.padding.top, viewport.padding.right, viewport.padding.bottom, viewport.padding.left, zoomDomain?.[0], zoomDomain?.[1]],
  );
}
