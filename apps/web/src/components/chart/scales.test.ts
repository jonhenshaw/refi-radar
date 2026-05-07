import { describe, expect, it } from 'vitest';

import type { RateSeries } from '../../lib/api';
import { bisectIndex, buildScales, dateToMs, pathFor } from './scales';

const VIEWPORT = { width: 920, height: 340, padding: { top: 16, right: 18, bottom: 26, left: 52 } };

const seriesFixture: RateSeries[] = [
  {
    sourceId: 'mnd_30y_fixed',
    label: 'MND 30Y Fixed',
    color: '#1D9BF0',
    points: [
      { date: '2026-01-01', rate: 6.5 },
      { date: '2026-02-01', rate: 6.6 },
      { date: '2026-03-01', rate: 6.4 },
      { date: '2026-04-01', rate: 6.3 },
    ],
  },
  {
    sourceId: 'fred_mortgage30us',
    label: 'FRED Survey',
    color: '#2ED47A',
    points: [
      { date: '2026-01-01', rate: 6.7 },
      { date: '2026-04-01', rate: 6.55 },
    ],
  },
];

describe('dateToMs', () => {
  it('parses a YYYY-MM-DD string at noon UTC', () => {
    expect(dateToMs('2026-05-01')).toBe(Date.UTC(2026, 4, 1, 12));
  });

  it('handles full ISO strings', () => {
    expect(dateToMs('2026-05-01T00:00:00Z')).toBe(Date.UTC(2026, 4, 1));
  });
});

describe('bisectIndex', () => {
  const points = seriesFixture[0].points;

  it('returns 0 when target precedes the first point', () => {
    expect(bisectIndex(points, dateToMs('2025-12-01'))).toBe(0);
  });

  it('returns last index when target follows the last point', () => {
    expect(bisectIndex(points, dateToMs('2026-12-01'))).toBe(points.length - 1);
  });

  it('snaps to the nearest neighbour', () => {
    // exactly 2026-01-15 sits between Jan 1 (idx 0) and Feb 1 (idx 1); closer to Jan.
    expect(bisectIndex(points, dateToMs('2026-01-15'))).toBe(0);
    expect(bisectIndex(points, dateToMs('2026-01-22'))).toBe(1);
  });

  it('returns -1 for empty input', () => {
    expect(bisectIndex([], 0)).toBe(-1);
  });
});

describe('buildScales', () => {
  it('returns null when no points are provided', () => {
    expect(buildScales({ series: [{ ...seriesFixture[0], points: [] }], viewport: VIEWPORT })).toBeNull();
  });

  it('maps the first point to xRange[0] and the last to xRange[1]', () => {
    const scales = buildScales({ series: seriesFixture, viewport: VIEWPORT })!;
    const first = dateToMs(seriesFixture[0].points[0].date);
    const last = dateToMs(seriesFixture[0].points.at(-1)!.date);
    expect(scales.xToPx(first)).toBeCloseTo(scales.xRange[0]);
    expect(scales.xToPx(last)).toBeCloseTo(scales.xRange[1]);
  });

  it('places the highest rate near top and lowest near bottom', () => {
    const scales = buildScales({ series: seriesFixture, viewport: VIEWPORT })!;
    expect(scales.yToPx(scales.yDomain[1])).toBeCloseTo(scales.yRange[0]);
    expect(scales.yToPx(scales.yDomain[0])).toBeCloseTo(scales.yRange[1]);
    expect(scales.yToPx(6.7)).toBeLessThan(scales.yToPx(6.3));
  });

  it('respects an explicit zoomDomain', () => {
    const zoom: [number, number] = [dateToMs('2026-02-01'), dateToMs('2026-03-01')];
    const scales = buildScales({ series: seriesFixture, viewport: VIEWPORT, zoomDomain: zoom })!;
    expect(scales.xToPx(zoom[0])).toBeCloseTo(scales.xRange[0]);
    expect(scales.xToPx(zoom[1])).toBeCloseTo(scales.xRange[1]);
  });

  it('produces 4 y-ticks and at least 2 x-ticks', () => {
    const scales = buildScales({ series: seriesFixture, viewport: VIEWPORT })!;
    expect(scales.yTicks).toHaveLength(4);
    expect(scales.xTicks.length).toBeGreaterThanOrEqual(2);
  });

  it('pxToIndex round-trips through xToPx', () => {
    const scales = buildScales({ series: seriesFixture, viewport: VIEWPORT })!;
    const target = seriesFixture[0].points[2]; // 2026-03-01
    const px = scales.xToPx(dateToMs(target.date));
    expect(scales.pxToIndex(px, seriesFixture[0].points)).toBe(2);
  });
});

describe('pathFor', () => {
  it('returns an empty string for no points', () => {
    expect(pathFor([])).toBe('');
  });

  it('emits an M for the first coord and L for the rest', () => {
    expect(pathFor([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M 0.0 0.0 L 10.0 5.0');
  });
});
