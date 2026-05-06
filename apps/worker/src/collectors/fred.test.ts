import { describe, expect, it, vi } from 'vitest';
import { collectFredSources, fetchFredSeries, parseFredCsv } from './fred';

describe('FRED collector', () => {
  it('parses CSV rows and skips missing values', () => {
    const csv = 'observation_date,MORTGAGE30US\n2026-04-16,6.62\n2026-04-23,.\n2026-04-30,6.3\n';

    expect(parseFredCsv(csv, 'fred_mortgage30us', 'weekly_survey')).toEqual([
      expect.objectContaining({ sourceId: 'fred_mortgage30us', observedAt: '2026-04-16', rate: 6.62, confidence: 'weekly_survey' }),
      expect.objectContaining({ sourceId: 'fred_mortgage30us', observedAt: '2026-04-30', rate: 6.3, confidence: 'weekly_survey' }),
    ]);
  });

  it('fetches FRED CSV by series id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('observation_date,DGS10\n2026-05-01,4.5\n'));

    await expect(fetchFredSeries('DGS10')).resolves.toContain('DGS10');
    expect(fetchMock).toHaveBeenCalledWith('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10');
    fetchMock.mockRestore();
  });

  it('collector keeps running when one source fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response('observation_date,DGS10\n2026-05-01,4.5\n'));
    const inserted: unknown[] = [];
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          run: vi.fn(async () => {
            if (sql.includes('rate_observations')) inserted.push(sql);
            return { success: true, meta: { changes: 1 } };
          }),
        })),
      })),
    };

    const result = await collectFredSources({ DB: db as unknown as D1Database });

    expect(result.ok).toBe(false);
    expect(result.results).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: 'fred_mortgage30us', ok: false }), expect.objectContaining({ sourceId: 'fred_dgs10', ok: true })]));
    expect(inserted.length).toBe(1);
    fetchMock.mockRestore();
  });
});
