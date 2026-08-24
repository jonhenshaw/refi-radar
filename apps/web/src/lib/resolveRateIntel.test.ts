import { describe, expect, it } from 'vitest';

import type { LatestSnapshot } from '@refi-radar/shared';

import type { RateSeries } from './api';
import { resolveRateIntel } from './resolveRateIntel';

const snapshot: LatestSnapshot = {
  primary: {
    sourceId: 'mnd_30y_fixed',
    observedAt: '2026-05-08',
    fetchedAt: '2026-05-08T12:00:00.000Z',
    rate: 6.77,
    confidence: 'market_estimate',
  },
  sources: [
    {
      sourceId: 'mnd_30y_fixed',
      observedAt: '2026-05-08',
      fetchedAt: '2026-05-08T12:00:00.000Z',
      rate: 6.77,
      confidence: 'market_estimate',
    },
    {
      sourceId: 'fred_mortgage30us',
      observedAt: '2026-05-01',
      fetchedAt: '2026-05-08T12:00:00.000Z',
      rate: 6.88,
      confidence: 'weekly_survey',
    },
    {
      sourceId: 'fred_dgs10',
      observedAt: '2026-05-08',
      fetchedAt: '2026-05-08T12:00:00.000Z',
      rate: 4.69,
      confidence: 'proxy',
    },
  ],
  health: [
    { sourceId: 'mnd_30y_fixed', ok: true, stale: false },
    { sourceId: 'fred_mortgage30us', ok: true, stale: false },
    { sourceId: 'fred_dgs10', ok: true, stale: false },
  ],
};

const series: RateSeries[] = [
  {
    sourceId: 'mnd_30y_fixed',
    label: 'MND',
    color: '#4D9FFF',
    points: [
      { date: '2026-04-08', rate: 6.9 },
      { date: '2026-05-08', rate: 6.77 },
    ],
  },
  {
    sourceId: 'fred_dgs10',
    label: '10Y',
    color: '#B295F5',
    points: [
      { date: '2026-04-08', rate: 4.5 },
      { date: '2026-05-08', rate: 4.69 },
    ],
  },
];

describe('resolveRateIntel', () => {
  it('uses server intel when present', () => {
    const serverIntel = {
      mnd30y: { label: '30Y market estimate', unit: 'percent' as const, derivation: 'direct' as const, value: 6.77 },
      fred30y: { label: 'Official weekly 30Y', unit: 'percent' as const, derivation: 'direct' as const, value: 6.88 },
      treasury10y: { label: '10Y Treasury', unit: 'percent' as const, derivation: 'direct' as const, value: 4.69 },
      spreadBps: { label: 'Mortgage − 10Y spread', unit: 'bps' as const, derivation: 'derived' as const, value: 208 },
      computedAt: '2026-05-08T12:00:00.000Z',
    };

    const resolved = resolveRateIntel({ ...snapshot, intel: serverIntel }, series);
    expect(resolved.derivedOnClient).toBe(false);
    expect(resolved.intel).toBe(serverIntel);
  });

  it('derives intel from snapshot sources when api intel is null', () => {
    const resolved = resolveRateIntel({ ...snapshot, intel: null as unknown as undefined }, series);
    expect(resolved.derivedOnClient).toBe(true);
    expect(resolved.intel?.spreadBps.value).toBe(208);
    expect(resolved.intel?.mnd30y.value).toBe(6.77);
    expect(resolved.intel?.mnd30y.confidence).toBe('market_estimate');
  });

  it('still computes spot spread without history series', () => {
    const resolved = resolveRateIntel({ ...snapshot, intel: null as unknown as undefined }, []);
    expect(resolved.derivedOnClient).toBe(true);
    expect(resolved.intel?.spreadBps.value).toBe(208);
    expect(resolved.intel?.spreadPercentile1Y?.unavailableReason).toMatch(/at least two aligned spread days/i);
  });
});
