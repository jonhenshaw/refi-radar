import { describe, expect, it } from 'vitest';
import type { RateSeries } from './api';
import { compositeAsSeriesPoints, computeCompositeIndex } from './composite';

function series(sourceId: RateSeries['sourceId'], rates: Array<[string, number]>): RateSeries {
  return {
    sourceId,
    label: sourceId,
    color: '#000',
    points: rates.map(([date, rate]) => ({ date, rate })),
  };
}

describe('computeCompositeIndex', () => {
  it('produces 0 at each source low and 100 at each source high when sources are aligned', () => {
    const a = series('mnd_30y_fixed', [
      ['2026-05-01', 6.0],
      ['2026-05-02', 7.0],
    ]);
    const b = series('fred_mortgage30us', [
      ['2026-05-01', 4.0],
      ['2026-05-02', 5.0],
    ]);
    const composite = computeCompositeIndex([a, b]);
    expect(composite).toEqual([
      { date: '2026-05-01', value: 0 },
      { date: '2026-05-02', value: 100 },
    ]);
  });

  it('averages across the sources that have data on each date, skipping missing ones', () => {
    const a = series('mnd_30y_fixed', [
      ['2026-05-01', 6.0],
      ['2026-05-02', 6.5],
      ['2026-05-03', 7.0],
    ]);
    const b = series('fred_dgs10', [
      ['2026-05-01', 4.0],
      ['2026-05-03', 4.4],
    ]);
    const composite = computeCompositeIndex([a, b]);
    // a normalized: 0, 0.5, 1
    // b normalized: 0 (5/1), 1 (5/3)
    // mean per date: (0+0)/2=0, 0.5/1=0.5, (1+1)/2=1 — scaled to 0/50/100
    expect(composite).toEqual([
      { date: '2026-05-01', value: 0 },
      { date: '2026-05-02', value: 50 },
      { date: '2026-05-03', value: 100 },
    ]);
  });

  it('skips sources with degenerate (flat or single-point) ranges', () => {
    const flat = series('fred_dff', [
      ['2026-05-01', 4.83],
      ['2026-05-02', 4.83],
    ]);
    const moving = series('mnd_30y_fixed', [
      ['2026-05-01', 6.0],
      ['2026-05-02', 7.0],
    ]);
    const composite = computeCompositeIndex([flat, moving]);
    expect(composite).toEqual([
      { date: '2026-05-01', value: 0 },
      { date: '2026-05-02', value: 100 },
    ]);
  });

  it('returns empty when no source has at least two normalizable points', () => {
    const single = series('mnd_30y_fixed', [['2026-05-01', 6.0]]);
    expect(computeCompositeIndex([single])).toEqual([]);
    expect(computeCompositeIndex([])).toEqual([]);
  });

  it('compositeAsSeriesPoints adapts the shape for Sparkline consumption', () => {
    const points = compositeAsSeriesPoints([
      { date: '2026-05-01', value: 0 },
      { date: '2026-05-02', value: 100 },
    ]);
    expect(points).toEqual([
      { date: '2026-05-01', rate: 0 },
      { date: '2026-05-02', rate: 100 },
    ]);
  });
});
