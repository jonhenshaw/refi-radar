import { Hono } from 'hono';
import { collectFredSources } from './collectors/fred';
import { getLatestObservations } from './db/queries';
import type { Env } from './env';
import { refiRoutes } from './routes/refi';
import { seriesRoutes } from './routes/series';
import type { RateObservation, SourceId } from '@refi-radar/shared';

const PRIMARY_SOURCE_PRIORITY: SourceId[] = ['mnd_30y_fixed', 'fred_mortgage30us', 'fred_dgs10'];

export function choosePrimaryObservation(sources: RateObservation[]): RateObservation | undefined {
  return PRIMARY_SOURCE_PRIORITY.map((sourceId) => sources.find((source) => source.sourceId === sourceId)).find(Boolean) ?? sources[0];
}

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ ok: true, service: 'refi-radar-worker' }));

app.get('/api/latest', async (c) => {
  if (!c.env.DB) {
    return c.json({ sources: [], health: [] });
  }

  const sources = await getLatestObservations(c.env.DB);
  return c.json({ primary: choosePrimaryObservation(sources), sources, health: [] });
});

app.route('/api', seriesRoutes);
app.route('/api', refiRoutes);

app.post('/api/collector/run', async (c) => {
  const result = await collectFredSources(c.env);
  return c.json(result, result.ok ? 200 : 207);
});

export default app;
