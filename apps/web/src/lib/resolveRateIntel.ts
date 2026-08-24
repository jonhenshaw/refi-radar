import { buildRateIntel, type LatestSnapshot, type RateIntel } from '@refi-radar/shared';

import type { RateSeries } from './api';

export interface ResolvedRateIntel {
  intel: RateIntel | undefined;
  derivedOnClient: boolean;
}

/**
 * Prefer server-computed intel from /api/latest. When the Worker has not been
 * deployed yet (or KV still holds a pre-intel snapshot), derive the same fields
 * client-side from labeled sources plus compare-series history — never invent rates.
 */
export function resolveRateIntel(
  snapshot: LatestSnapshot | null | undefined,
  series: RateSeries[],
): ResolvedRateIntel {
  if (!snapshot?.sources.length) {
    return { intel: undefined, derivedOnClient: false };
  }

  // Production Worker may return intel: null until this branch is deployed.
  if (snapshot.intel != null) {
    return { intel: snapshot.intel, derivedOnClient: false };
  }

  const mndSeries = series.find((item) => item.sourceId === 'mnd_30y_fixed');
  const treasurySeries = series.find((item) => item.sourceId === 'fred_dgs10');
  const fred30Series = series.find((item) => item.sourceId === 'fred_mortgage30us');

  return {
    intel: buildRateIntel({
      sources: snapshot.sources,
      health: snapshot.health,
      mortgageHistory: mndSeries?.points ?? [],
      treasuryHistory: treasurySeries?.points ?? [],
      fred30History: fred30Series?.points ?? [],
    }),
    derivedOnClient: true,
  };
}
