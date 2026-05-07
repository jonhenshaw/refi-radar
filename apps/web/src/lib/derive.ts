import type { RateSeries, SeriesPoint } from './api';
import { dateToMs } from '../components/chart/scales';

/** Find the rate value N days ago from the most recent point. */
export function compareToBaseline(points: SeriesPoint[], daysAgo: number): number | undefined {
  if (!points.length) return undefined;
  const last = points[points.length - 1];
  const targetMs = dateToMs(last.date) - daysAgo * 86_400_000;
  let best: SeriesPoint | undefined;
  let bestDiff = Infinity;
  for (const p of points) {
    const ms = dateToMs(p.date);
    if (ms > dateToMs(last.date)) continue;
    const diff = Math.abs(ms - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best?.rate;
}

/** Δ in basis points between current value and N days ago. Positive = rate up. */
export function deltaBpsAgo(points: SeriesPoint[], daysAgo: number): number | undefined {
  if (!points.length) return undefined;
  const current = points[points.length - 1].rate;
  const past = compareToBaseline(points, daysAgo);
  if (past === undefined) return undefined;
  return Math.round((current - past) * 100);
}

/** Min/max rate over the last N days. */
export function windowExtremes(points: SeriesPoint[], days: number): { lo: number; hi: number } | undefined {
  if (!points.length) return undefined;
  const lastMs = dateToMs(points[points.length - 1].date);
  const cutoffMs = lastMs - days * 86_400_000;
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of points) {
    if (dateToMs(p.date) < cutoffMs) continue;
    if (p.rate < lo) lo = p.rate;
    if (p.rate > hi) hi = p.rate;
  }
  if (!Number.isFinite(lo)) return undefined;
  return { lo, hi };
}

/** Percentile rank (0–100) of `value` within the historical points. */
export function pctRank(points: SeriesPoint[], value: number): number | undefined {
  if (!points.length) return undefined;
  const below = points.filter((p) => p.rate <= value).length;
  return Math.round((below / points.length) * 100);
}

/** MND - 10Y spread in bps (or any two rate series). Uses last point of each. */
export function lastSpreadBps(a: RateSeries | undefined, b: RateSeries | undefined): number | undefined {
  if (!a?.points.length || !b?.points.length) return undefined;
  const aRate = a.points[a.points.length - 1].rate;
  const bRate = b.points[b.points.length - 1].rate;
  return Math.round((aRate - bRate) * 100);
}

/** Average spread (in bps) over the last N points where both series have data on the same date. */
export function avgSpreadBps(a: RateSeries | undefined, b: RateSeries | undefined, lastN = 30): number | undefined {
  if (!a?.points.length || !b?.points.length) return undefined;
  const bByDate = new Map(b.points.map((p) => [p.date, p.rate]));
  const aligned = a.points
    .map((p) => ({ date: p.date, a: p.rate, b: bByDate.get(p.date) }))
    .filter((row): row is { date: string; a: number; b: number } => row.b !== undefined)
    .slice(-lastN);
  if (!aligned.length) return undefined;
  const sum = aligned.reduce((acc, row) => acc + (row.a - row.b), 0);
  return Math.round((sum / aligned.length) * 100);
}

/** Largest-Triangle-Three-Buckets-style (simplified) downsampler for sparklines. */
export function downsample(points: SeriesPoint[], maxPoints = 120): SeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const stride = points.length / maxPoints;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(points.length - 1, Math.floor(i * stride));
    out.push(points[idx]);
  }
  if (out[out.length - 1] !== points[points.length - 1]) {
    out.push(points[points.length - 1]);
  }
  return out;
}

/** Highest and lowest rate across the full series (used for 52w-style calls when range=1Y/MAX). */
export function extremes(points: SeriesPoint[]): { lo: number; hi: number } | undefined {
  if (!points.length) return undefined;
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of points) {
    if (p.rate < lo) lo = p.rate;
    if (p.rate > hi) hi = p.rate;
  }
  return { lo, hi };
}

/** Format a bps number with sign + unit ("+4 bps", "−12 bps", "0 bps", or "—"). */
export function fmtBps(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (value === 0) return '0 bps';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(Math.round(value))} bps`;
}

/** Tone helper for change values: down = good, up = bad. */
export function bpsTone(value: number | undefined): 'good' | 'bad' | 'flat' | 'unknown' {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown';
  if (value < 0) return 'good';
  if (value > 0) return 'bad';
  return 'flat';
}

/** Format a rate value as percent with 2 decimals or em-dash. */
export function fmtPct(value: number | undefined, decimals = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

function pointsWithinDays(points: SeriesPoint[], days: number): SeriesPoint[] {
  if (!points.length) return [];
  const lastMs = dateToMs(points[points.length - 1].date);
  const cutoffMs = lastMs - days * 86_400_000;
  return points.filter((p) => dateToMs(p.date) >= cutoffMs);
}

/**
 * Population standard deviation of day-over-day rate changes within the last `windowDays`,
 * expressed in basis points. Returns undefined when there are fewer than two consecutive
 * observations in the window.
 */
export function volatilityBps(points: SeriesPoint[], windowDays: number): number | undefined {
  const window = pointsWithinDays(points, windowDays);
  if (window.length < 2) return undefined;
  const diffs: number[] = [];
  for (let i = 1; i < window.length; i++) {
    diffs.push((window[i].rate - window[i - 1].rate) * 100);
  }
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((acc, d) => acc + (d - mean) ** 2, 0) / diffs.length;
  return Math.round(Math.sqrt(variance));
}

/**
 * Number of days since the most recent observation at or below `targetRate`.
 * Returns 0 if the latest point already meets the target, undefined if no observation does.
 */
export function daysSinceAtOrBelow(points: SeriesPoint[], targetRate: number): number | undefined {
  if (!points.length) return undefined;
  const lastMs = dateToMs(points[points.length - 1].date);
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].rate <= targetRate) {
      return Math.round((lastMs - dateToMs(points[i].date)) / 86_400_000);
    }
  }
  return undefined;
}

export type TrendDirection = 'up' | 'flat' | 'down';

/**
 * Linear-regression slope of rates over the last `windowDays`, expressed in bps/day,
 * paired with a categorical direction. `flat` covers slopes within ±0.05 bps/day.
 */
export function trendSlope(
  points: SeriesPoint[],
  windowDays: number,
): { bpsPerDay: number; direction: TrendDirection } | undefined {
  const window = pointsWithinDays(points, windowDays);
  if (window.length < 2) return undefined;
  const baseMs = dateToMs(window[0].date);
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of window) {
    const x = (dateToMs(p.date) - baseMs) / 86_400_000;
    const y = p.rate * 100;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const n = window.length;
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { bpsPerDay: 0, direction: 'flat' };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const rounded = Math.round(slope * 100) / 100;
  const direction: TrendDirection = Math.abs(rounded) < 0.05 ? 'flat' : rounded > 0 ? 'up' : 'down';
  return { bpsPerDay: rounded, direction };
}
