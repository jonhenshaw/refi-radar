import { describe, expect, it, vi } from 'vitest';
import { app } from '../index';

function makeDb(rows: unknown[] = []) {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        all: vi.fn(async () => ({ results: rows })),
      })),
    })),
  };
}

describe('calendar route', () => {
  it('returns empty events when DB is missing', async () => {
    const res = await app.fetch(new Request('http://localhost/api/calendar'), {});
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ events: [] });
  });

  it('rejects an unknown importance', async () => {
    const res = await app.fetch(new Request('http://localhost/api/calendar?importance=xtra'), {});
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_importance' });
  });

  it('rejects malformed dates', async () => {
    const res = await app.fetch(new Request('http://localhost/api/calendar?from=not-a-date'), {});
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_date_range' });
  });

  it('returns events from DB', async () => {
    const db = makeDb([
      {
        id: 'cpi_20260512',
        source_id: 'curated_calendar',
        name: 'CPI release',
        scheduled_for: '2026-05-12T12:30:00Z',
        kind: 'cpi',
        importance: 'high',
        raw_json: null,
      },
    ]);
    const res = await app.fetch(new Request('http://localhost/api/calendar?importance=high'), { DB: db });
    expect(res.status).toBe(200);
    const body = await res.json() as { events: Array<{ id: string; kind: string; importance: string }> };
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ id: 'cpi_20260512', kind: 'cpi', importance: 'high' });
  });
});
