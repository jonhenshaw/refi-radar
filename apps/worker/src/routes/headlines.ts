import { Hono } from 'hono';
import type { NewsCategory, NewsSourceId } from '@refi-radar/shared';
import { getRecentNews } from '../db/queries';
import type { Env } from '../env';

const SUPPORTED_NEWS_SOURCES: NewsSourceId[] = [
  'fed_press',
  'marketwatch_bonds',
  'cnbc_bonds',
  'mnd_commentary',
  'treasury_auctions',
];

const SUPPORTED_CATEGORIES: NewsCategory[] = ['fed', 'markets', 'mortgage', 'auctions', 'commentary'];

function isNewsSource(value: string | null | undefined): value is NewsSourceId {
  return typeof value === 'string' && (SUPPORTED_NEWS_SOURCES as string[]).includes(value);
}

function isCategory(value: string | null | undefined): value is NewsCategory {
  return typeof value === 'string' && (SUPPORTED_CATEGORIES as string[]).includes(value);
}

export const headlinesRoutes = new Hono<{ Bindings: Env }>();

headlinesRoutes.get('/headlines', async (c) => {
  const sourceParam = c.req.query('source');
  const categoryParam = c.req.query('category');
  const limitParam = c.req.query('limit');
  const before = c.req.query('before');

  if (sourceParam && !isNewsSource(sourceParam)) {
    return c.json({ error: 'invalid_source', supportedSources: SUPPORTED_NEWS_SOURCES }, 400);
  }
  if (categoryParam && !isCategory(categoryParam)) {
    return c.json({ error: 'invalid_category', supportedCategories: SUPPORTED_CATEGORIES }, 400);
  }

  const limit = limitParam ? Number(limitParam) : 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return c.json({ error: 'invalid_limit' }, 400);
  }

  if (!c.env.DB) return c.json({ items: [] });

  const items = await getRecentNews(c.env.DB, {
    source: sourceParam as NewsSourceId | undefined,
    category: categoryParam as NewsCategory | undefined,
    limit,
    before: before ?? undefined,
  });

  return c.json({ items });
});
