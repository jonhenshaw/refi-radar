import type { ObservationConfidence } from '@refi-radar/shared';
import type { ObservationInput } from '../db/queries';
import { insertObservation, upsertSource } from '../db/queries';
import type { Env } from '../env';

const FRED_BASE_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=';

const FRED_SOURCES = [
  {
    sourceId: 'fred_mortgage30us',
    seriesId: 'MORTGAGE30US',
    name: 'Freddie Mac PMMS 30Y',
    kind: 'weekly_survey',
    cadenceMinutes: 1440,
    confidence: 'weekly_survey' as const,
  },
  {
    sourceId: 'fred_mortgage15us',
    seriesId: 'MORTGAGE15US',
    name: 'Freddie Mac PMMS 15Y',
    kind: 'weekly_survey',
    cadenceMinutes: 1440,
    confidence: 'weekly_survey' as const,
  },
  {
    sourceId: 'fred_dgs10',
    seriesId: 'DGS10',
    name: 'FRED 10Y Treasury',
    kind: 'daily_proxy',
    cadenceMinutes: 1440,
    confidence: 'proxy' as const,
  },
  {
    sourceId: 'fred_dgs2',
    seriesId: 'DGS2',
    name: 'FRED 2Y Treasury',
    kind: 'daily_proxy',
    cadenceMinutes: 1440,
    confidence: 'proxy' as const,
  },
  {
    sourceId: 'fred_dgs30',
    seriesId: 'DGS30',
    name: 'FRED 30Y Treasury',
    kind: 'daily_proxy',
    cadenceMinutes: 1440,
    confidence: 'proxy' as const,
  },
  {
    sourceId: 'fred_t10y2y',
    seriesId: 'T10Y2Y',
    name: 'FRED 10Y-2Y Spread',
    kind: 'daily_proxy',
    cadenceMinutes: 1440,
    confidence: 'proxy' as const,
  },
  {
    sourceId: 'fred_dff',
    seriesId: 'DFF',
    name: 'FRED Effective Fed Funds',
    kind: 'daily_proxy',
    cadenceMinutes: 1440,
    confidence: 'proxy' as const,
  },
  {
    sourceId: 'fred_sofr',
    seriesId: 'SOFR',
    name: 'FRED SOFR',
    kind: 'daily_proxy',
    cadenceMinutes: 1440,
    confidence: 'proxy' as const,
  },
];

export function parseFredCsv(csv: string, sourceId: string, confidence: ObservationConfidence, maxObservations = 400): ObservationInput[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  const [, ...rows] = lines;
  const fetchedAt = new Date().toISOString();
  const recentRows = rows.slice(-maxObservations);

  return recentRows.flatMap((line) => {
    const [date, rawValue] = line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''));
    if (!date || !rawValue || rawValue === '.') return [];
    const rate = Number(rawValue);
    if (!Number.isFinite(rate)) return [];
    return [{ sourceId, observedAt: date, fetchedAt, rate, confidence, raw: { fred: line } }];
  });
}

export async function fetchFredSeries(seriesId: string, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController();
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error(`FRED ${seriesId} request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const request = (async () => {
    const response = await fetch(`${FRED_BASE_URL}${encodeURIComponent(seriesId)}`, {
      signal: controller.signal,
      headers: { 'user-agent': 'RefiRadar/0.1 (+https://refi-radar.pages.dev)' },
    });
    if (!response.ok) {
      throw new Error(`FRED ${seriesId} request failed: ${response.status}`);
    }
    return response.text();
  })();

  return Promise.race([request, timeout]);
}

export async function collectFredSources(env: Env): Promise<{ ok: boolean; results: Array<{ sourceId: string; ok: boolean; inserted: number; error?: string }> }> {
  const results: Array<{ sourceId: string; ok: boolean; inserted: number; error?: string }> = [];

  if (!env.DB) {
    return { ok: false, results: FRED_SOURCES.map((source) => ({ sourceId: source.sourceId, ok: false, inserted: 0, error: 'DB binding missing' })) };
  }

  for (const source of FRED_SOURCES) {
    try {
      await upsertSource(env.DB, {
        id: source.sourceId,
        name: source.name,
        kind: source.kind,
        url: `${FRED_BASE_URL}${source.seriesId}`,
        cadenceMinutes: source.cadenceMinutes,
      });
      const csv = await fetchFredSeries(source.seriesId);
      const observations = parseFredCsv(csv, source.sourceId, source.confidence);
      let inserted = 0;
      for (const observation of observations) {
        const result = await insertObservation(env.DB, observation);
        if (result.inserted) inserted += 1;
      }
      results.push({ sourceId: source.sourceId, ok: true, inserted });
    } catch (error) {
      results.push({ sourceId: source.sourceId, ok: false, inserted: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { ok: results.every((result) => result.ok), results };
}
