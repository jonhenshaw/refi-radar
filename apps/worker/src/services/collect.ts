import { collectFredSources } from '../collectors/fred';
import { fetchMndThirtyYearFixed, mndSource } from '../collectors/mnd';
import { insertObservation, upsertSource } from '../db/queries';
import type { Env } from '../env';
import { buildLatestSnapshot } from './latest';

export interface CollectionResult {
  ok: boolean;
  results: Array<{ sourceId: string; ok: boolean; inserted: number; error?: string }>;
}

export async function collectAllSources(env: Env): Promise<CollectionResult> {
  const results: CollectionResult['results'] = [];

  if (!env.DB) {
    return { ok: false, results: [{ sourceId: 'all', ok: false, inserted: 0, error: 'DB binding missing' }] };
  }

  try {
    await upsertSource(env.DB, mndSource);
    const observation = await fetchMndThirtyYearFixed();
    const insert = await insertObservation(env.DB, observation);
    results.push({ sourceId: observation.sourceId, ok: true, inserted: insert.inserted ? 1 : 0 });
  } catch (error) {
    results.push({ sourceId: 'mnd_30y_fixed', ok: false, inserted: 0, error: error instanceof Error ? error.message : String(error) });
  }

  const fred = await collectFredSources(env);
  results.push(...fred.results);

  await refreshLatestCache(env);

  return { ok: results.every((result) => result.ok), results };
}

export async function refreshLatestCache(env: Env): Promise<void> {
  if (!env.DB || !env.REFI_RADAR_CACHE) return;
  const snapshot = await buildLatestSnapshot(env.DB);
  await env.REFI_RADAR_CACHE.put('latest-snapshot', JSON.stringify(snapshot), { expirationTtl: 90 });
}
