import type {
  CalendarEvent,
  CalendarEventImportance,
  CalendarEventKind,
  NewsCategory,
  NewsItem,
  NewsSourceId,
  ObservationConfidence,
  RateObservation,
} from '@refi-radar/shared';
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

export interface NewsItemInput {
  sourceId: NewsSourceId;
  headline: string;
  summary?: string;
  url: string;
  publishedAt: string;
  fetchedAt: string;
  category: NewsCategory;
  raw?: unknown;
}

interface NewsRow {
  source_id: string;
  headline: string;
  summary: string | null;
  url: string;
  published_at: string;
  fetched_at: string;
  category: string;
  raw_json: string | null;
}

export interface CalendarEventInput {
  id: string;
  sourceId: string;
  name: string;
  scheduledFor: string;
  kind: CalendarEventKind;
  importance: CalendarEventImportance;
  raw?: unknown;
}

interface CalendarRow {
  id: string;
  source_id: string;
  name: string;
  scheduled_for: string;
  kind: string;
  importance: string;
  raw_json: string | null;
}

const SUMMARY_MAX_CHARS = 240;

function truncate(value: string | undefined, max: number): string | null {
  if (!value) return null;
  if (value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd() + '…';
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

export async function upsertNewsItems(db: D1Database, items: NewsItemInput[]): Promise<{ inserted: number }> {
  if (items.length === 0) return { inserted: 0 };
  let inserted = 0;
  for (const item of items) {
    const result = await db
      .prepare(
        `INSERT OR IGNORE INTO news_items (source_id, headline, summary, url, published_at, fetched_at, category, raw_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        item.sourceId,
        item.headline,
        truncate(item.summary, SUMMARY_MAX_CHARS),
        item.url,
        item.publishedAt,
        item.fetchedAt,
        item.category,
        item.raw === undefined ? null : JSON.stringify(item.raw),
      )
      .run();
    if (Number(result.meta?.changes ?? 0) > 0) inserted += 1;
  }
  return { inserted };
}

export interface RecentNewsQuery {
  source?: NewsSourceId;
  category?: NewsCategory;
  limit?: number;
  before?: string;
}

export async function getRecentNews(db: D1Database, query: RecentNewsQuery = {}): Promise<NewsItem[]> {
  const limit = Math.min(Math.max(query.limit ?? 8, 1), 100);
  const filters: string[] = [];
  const binds: Array<string | number> = [];
  if (query.source) {
    filters.push('source_id = ?');
    binds.push(query.source);
  }
  if (query.category) {
    filters.push('category = ?');
    binds.push(query.category);
  }
  if (query.before) {
    filters.push('published_at < ?');
    binds.push(query.before);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `SELECT source_id, headline, summary, url, published_at, fetched_at, category, raw_json
               FROM news_items
               ${where}
               ORDER BY published_at DESC
               LIMIT ?`;
  binds.push(limit);
  const { results } = await db.prepare(sql).bind(...binds).all<NewsRow>();
  return (results ?? []).map(rowToNews);
}

function rowToNews(row: NewsRow): NewsItem {
  return {
    sourceId: row.source_id as NewsSourceId,
    headline: row.headline,
    summary: row.summary ?? undefined,
    url: row.url,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    category: row.category as NewsCategory,
    raw: row.raw_json ? JSON.parse(row.raw_json) : undefined,
  };
}

export async function upsertCalendarEvents(db: D1Database, events: CalendarEventInput[]): Promise<{ inserted: number }> {
  if (events.length === 0) return { inserted: 0 };
  let inserted = 0;
  for (const event of events) {
    const result = await db
      .prepare(
        `INSERT INTO calendar_events (id, source_id, name, scheduled_for, kind, importance, raw_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          source_id = excluded.source_id,
          name = excluded.name,
          scheduled_for = excluded.scheduled_for,
          kind = excluded.kind,
          importance = excluded.importance,
          raw_json = excluded.raw_json`,
      )
      .bind(
        event.id,
        event.sourceId,
        event.name,
        event.scheduledFor,
        event.kind,
        event.importance,
        event.raw === undefined ? null : JSON.stringify(event.raw),
      )
      .run();
    if (Number(result.meta?.changes ?? 0) > 0) inserted += 1;
  }
  return { inserted };
}

export interface UpcomingCalendarQuery {
  from?: string;
  to?: string;
  importance?: CalendarEventImportance;
  limit?: number;
}

export async function getUpcomingCalendar(db: D1Database, query: UpcomingCalendarQuery = {}): Promise<CalendarEvent[]> {
  const limit = Math.min(Math.max(query.limit ?? 5, 1), 100);
  const from = query.from ?? new Date().toISOString();
  const filters: string[] = ['scheduled_for >= ?'];
  const binds: Array<string | number> = [from];
  if (query.to) {
    filters.push('scheduled_for <= ?');
    binds.push(query.to);
  }
  if (query.importance) {
    filters.push('importance = ?');
    binds.push(query.importance);
  }
  const where = `WHERE ${filters.join(' AND ')}`;
  const sql = `SELECT id, source_id, name, scheduled_for, kind, importance, raw_json
               FROM calendar_events
               ${where}
               ORDER BY scheduled_for ASC
               LIMIT ?`;
  binds.push(limit);
  const { results } = await db.prepare(sql).bind(...binds).all<CalendarRow>();
  return (results ?? []).map(rowToCalendarEvent);
}

function rowToCalendarEvent(row: CalendarRow): CalendarEvent {
  return {
    id: row.id,
    sourceId: row.source_id as CalendarEvent['sourceId'],
    name: row.name,
    scheduledFor: row.scheduled_for,
    kind: row.kind as CalendarEventKind,
    importance: row.importance as CalendarEventImportance,
    raw: row.raw_json ? JSON.parse(row.raw_json) : undefined,
  };
}
