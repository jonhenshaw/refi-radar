import { describe, expect, it, vi } from 'vitest';
import app from '../index';
import { isValidRange, rangeToSinceIso } from './series';

describe('series routes', () => {
  it('validates supported ranges', () => {
    expect(isValidRange('1D')).toBe(true);
    expect(isValidRange('MAX')).toBe(true);
    expect(isValidRange('2Y')).toBe(false);
    expect(rangeToSinceIso('MAX')).toBeUndefined();
  });

  it('rejects unsupported range', async () => {
    const res = await app.fetch(new Request('http://localhost/api/series?source=fred_mortgage30us&range=2Y'), {});

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'unsupported_range' });
  });

  it('rejects missing source', async () => {
    const res = await app.fetch(new Request('http://localhost/api/series?range=1Y'), {});

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'missing_source' });
  });

  it('returns a single source series from DB', async () => {
    const db = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(async () => ({ results: [{ observed_at: '2026-04-30', rate: 6.3 }] })),
        })),
      })),
    };

    const res = await app.fetch(new Request('http://localhost/api/series?source=fred_mortgage30us&range=1Y'), { DB: db });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      sourceId: 'fred_mortgage30us',
      range: '1Y',
      points: [{ time: '2026-04-30', value: 6.3 }],
    });
  });

  it('returns compare data keyed by source', async () => {
    const db = {
      prepare: vi.fn(() => ({
        bind: vi.fn((sourceId: string) => ({
          all: vi.fn(async () => ({ results: [{ observed_at: '2026-04-30', rate: sourceId === 'fred_dgs10' ? 4.5 : 6.3 }] })),
        })),
      })),
    };

    const res = await app.fetch(new Request('http://localhost/api/series/compare?sources=fred_mortgage30us,fred_dgs10&range=1Y'), { DB: db });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      range: '1Y',
      series: {
        fred_mortgage30us: [{ time: '2026-04-30', value: 6.3 }],
        fred_dgs10: [{ time: '2026-04-30', value: 4.5 }],
      },
    });
  });
});
