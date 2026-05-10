import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { collectAllSources } from './services/collect';
import type { Env } from './env';
import { calendarRoutes } from './routes/calendar';
import { headlinesRoutes } from './routes/headlines';
import { notificationRoutes } from './routes/notifications';
import { refiRoutes } from './routes/refi';
import { seriesRoutes } from './routes/series';
import { getLatestSnapshot } from './services/latest';
import { dispatchDueRateAlerts } from './services/notifications';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return null;
    if (origin === 'http://localhost:5173') return origin;
    if (origin === 'capacitor://localhost') return origin;
    if (origin === 'ionic://localhost') return origin;
    if (origin === 'https://refi-radar.pages.dev') return origin;
    if (origin.endsWith('.refi-radar.pages.dev')) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['content-type', 'authorization'],
}));

app.get('/api/health', (c) => c.json({ ok: true, service: 'refi-radar-worker' }));

app.get('/api/latest', async (c) => c.json(await getLatestSnapshot(c.env)));

app.route('/api', seriesRoutes);
app.route('/api', refiRoutes);
app.route('/api', headlinesRoutes);
app.route('/api', calendarRoutes);
app.route('/api', notificationRoutes);

app.post('/api/collector/run', async (c) => {
  const result = await collectAllSources(c.env);
  const notifications = await dispatchDueRateAlerts(c.env);
  return c.json({ ...result, notifications }, result.ok ? 200 : 207);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: unknown, env: Env, _ctx: unknown) {
    await collectAllSources(env);
    await dispatchDueRateAlerts(env);
  },
};

export { app };
