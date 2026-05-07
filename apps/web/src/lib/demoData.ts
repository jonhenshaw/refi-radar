import type { LatestSnapshot, RateObservation, SourceHealth as SourceHealthType } from '@refi-radar/shared';

import type { RangeKey, RateSeries } from './api';
import { SOURCE_COLORS, SOURCE_LABELS } from './sourceTheme';

const now = new Date().toISOString();

const demoSources: RateObservation[] = [
  { sourceId: 'mnd_30y_fixed', observedAt: now, fetchedAt: now, rate: 6.72, changeBps: -7, confidence: 'market_estimate' },
  { sourceId: 'fred_mortgage30us', observedAt: now, fetchedAt: now, rate: 6.88, changeBps: 2, confidence: 'weekly_survey' },
  { sourceId: 'fred_dgs10', observedAt: now, fetchedAt: now, rate: 4.14, changeBps: -3, confidence: 'proxy' },
];

const demoHealth: SourceHealthType[] = demoSources.map((source) => ({
  sourceId: source.sourceId,
  ok: true,
  stale: false,
  lastSuccessAt: source.fetchedAt,
}));

export const demoLatest: LatestSnapshot = {
  primary: demoSources[0],
  sources: demoSources,
  health: demoHealth,
};

const dayMs = 24 * 60 * 60 * 1000;

const demoShape: Record<RangeKey, { count: number; strideMs: number }> = {
  '1D': { count: 2, strideMs: dayMs },
  '5D': { count: 6, strideMs: dayMs },
  '1M': { count: 31, strideMs: dayMs },
  '3M': { count: 92, strideMs: dayMs },
  '1Y': { count: 365, strideMs: dayMs },
  '5Y': { count: 261, strideMs: 7 * dayMs },
  MAX: { count: 521, strideMs: 7 * dayMs },
};

export function makeDemoSeries(range: RangeKey): RateSeries[] {
  const { count, strideMs } = demoShape[range];
  const configs = [
    { sourceId: 'mnd_30y_fixed' as const, base: 6.72, wave: 0.08, drift: -0.0008 },
    { sourceId: 'fred_mortgage30us' as const, base: 6.88, wave: 0.06, drift: -0.0006 },
    { sourceId: 'fred_dgs10' as const, base: 4.14, wave: 0.05, drift: -0.0004 },
  ];

  return configs.map((config) => ({
    sourceId: config.sourceId,
    label: SOURCE_LABELS[config.sourceId],
    color: SOURCE_COLORS[config.sourceId],
    points: Array.from({ length: count }, (_, index) => {
      const fromEnd = count - index - 1;
      const driftAmount = fromEnd * config.drift * (strideMs / dayMs);
      const rate =
        config.base +
        driftAmount +
        Math.sin(index / 6) * config.wave +
        Math.sin(index / 23) * config.wave * 0.4;
      const date = new Date(Date.now() - fromEnd * strideMs).toISOString().slice(0, 10);
      return { date, rate: Number(rate.toFixed(3)) };
    }),
  }));
}
