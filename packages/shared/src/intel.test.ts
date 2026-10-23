import { describe, expect, it } from 'vitest';

import {
  buildAlignedSpreadSeries,
  buildRateIntel,
  mortgageTreasurySpreadBps,
  percentileRank,
  pointsWithinDays,
} from './intel';
import type { RateObservation } from './types';

function obs(sourceId: RateObservation['sourceId'], rate: number, date: string): RateObservation {
  return {
    sourceId,
    observedAt: date,
    fetchedAt: date,
    rate,
    confidence: sourceId === 'mnd_30y_fixed' ? 'market_estimate' : sourceId === 'fred_mortgage30us' ? 'weekly_survey' : 'proxy',
  };
}

describe('mortgageTreasurySpreadBps', () => {
  it('converts percent-point gap to rounded basis points', () => {
    expect(mortgageTreasurySpreadBps(6.72, 4.14)).toBe(258);
    expect(mortgageTreasurySpreadBps(6.5, 4.3)).toBe(220);
  });
});

describe('buildAlignedSpreadSeries', () => {
  it('aligns by date and subtracts treasury from mortgage', () => {
    const spread = buildAlignedSpreadSeries(
      [
        { date: '2026-01-01', rate: 6.5 },
        { date: '2026-01-02', rate: 6.4 },
      ],
      [
        { date: '2026-01-01', rate: 4.2 },
        { date: '2026-01-03', rate: 4.1 },
      ],
    );
    expect(spread).toEqual([{ date: '2026-01-01', rate: 2.3 }]);
  });
});

describe('percentileRank', () => {
  it('returns the share of values at or below the target', () => {
    expect(percentileRank([1, 2, 3, 4, 5], 3)).toBe(60);
    expect(percentileRank([1, 2, 3, 4, 5], 5)).toBe(100);
    expect(percentileRank([1, 2, 3, 4, 5], 0)).toBe(0);
  });
});

describe('pointsWithinDays', () => {
  it('filters to the requested trailing window', () => {
    const now = new Date('2026-05-08T12:00:00.000Z');
    const points = pointsWithinDays(
      [
        { date: '2025-05-01', rate: 1 },
        { date: '2026-04-01', rate: 2 },
        { date: '2026-05-07', rate: 3 },
      ],
      365,
      now,
    );
    expect(points.map((point) => point.date)).toEqual(['2026-04-01', '2026-05-07']);
  });
});

describe('buildRateIntel', () => {
  const now = new Date('2026-05-08T12:00:00.000Z');

  it('computes spread, percentile, and 52-week distance from aligned history', () => {
    const sources = [
      obs('mnd_30y_fixed', 6.5, '2026-05-08'),
      obs('fred_mortgage30us', 6.7, '2026-05-08'),
      obs('fred_dgs10', 4.3, '2026-05-08'),
    ];
    const mortgageHistory = [
      { date: '2026-04-08', rate: 6.8 },
      { date: '2026-04-28', rate: 6.6 },
      { date: '2026-05-08', rate: 6.5 },
    ];
    const treasuryHistory = [
      { date: '2026-04-08', rate: 4.2 },
      { date: '2026-04-28', rate: 4.25 },
      { date: '2026-05-08', rate: 4.3 },
    ];

    const intel = buildRateIntel({
      sources,
      health: sources.map((source) => ({ sourceId: source.sourceId, ok: true, stale: false })),
      mortgageHistory,
      treasuryHistory,
      now,
    });

    expect(intel.spreadBps.value).toBe(220);
    expect(intel.spreadPercentile1Y?.value).toBe(33);
    expect(intel.spreadVs52WeekHighBps?.value).toBe(-40);
    expect(intel.spreadVs52WeekLowBps?.value).toBe(0);
    expect(intel.mortgage30yPercentile1Y?.value).toBe(33);
    expect(intel.mnd30y.confidence).toBe('market_estimate');
    expect(intel.fred30y.confidence).toBe('weekly_survey');
    expect(intel.treasury10y.confidence).toBe('proxy');
  });

  it('marks missing sources without inventing values', () => {
    const intel = buildRateIntel({
      sources: [obs('fred_dgs10', 4.3, '2026-05-08')],
      health: [{ sourceId: 'fred_dgs10', ok: true, stale: false }],
      now,
    });

    expect(intel.mnd30y.value).toBeUndefined();
    expect(intel.mnd30y.unavailableReason).toMatch(/No observations/);
    expect(intel.spreadBps.value).toBeUndefined();
    expect(intel.spreadBps.unavailableReason).toMatch(/missing or stale/);
  });
});
