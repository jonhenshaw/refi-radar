import { describe, expect, it } from 'vitest';
import { insertObservation, getLatestObservations, getSeries, upsertSource } from './queries';

class MockD1 {
  sources = new Map<string, unknown>();
  observations: Array<Record<string, unknown>> = [];

  prepare(sql: string) {
    return {
      bind: (...params: unknown[]) => ({
        run: async () => {
          if (sql.includes('INSERT INTO sources')) {
            this.sources.set(String(params[0]), { id: params[0], name: params[1], kind: params[2], url: params[3], cadence_minutes: params[4], enabled: params[5] });
            return { success: true, meta: { changes: 1 } };
          }
          if (sql.includes('INSERT OR IGNORE INTO rate_observations')) {
            const duplicate = this.observations.some((row) => row.source_id === params[0] && row.observed_at === params[1] && row.rate === params[3]);
            if (!duplicate) {
              this.observations.push({ id: this.observations.length + 1, source_id: params[0], observed_at: params[1], fetched_at: params[2], rate: params[3], change_bps: params[4], confidence: params[5], raw_json: params[6] });
            }
            return { success: true, meta: { changes: duplicate ? 0 : 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        },
        all: async () => {
          if (sql.includes('ROW_NUMBER() OVER')) {
            const latestBySource = [...this.observations].sort((a, b) => String(b.observed_at).localeCompare(String(a.observed_at))).filter((row, index, rows) => rows.findIndex((candidate) => candidate.source_id === row.source_id) === index);
            return { results: latestBySource };
          }
          if (sql.includes('FROM rate_observations') && sql.includes('source_id = ?')) {
            const [sourceId, since] = params;
            return { results: this.observations.filter((row) => row.source_id === sourceId && (!since || String(row.observed_at) >= String(since))).sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at))) };
          }
          return { results: [] };
        },
      }),
    };
  }
}

describe('D1 query helpers', () => {
  it('upserts sources, dedupes observations, returns latest and ranged series', async () => {
    const db = new MockD1() as unknown as D1Database;

    await upsertSource(db, { id: 'fred_mortgage30us', name: 'Freddie Mac PMMS 30Y', kind: 'weekly_survey', url: 'https://example.com', cadenceMinutes: 1440 });
    const first = await insertObservation(db, { sourceId: 'fred_mortgage30us', observedAt: '2026-04-30', fetchedAt: '2026-05-01T00:00:00.000Z', rate: 6.3, confidence: 'weekly_survey' });
    const duplicate = await insertObservation(db, { sourceId: 'fred_mortgage30us', observedAt: '2026-04-30', fetchedAt: '2026-05-01T00:00:00.000Z', rate: 6.3, confidence: 'weekly_survey' });

    expect(first.inserted).toBe(true);
    expect(duplicate.inserted).toBe(false);
    await expect(getLatestObservations(db)).resolves.toHaveLength(1);
    await expect(getSeries(db, 'fred_mortgage30us', 'MAX')).resolves.toEqual([
      expect.objectContaining({ sourceId: 'fred_mortgage30us', observedAt: '2026-04-30', rate: 6.3 }),
    ]);
  });
});
