import { Hono } from 'hono';
import type { CalendarEventImportance } from '@refi-radar/shared';
import { getUpcomingCalendar } from '../db/queries';
import type { Env } from '../env';

const SUPPORTED_IMPORTANCE: CalendarEventImportance[] = ['high', 'medium', 'low'];

function isImportance(value: string | null | undefined): value is CalendarEventImportance {
  return typeof value === 'string' && (SUPPORTED_IMPORTANCE as string[]).includes(value);
}

const DEFAULT_WINDOW_DAYS = 30;

export const calendarRoutes = new Hono<{ Bindings: Env }>();

calendarRoutes.get('/calendar', async (c) => {
  const fromParam = c.req.query('from');
  const toParam = c.req.query('to');
  const importanceParam = c.req.query('importance');
  const limitParam = c.req.query('limit');

  if (importanceParam && !isImportance(importanceParam)) {
    return c.json({ error: 'invalid_importance', supportedImportance: SUPPORTED_IMPORTANCE }, 400);
  }

  const limit = limitParam ? Number(limitParam) : 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return c.json({ error: 'invalid_limit' }, 400);
  }

  const from = fromParam ?? new Date().toISOString();
  const defaultToMs = Date.now() + DEFAULT_WINDOW_DAYS * 86_400_000;
  const to = toParam ?? new Date(defaultToMs).toISOString();

  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return c.json({ error: 'invalid_date_range' }, 400);
  }

  if (!c.env.DB) return c.json({ events: [] });

  const events = await getUpcomingCalendar(c.env.DB, {
    from,
    to,
    importance: importanceParam as CalendarEventImportance | undefined,
    limit,
  });

  return c.json({ events });
});
