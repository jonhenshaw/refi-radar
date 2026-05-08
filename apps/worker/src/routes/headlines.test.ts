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

describe('headlines route', () => {
  it('returns empty items when DB is missing', async () => {
    const res = await app.fetch(new Request('http://localhost/api/headlines'), {});
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ items: [] });
  });

  it('rejects an unknown source', async () => {
    const res = await app.fetch(new Request('http://localhost/api/headlines?source=bogus'), {});
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_source' });
  });

  it('rejects an unknown category', async () => {
    const res = await app.fetch(new Request('http://localhost/api/headlines?category=spam'), {});
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_category' });
  });

  it('rejects a non-numeric limit', async () => {
    const res = await app.fetch(new Request('http://localhost/api/headlines?limit=abc'), {});
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_limit' });
  });

  it('returns mapped items from DB', async () => {
    const db = makeDb([
      {
        source_id: 'fed_press',
        headline: 'Fed holds rates',
        summary: null,
        url: 'https://example.com/a',
        published_at: '2026-05-06T18:00:00Z',
        fetched_at: '2026-05-06T18:00:30Z',
        category: 'fed',
        raw_json: null,
      },
    ]);
    const res = await app.fetch(new Request('http://localhost/api/headlines?source=fed_press&category=fed&limit=10'), { DB: db });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: Array<{ sourceId: string; category: string }> };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ sourceId: 'fed_press', category: 'fed' });
  });
});
