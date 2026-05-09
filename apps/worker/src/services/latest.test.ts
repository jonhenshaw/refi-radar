import { describe, expect, it } from 'vitest';
import type { RateObservation } from '@refi-radar/shared';
import { buildLatestSnapshot, buildSourceHealth } from './latest';

function makeDb(handlers: {
  rateObservations?: () => unknown[];
  newsItems?: () => unknown[] | Promise<unknown[]>;
  calendarEvents?: () => unknown[] | Promise<unknown[]>;
}): D1Database {
  const prepare = (sql: string) => ({
    bind(..._args: unknown[]) {
      return this;
    },
    async all<T>() {
      const trimmed = sql.replace(/\s+/g, ' ');
      if (trimmed.includes('FROM rate_observations')) {
        const rows = handlers.rateObservations?.() ?? [];
        return { results: rows as T[] };
      }
      if (trimmed.includes('FROM news_items')) {
        const rows = await (handlers.newsItems?.() ?? []);
        return { results: rows as T[] };
      }
      if (trimmed.includes('FROM calendar_events')) {
        const rows = await (handlers.calendarEvents?.() ?? []);
        return { results: rows as T[] };
      }
      return { results: [] as T[] };
    },
    async run() {
      return { meta: { changes: 0 } };
    },
  });
  return { prepare } as unknown as D1Database;
}

describe('latest snapshot service', () => {
  it('marks missing sources as stale and present fresh sources healthy', () => {
    const now = new Date('2026-05-06T18:00:00.000Z');
    const observations: RateObservation[] = [
      {
        sourceId: 'mnd_30y_fixed',
        observedAt: '2026-05-06T17:00:00.000Z',
        fetchedAt: '2026-05-06T17:01:00.000Z',
        rate: 6.54,
        confidence: 'market_estimate',
      },
    ];

    expect(buildSourceHealth(observations, now)).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: 'mnd_30y_fixed', ok: true, stale: false }),
      expect.objectContaining({ sourceId: 'fred_mortgage30us', ok: false, stale: true }),
    ]));
  });

  it('still returns rate sources when news/calendar queries fail', async () => {
    const db = makeDb({
      rateObservations: () => [
        {
          source_id: 'mnd_30y_fixed',
          observed_at: '2026-05-08T12:00:00.000Z',
          fetched_at: '2026-05-08T12:00:00.000Z',
          rate: 6.5,
          change_bps: null,
          confidence: 'market_estimate',
          raw_json: null,
        },
      ],
      newsItems: () => {
        throw new Error('no such table: news_items');
      },
      calendarEvents: () => {
        throw new Error('no such table: calendar_events');
      },
    });

    const snapshot = await buildLatestSnapshot(db);
    expect(snapshot.sources).toHaveLength(1);
    expect(snapshot.primary?.sourceId).toBe('mnd_30y_fixed');
    expect(snapshot.news).toEqual([]);
    expect(snapshot.calendar).toEqual([]);
  });
});
