import type { LatestSnapshot, RateObservation, RateSourceId, SourceHealth } from '@refi-radar/shared';
import { getLatestObservations, getRecentNews, getUpcomingCalendar } from '../db/queries';
import type { Env } from '../env';

const SNAPSHOT_NEWS_LIMIT = 8;
const SNAPSHOT_CALENDAR_LIMIT = 5;

const PRIMARY_SOURCE_PRIORITY: RateSourceId[] = ['mnd_30y_fixed', 'fred_mortgage30us', 'fred_dgs10'];

export function choosePrimaryObservation(sources: RateObservation[]): RateObservation | undefined {
  return PRIMARY_SOURCE_PRIORITY.map((sourceId) => sources.find((source) => source.sourceId === sourceId)).find(Boolean) ?? sources[0];
}

const STALE_AFTER_HOURS: Record<RateSourceId, number> = {
  mnd_30y_fixed: 48,
  fred_mortgage30us: 24 * 10,
  fred_dgs10: 24 * 5,
  fred_dgs2: 24 * 5,
  fred_dgs30: 24 * 5,
  fred_t10y2y: 24 * 5,
  fred_dff: 24 * 5,
  fred_sofr: 24 * 5,
  fred_mortgage15us: 24 * 10,
};

async function optionalCacheOperation<T>(operation: () => Promise<T>, timeoutMs = 250): Promise<T | undefined> {
  try {
    return await Promise.race([
      operation(),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), timeoutMs)),
    ]);
  } catch {
    return undefined;
  }
}

export async function getLatestSnapshot(env: Env): Promise<LatestSnapshot> {
  if (env.REFI_RADAR_CACHE) {
    const cached = await optionalCacheOperation<string | null>(() => env.REFI_RADAR_CACHE!.get('latest-snapshot'));
    if (cached) return JSON.parse(cached) as LatestSnapshot;
  }

  if (!env.DB) return { sources: [], health: [] };
  const snapshot = await buildLatestSnapshot(env.DB);
  if (env.REFI_RADAR_CACHE) {
    await optionalCacheOperation(() => env.REFI_RADAR_CACHE!.put('latest-snapshot', JSON.stringify(snapshot), { expirationTtl: 90 }));
  }
  return snapshot;
}

export async function buildLatestSnapshot(db: D1Database): Promise<LatestSnapshot> {
  const [sources, news, calendar] = await Promise.all([
    getLatestObservations(db),
    getRecentNews(db, { limit: SNAPSHOT_NEWS_LIMIT }),
    getUpcomingCalendar(db, { limit: SNAPSHOT_CALENDAR_LIMIT }),
  ]);
  return {
    primary: choosePrimaryObservation(sources),
    sources,
    health: buildSourceHealth(sources),
    news,
    calendar,
  };
}

export function buildSourceHealth(sources: RateObservation[], now = new Date()): SourceHealth[] {
  const bySource = new Map(sources.map((source) => [source.sourceId, source]));
  return (Object.keys(STALE_AFTER_HOURS) as RateSourceId[]).map((sourceId) => {
    const source = bySource.get(sourceId);
    if (!source) {
      return { sourceId, ok: false, stale: true, lastError: 'No observations collected yet' };
    }
    const observedAt = new Date(source.observedAt);
    const ageHours = (now.getTime() - observedAt.getTime()) / 3_600_000;
    const stale = Number.isNaN(ageHours) || ageHours > STALE_AFTER_HOURS[sourceId];
    return {
      sourceId,
      ok: !stale,
      stale,
      lastSuccessAt: source.fetchedAt,
      lastError: stale ? 'Latest observation is stale' : undefined,
    };
  });
}
