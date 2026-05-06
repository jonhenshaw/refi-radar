import { describe, expect, it } from 'vitest';
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
});
