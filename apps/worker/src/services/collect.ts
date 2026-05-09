import { loadCuratedCalendar, curatedCalendarSource } from '../collectors/calendar';
import { collectFredSources } from '../collectors/fred';
import { fetchMndThirtyYearFixed, mndSource } from '../collectors/mnd';
import { cnbcBondsConfig, fetchCnbcBonds, parseCnbcBonds } from '../collectors/news/cnbcBonds';
import { fedPressConfig, fetchFedPress, parseFedPress } from '../collectors/news/fedPress';
import {
  fetchMarketwatchBonds,
  marketwatchBondsConfig,
  parseMarketwatchBonds,
} from '../collectors/news/marketwatchBonds';
import { fetchMndCommentary, mndCommentaryConfig, parseMndCommentary } from '../collectors/news/mndCommentary';
import {
  fetchTreasuryAuctions,
  parseTreasuryAuctions,
  treasuryAuctionsConfig,
} from '../collectors/news/treasuryAuctions';
import type { RssCollectorConfig } from '../collectors/news/util';
import {
  insertObservation,
  upsertCalendarEvents,
  upsertNewsItems,
  upsertSources,
  type NewsItemInput,
} from '../db/queries';
import type { Env } from '../env';
import { buildLatestSnapshot } from './latest';

export interface CollectionResult {
  ok: boolean;
  results: Array<{ sourceId: string; ok: boolean; inserted: number; error?: string }>;
}

interface NewsCollector {
  config: RssCollectorConfig;
  fetch: () => Promise<string>;
  parse: (xml: string, fetchedAt?: string) => NewsItemInput[];
}

const NEWS_COLLECTORS: NewsCollector[] = [
  { config: fedPressConfig, fetch: fetchFedPress, parse: parseFedPress },
  { config: marketwatchBondsConfig, fetch: fetchMarketwatchBonds, parse: parseMarketwatchBonds },
  { config: cnbcBondsConfig, fetch: fetchCnbcBonds, parse: parseCnbcBonds },
  { config: mndCommentaryConfig, fetch: fetchMndCommentary, parse: parseMndCommentary },
  { config: treasuryAuctionsConfig, fetch: fetchTreasuryAuctions, parse: parseTreasuryAuctions },
];

export async function collectAllSources(env: Env): Promise<CollectionResult> {
  const results: CollectionResult['results'] = [];

  if (!env.DB) {
    return { ok: false, results: [{ sourceId: 'all', ok: false, inserted: 0, error: 'DB binding missing' }] };
  }

  try {
    await upsertSources(env.DB, [
      mndSource,
      ...NEWS_COLLECTORS.map((collector) => collector.config.source),
      curatedCalendarSource,
    ]);
  } catch (error) {
    return { ok: false, results: [{ sourceId: 'sources', ok: false, inserted: 0, error: errorMessage(error) }] };
  }

  try {
    const observation = await fetchMndThirtyYearFixed();
    const insert = await insertObservation(env.DB, observation);
    results.push({ sourceId: observation.sourceId, ok: true, inserted: insert.inserted ? 1 : 0 });
  } catch (error) {
    results.push({ sourceId: 'mnd_30y_fixed', ok: false, inserted: 0, error: errorMessage(error) });
  }

  const fred = await collectFredSources(env);
  results.push(...fred.results);

  for (const collector of NEWS_COLLECTORS) {
    const sourceId = collector.config.source.id;
    try {
      const xml = await collector.fetch();
      const items = collector.parse(xml);
      const result = await upsertNewsItems(env.DB, items);
      results.push({ sourceId, ok: true, inserted: result.inserted });
    } catch (error) {
      results.push({ sourceId, ok: false, inserted: 0, error: errorMessage(error) });
    }
  }

  try {
    const events = loadCuratedCalendar();
    const result = await upsertCalendarEvents(env.DB, events);
    results.push({ sourceId: curatedCalendarSource.id, ok: true, inserted: result.inserted });
  } catch (error) {
    results.push({ sourceId: curatedCalendarSource.id, ok: false, inserted: 0, error: errorMessage(error) });
  }

  await refreshLatestCache(env);

  return { ok: results.every((result) => result.ok), results };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function refreshLatestCache(env: Env): Promise<void> {
  if (!env.DB || !env.REFI_RADAR_CACHE) return;
  const snapshot = await buildLatestSnapshot(env.DB);
  await env.REFI_RADAR_CACHE.put('latest-snapshot', JSON.stringify(snapshot), { expirationTtl: 90 });
}
