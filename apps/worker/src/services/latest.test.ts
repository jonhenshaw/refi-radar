import { describe, expect, it } from 'vitest';
import { buildRateIntel } from '@refi-radar/shared';
import type { RateObservation } from '@refi-radar/shared';
import { buildSourceHealth } from './latest';

describe('latest snapshot service', () => {
  it('marks missing sources as stale and present fresh sources healthy', () => {
    const now = new Date('2026-05-06T18:00:00.000Z');
    const observations: RateObservation[] = [
      {
        sourceId: 'mnd_30y_fixed',
        observedAt: '2026-05-06T17:00:00.000Z',
        fetchedAt: '2026-05-06T17:01:00.000Z',
        rate: 6.54,
        confidence: 'market_estimate',
      },
    ];

    expect(buildSourceHealth(observations, now)).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: 'mnd_30y_fixed', ok: true, stale: false }),
      expect.objectContaining({ sourceId: 'fred_mortgage30us', ok: false, stale: true }),
    ]));
  });

  it('builds intel with spread metadata when mortgage and treasury observations exist', () => {
    const sources: RateObservation[] = [
      {
        sourceId: 'mnd_30y_fixed',
        observedAt: '2026-05-06',
        fetchedAt: '2026-05-06T18:00:00.000Z',
        rate: 6.54,
        confidence: 'market_estimate',
      },
      {
        sourceId: 'fred_mortgage30us',
        observedAt: '2026-05-01',
        fetchedAt: '2026-05-06T18:00:00.000Z',
        rate: 6.72,
        confidence: 'weekly_survey',
      },
      {
        sourceId: 'fred_dgs10',
        observedAt: '2026-05-06',
        fetchedAt: '2026-05-06T18:00:00.000Z',
        rate: 4.3,
        confidence: 'proxy',
      },
    ];
    const health = buildSourceHealth(sources, new Date('2026-05-06T18:00:00.000Z'));
    const intel = buildRateIntel({
      sources,
      health,
      mortgageHistory: [{ date: '2026-04-06', rate: 6.8 }, { date: '2026-05-06', rate: 6.54 }],
      treasuryHistory: [{ date: '2026-04-06', rate: 4.2 }, { date: '2026-05-06', rate: 4.3 }],
    });

    expect(intel.spreadBps.value).toBe(224);
    expect(intel.spreadBps.sourceIds).toEqual(['mnd_30y_fixed', 'fred_dgs10']);
    expect(intel.mnd30y.confidence).toBe('market_estimate');
    expect(intel.fred30y.confidence).toBe('weekly_survey');
  });
});
