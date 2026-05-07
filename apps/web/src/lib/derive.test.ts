import { describe, expect, it } from 'vitest';

import type { SeriesPoint } from './api';
import { daysSinceAtOrBelow, trendSlope, volatilityBps } from './derive';

function dailySeries(rates: number[], startDate = '2026-04-01'): SeriesPoint[] {
  const startMs = Date.UTC(
    Number(startDate.slice(0, 4)),
    Number(startDate.slice(5, 7)) - 1,
    Number(startDate.slice(8, 10)),
  );
  return rates.map((rate, i) => {
    const d = new Date(startMs + i * 86_400_000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, rate };
  });
}

describe('volatilityBps', () => {
  it('returns undefined for empty input', () => {
    expect(volatilityBps([], 30)).toBeUndefined();
  });

  it('returns undefined when only one point falls in the window', () => {
    expect(volatilityBps(dailySeries([6.5]), 30)).toBeUndefined();
  });

  it('is 0 for a flat series', () => {
    expect(volatilityBps(dailySeries([6.5, 6.5, 6.5, 6.5]), 30)).toBe(0);
  });

  it('reports stdev of day-over-day changes in bps', () => {
    // diffs in bps: +10, +10, +10 → stdev 0
    expect(volatilityBps(dailySeries([6.0, 6.1, 6.2, 6.3]), 30)).toBe(0);
    // diffs in bps: +10, -10, +10 → mean 3.33, variance ((6.67)^2 + (-13.33)^2 + (6.67)^2)/3 ≈ 88.89, stdev ≈ 9
    expect(volatilityBps(dailySeries([6.0, 6.1, 6.0, 6.1]), 30)).toBe(9);
  });

  it('respects the window cutoff', () => {
    const long = dailySeries([6.0, 6.0, 6.0, 6.5, 6.5], '2026-04-01');
    // Only the last 2 days (5th window): one diff of 0 → stdev 0
    expect(volatilityBps(long, 1)).toBe(0);
  });
});

describe('daysSinceAtOrBelow', () => {
  it('returns undefined for empty input', () => {
    expect(daysSinceAtOrBelow([], 6.0)).toBeUndefined();
  });

  it('returns 0 when the latest point already meets the target', () => {
    expect(daysSinceAtOrBelow(dailySeries([7.0, 6.5, 6.0]), 6.0)).toBe(0);
    expect(daysSinceAtOrBelow(dailySeries([7.0, 6.5, 5.9]), 6.0)).toBe(0);
  });

  it('counts days back to the most recent qualifying point', () => {
    // Days: Apr 1, 2, 3, 4, 5; rates: 5.9, 6.5, 6.6, 6.7, 6.8
    // Latest qualifying point is Apr 1 (index 0); diff is 4 days
    expect(daysSinceAtOrBelow(dailySeries([5.9, 6.5, 6.6, 6.7, 6.8]), 6.0)).toBe(4);
  });

  it('returns undefined when no point ever qualifies', () => {
    expect(daysSinceAtOrBelow(dailySeries([6.5, 6.6, 6.7]), 6.0)).toBeUndefined();
  });
});

describe('trendSlope', () => {
  it('returns undefined for fewer than two points in the window', () => {
    expect(trendSlope([], 30)).toBeUndefined();
    expect(trendSlope(dailySeries([6.5]), 30)).toBeUndefined();
  });

  it('reports flat for a constant series', () => {
    const result = trendSlope(dailySeries([6.5, 6.5, 6.5, 6.5]), 30);
    expect(result).toEqual({ bpsPerDay: 0, direction: 'flat' });
  });

  it('reports up for monotonically increasing rates', () => {
    // +10 bps/day for 4 days → slope ≈ 10
    const result = trendSlope(dailySeries([6.0, 6.1, 6.2, 6.3]), 30);
    expect(result?.direction).toBe('up');
    expect(result?.bpsPerDay).toBeCloseTo(10, 5);
  });

  it('reports down for monotonically decreasing rates', () => {
    const result = trendSlope(dailySeries([6.5, 6.4, 6.3, 6.2]), 30);
    expect(result?.direction).toBe('down');
    expect(result?.bpsPerDay).toBeCloseTo(-10, 5);
  });

  it('classifies a tiny slope as flat', () => {
    // 0.5 bps total over 4 days → ~0.125 bps/day, below the 0.05 threshold? No, 0.125 > 0.05
    // Use a smaller change: 0.1 bps over 5 days → 0.02 bps/day → flat
    const points = dailySeries([6.5, 6.5001, 6.5002, 6.5003, 6.5004]);
    const result = trendSlope(points, 30);
    expect(result?.direction).toBe('flat');
  });
});
