import { describe, expect, it } from 'vitest';
import { app } from './index';
import { choosePrimaryObservation } from './services/latest';
import type { RateObservation } from '@refi-radar/shared';

describe('worker api foundation', () => {
  it('returns health status', async () => {
    const res = await app.fetch(new Request('http://localhost/api/health'), {});

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      service: 'refi-radar-worker',
    });
  });

  it('returns an empty latest snapshot when DB is not bound', async () => {
    const res = await app.fetch(new Request('http://localhost/api/latest'), {});

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sources: [], health: [] });
  });

  it('prefers mortgage sources over treasury proxy for the primary latest observation', () => {
    const now = new Date().toISOString();
    const observations: RateObservation[] = [
      { sourceId: 'fred_dgs10', observedAt: now, fetchedAt: now, rate: 4.2, confidence: 'proxy' },
      { sourceId: 'fred_mortgage30us', observedAt: now, fetchedAt: now, rate: 6.7, confidence: 'weekly_survey' },
    ];

    expect(choosePrimaryObservation(observations)?.sourceId).toBe('fred_mortgage30us');
  });
});
