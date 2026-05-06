import type { ObservationConfidence, RateObservation } from '@refi-radar/shared';
import { rangeToSinceIso, type SeriesRange } from '../routes/series';

export type ObservationInput = Omit<RateObservation, 'sourceId'> & { sourceId: string };

export interface SourceInput {
  id: string;
  name: string;
  kind: string;
  url?: string;
  cadenceMinutes?: number;
  enabled?: boolean;
}

interface ObservationRow {
  source_id: string;
  observed_at: string;
  fetched_at: string;
  rate: number;
  change_bps?: number | null;
  confidence: ObservationConfidence;
  raw_json?: string | null;
}

export async function upsertSource(db: D1Database, source: SourceInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sources (id, name, kind, url, cadence_minutes, enabled)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        url = excluded.url,
        cadence_minutes = excluded.cadence_minutes,
        enabled = excluded.enabled`,
    )
    .bind(source.id, source.name, source.kind, source.url ?? null, source.cadenceMinutes ?? null, source.enabled === false ? 0 : 1)
    .run();
}

export async function insertObservation(db: D1Database, observation: ObservationInput): Promise<{ inserted: boolean }> {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO rate_observations (source_id, observed_at, fetched_at, rate, change_bps, confidence, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      observation.sourceId,
      observation.observedAt,
      observation.fetchedAt,
      observation.rate,
      observation.changeBps ?? null,
      observation.confidence,
      observation.raw === undefined ? null : JSON.stringify(observation.raw),
    )
    .run();

  return { inserted: Number(result.meta?.changes ?? 0) > 0 };
}

export async function getLatestObservations(db: D1Database): Promise<RateObservation[]> {
  const { results } = await db
    .prepare(
      `SELECT source_id, observed_at, fetched_at, rate, change_bps, confidence, raw_json
       FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY observed_at DESC, fetched_at DESC, id DESC) AS rn
        FROM rate_observations
       )
       WHERE rn = 1
       ORDER BY source_id`,
    )
    .bind()
    .all<ObservationRow>();

  return (results ?? []).map(rowToObservation);
}

export async function getSeries(db: D1Database, sourceId: string, range: SeriesRange): Promise<RateObservation[]> {
  const since = rangeToSinceIso(range);
  const sql = since
    ? `SELECT source_id, observed_at, fetched_at, rate, change_bps, confidence, raw_json
       FROM rate_observations
       WHERE source_id = ? AND observed_at >= ?
       ORDER BY observed_at ASC`
    : `SELECT source_id, observed_at, fetched_at, rate, change_bps, confidence, raw_json
       FROM rate_observations
       WHERE source_id = ?
       ORDER BY observed_at ASC`;
  const statement = db.prepare(sql);
  const { results } = since ? await statement.bind(sourceId, since).all<ObservationRow>() : await statement.bind(sourceId).all<ObservationRow>();
  return (results ?? []).map(rowToObservation);
}

function rowToObservation(row: ObservationRow): RateObservation {
  return {
    sourceId: row.source_id as RateObservation['sourceId'],
    observedAt: row.observed_at,
    fetchedAt: row.fetched_at,
    rate: row.rate,
    changeBps: row.change_bps ?? undefined,
    confidence: row.confidence,
    raw: row.raw_json ? JSON.parse(row.raw_json) : undefined,
  };
}
