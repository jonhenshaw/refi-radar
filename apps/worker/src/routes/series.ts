import { Hono } from 'hono';
import { getSeries } from '../db/queries';
import type { Env } from '../env';

export const SUPPORTED_RANGES = ['1D', '5D', '1M', '3M', '1Y', '5Y', 'MAX'] as const;
export type SeriesRange = (typeof SUPPORTED_RANGES)[number];

const SUPPORTED_SOURCES = [
  'mnd_30y_fixed',
  'fred_mortgage30us',
  'fred_mortgage15us',
  'fred_dgs10',
  'fred_dgs2',
  'fred_dgs30',
  'fred_t10y2y',
  'fred_dff',
  'fred_sofr',
];

export function isValidRange(range: string | null | undefined): range is SeriesRange {
  return SUPPORTED_RANGES.includes(range as SeriesRange);
}

export function isValidSource(source: string | null | undefined): source is string {
  return typeof source === 'string' && SUPPORTED_SOURCES.includes(source);
}

export function rangeToSinceIso(range: SeriesRange, now = new Date()): string | undefined {
  if (range === 'MAX') return undefined;
  const since = new Date(now.getTime());
  switch (range) {
    case '1D':
      since.setUTCDate(since.getUTCDate() - 1);
      break;
    case '5D':
      since.setUTCDate(since.getUTCDate() - 5);
      break;
    case '1M':
      since.setUTCMonth(since.getUTCMonth() - 1);
      break;
    case '3M':
      since.setUTCMonth(since.getUTCMonth() - 3);
      break;
    case '1Y':
      since.setUTCFullYear(since.getUTCFullYear() - 1);
      break;
    case '5Y':
      since.setUTCFullYear(since.getUTCFullYear() - 5);
      break;
  }
  return since.toISOString().slice(0, 10);
}

export const seriesRoutes = new Hono<{ Bindings: Env }>();

seriesRoutes.get('/series', async (c) => {
  const source = c.req.query('source');
  const range = c.req.query('range') ?? '1Y';

  if (!source) return c.json({ error: 'missing_source' }, 400);
  if (!isValidSource(source)) return c.json({ error: 'invalid_source' }, 400);
  if (!isValidRange(range)) return c.json({ error: 'unsupported_range', supportedRanges: SUPPORTED_RANGES }, 400);
  if (!c.env.DB) return c.json({ sourceId: source, range, points: [] });

  const observations = await getSeries(c.env.DB, source, range);
  return c.json({
    sourceId: source,
    range,
    points: observations.map((point) => ({ time: point.observedAt, value: point.rate })),
  });
});

seriesRoutes.get('/series/compare', async (c) => {
  const sourcesParam = c.req.query('sources');
  const range = c.req.query('range') ?? '1Y';

  if (!sourcesParam) return c.json({ error: 'missing_sources' }, 400);
  if (!isValidRange(range)) return c.json({ error: 'unsupported_range', supportedRanges: SUPPORTED_RANGES }, 400);

  const sources = sourcesParam.split(',').map((source) => source.trim()).filter(Boolean);
  if (sources.length === 0) return c.json({ error: 'missing_sources' }, 400);
  const invalid = sources.find((source) => !isValidSource(source));
  if (invalid) return c.json({ error: 'invalid_source', source: invalid }, 400);

  const series: Record<string, Array<{ time: string; value: number }>> = {};
  for (const source of sources) {
    if (!c.env.DB) {
      series[source] = [];
    } else {
      const observations = await getSeries(c.env.DB, source, range);
      series[source] = observations.map((point) => ({ time: point.observedAt, value: point.rate }));
    }
  }

  return c.json({ range, series });
});
