import type { RateSeries, SeriesPoint } from '../../lib/api';

export interface Viewport {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ChartScales {
  xRange: [number, number];
  yRange: [number, number];
  xDomain: [number, number];
  yDomain: [number, number];
  xToPx: (timeMs: number) => number;
  yToPx: (rate: number) => number;
  pxToTime: (px: number) => number;
  pxToIndex: (px: number, primary: SeriesPoint[]) => number;
  yTicks: number[];
  xTicks: Array<{ timeMs: number; label: string }>;
}

/** Parse a YYYY-MM-DD or full ISO string to UTC milliseconds, anchored at noon UTC. */
export function dateToMs(date: string): number {
  if (date.length === 10) {
    const [y, m, d] = date.split('-').map(Number);
    return Date.UTC(y, m - 1, d, 12, 0, 0);
  }
  return new Date(date).getTime();
}

/** Inclusive linear interpolation. */
function linear(value: number, [d0, d1]: [number, number], [r0, r1]: [number, number]): number {
  if (d1 === d0) return r0;
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/** Find index of the point in `points` whose time is closest to `targetMs`. Bisector. */
export function bisectIndex(points: SeriesPoint[], targetMs: number): number {
  if (!points.length) return -1;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const midMs = dateToMs(points[mid].date);
    if (midMs < targetMs) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0) {
    const prev = dateToMs(points[lo - 1].date);
    const cur = dateToMs(points[lo].date);
    if (Math.abs(targetMs - prev) <= Math.abs(targetMs - cur)) return lo - 1;
  }
  return lo;
}

function niceYTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => max - step * i);
}

function pickXTickCount(width: number): number {
  if (width < 320) return 2;
  if (width < 480) return 3;
  if (width < 720) return 5;
  return 7;
}

function formatXLabel(ms: number, span: number): string {
  const d = new Date(ms);
  if (span < 7 * 86_400_000) {
    return d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
  }
  if (span < 365 * 86_400_000) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  if (span < 5 * 365 * 86_400_000) {
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  return d.getUTCFullYear().toString();
}

export interface BuildScalesArgs {
  series: RateSeries[];
  viewport: Viewport;
  zoomDomain?: [number, number];
}

export function buildScales({ series, viewport, zoomDomain }: BuildScalesArgs): ChartScales | null {
  const allPoints = series.flatMap((s) => s.points);
  if (!allPoints.length) return null;

  const allMs = allPoints.map((p) => dateToMs(p.date));
  const allRates = allPoints.map((p) => p.rate);

  const xMinFull = Math.min(...allMs);
  const xMaxFull = Math.max(...allMs);
  const yMinRaw = Math.min(...allRates);
  const yMaxRaw = Math.max(...allRates);
  const yPad = Math.max((yMaxRaw - yMinRaw) * 0.12, 0.04);
  const yMin = yMinRaw - yPad;
  const yMax = yMaxRaw + yPad;

  const xDomain: [number, number] = zoomDomain
    ? [Math.max(zoomDomain[0], xMinFull), Math.min(zoomDomain[1], xMaxFull)]
    : [xMinFull, xMaxFull === xMinFull ? xMinFull + 86_400_000 : xMaxFull];

  const yDomain: [number, number] = [yMin, yMax];
  const xRange: [number, number] = [viewport.padding.left, viewport.width - viewport.padding.right];
  const yRange: [number, number] = [viewport.padding.top, viewport.height - viewport.padding.bottom];

  const xToPx = (ms: number): number => linear(ms, xDomain, xRange);
  const yToPx = (rate: number): number => linear(rate, [yDomain[1], yDomain[0]], yRange);
  const pxToTime = (px: number): number => linear(px, xRange, xDomain);
  const pxToIndex = (px: number, primary: SeriesPoint[]): number => bisectIndex(primary, pxToTime(px));

  const yTicks = niceYTicks(yDomain[0], yDomain[1], 4);

  const span = xDomain[1] - xDomain[0];
  const tickCount = pickXTickCount(viewport.width);
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const t = xDomain[0] + (span * i) / (tickCount - 1);
    return { timeMs: t, label: formatXLabel(t, span) };
  });

  return { xRange, yRange, xDomain, yDomain, xToPx, yToPx, pxToTime, pxToIndex, yTicks, xTicks };
}

/** Build an SVG path string (`M x y L x y …`) given coords. */
export function pathFor(coords: Array<{ x: number; y: number }>): string {
  if (!coords.length) return '';
  return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
}
