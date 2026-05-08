import type { RateSeries, SeriesPoint } from './api';

export interface CompositePoint {
  date: string;
  /** Composite value, 0–100. 0 = recent low across visible window, 100 = recent high. */
  value: number;
}

/**
 * Cross-source rate environment index.
 *
 * For each source: min-max normalize each point to [0, 1] over its own range
 * within the visible window. For each unique date: average the available
 * normalized values (sources missing data on that date are skipped). Output is
 * scaled to 0–100 for display.
 *
 * Sources whose visible range is degenerate (max == min, e.g. flat or single
 * point) are skipped — they would otherwise contribute NaN.
 */
export function computeCompositeIndex(series: RateSeries[]): CompositePoint[] {
  const normalized = new Map<string, Map<string, number>>();

  for (const s of series) {
    if (s.points.length < 2) continue;
    let min = Infinity;
    let max = -Infinity;
    for (const p of s.points) {
      if (p.rate < min) min = p.rate;
      if (p.rate > max) max = p.rate;
    }
    const span = max - min;
    if (span === 0 || !Number.isFinite(span)) continue;
    const map = new Map<string, number>();
    for (const p of s.points) {
      map.set(p.date, (p.rate - min) / span);
    }
    normalized.set(s.sourceId, map);
  }

  if (normalized.size === 0) return [];

  const allDates = new Set<string>();
  for (const map of normalized.values()) {
    for (const date of map.keys()) allDates.add(date);
  }

  const out: CompositePoint[] = [];
  for (const date of Array.from(allDates).sort()) {
    let sum = 0;
    let count = 0;
    for (const map of normalized.values()) {
      const v = map.get(date);
      if (typeof v === 'number' && Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    if (count === 0) continue;
    out.push({ date, value: (sum / count) * 100 });
  }
  return out;
}

export function compositeAsSeriesPoints(composite: CompositePoint[]): SeriesPoint[] {
  return composite.map((point) => ({ date: point.date, rate: point.value }));
}
