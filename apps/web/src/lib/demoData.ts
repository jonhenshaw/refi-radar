import type {
  CalendarEvent,
  LatestSnapshot,
  NewsItem,
  RateObservation,
  RateSourceId,
  SourceHealth as SourceHealthType,
} from '@refi-radar/shared';

import type { RangeKey, RateSeries } from './api';
import { SOURCE_COLORS, SOURCE_LABELS } from './sourceTheme';

const now = new Date().toISOString();

const demoSources: RateObservation[] = [
  { sourceId: 'mnd_30y_fixed', observedAt: now, fetchedAt: now, rate: 6.72, changeBps: -7, confidence: 'market_estimate' },
  { sourceId: 'fred_mortgage30us', observedAt: now, fetchedAt: now, rate: 6.88, changeBps: 2, confidence: 'weekly_survey' },
  { sourceId: 'fred_mortgage15us', observedAt: now, fetchedAt: now, rate: 5.82, changeBps: 1, confidence: 'weekly_survey' },
  { sourceId: 'fred_dgs10', observedAt: now, fetchedAt: now, rate: 4.14, changeBps: -3, confidence: 'proxy' },
  { sourceId: 'fred_dgs2', observedAt: now, fetchedAt: now, rate: 3.71, changeBps: -2, confidence: 'proxy' },
  { sourceId: 'fred_dgs30', observedAt: now, fetchedAt: now, rate: 4.55, changeBps: -4, confidence: 'proxy' },
  { sourceId: 'fred_t10y2y', observedAt: now, fetchedAt: now, rate: 0.43, changeBps: -1, confidence: 'proxy' },
  { sourceId: 'fred_dff', observedAt: now, fetchedAt: now, rate: 4.83, changeBps: 0, confidence: 'proxy' },
  { sourceId: 'fred_sofr', observedAt: now, fetchedAt: now, rate: 4.81, changeBps: 0, confidence: 'proxy' },
];

const demoHealth: SourceHealthType[] = demoSources.map((source) => ({
  sourceId: source.sourceId,
  ok: true,
  stale: false,
  lastSuccessAt: source.fetchedAt,
}));

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

const demoNews: NewsItem[] = [
  {
    sourceId: 'fed_press',
    headline: 'Federal Reserve issues FOMC statement (sample)',
    summary: 'Sample headline shown while live API is unreachable. Live feed will replace this with the latest FOMC statement.',
    url: 'https://www.federalreserve.gov/newsevents/pressreleases.htm',
    publishedAt: minutesAgo(45),
    fetchedAt: now,
    category: 'fed',
  },
  {
    sourceId: 'mnd_commentary',
    headline: 'Mortgage rates ease as bond market reacts to softer CPI (sample)',
    summary: 'Commentary placeholder. Pulled from MND when live.',
    url: 'https://www.mortgagenewsdaily.com/markets',
    publishedAt: minutesAgo(95),
    fetchedAt: now,
    category: 'mortgage',
  },
  {
    sourceId: 'cnbc_bonds',
    headline: '10-year Treasury yield slips after Fed minutes (sample)',
    summary: 'Demo CNBC bonds headline.',
    url: 'https://www.cnbc.com/bonds/',
    publishedAt: minutesAgo(180),
    fetchedAt: now,
    category: 'markets',
  },
  {
    sourceId: 'marketwatch_bonds',
    headline: 'Yield curve flattens as 2-year Treasury holds steady (sample)',
    summary: 'Demo MarketWatch market pulse item.',
    url: 'https://www.marketwatch.com/markets/bonds',
    publishedAt: minutesAgo(240),
    fetchedAt: now,
    category: 'markets',
  },
  {
    sourceId: 'treasury_auctions',
    headline: 'Treasury announces 10-year note reopening (sample)',
    summary: 'Demo Treasury Direct auction announcement.',
    url: 'https://www.treasurydirect.gov/auctions/announcements/',
    publishedAt: minutesAgo(360),
    fetchedAt: now,
    category: 'auctions',
  },
  {
    sourceId: 'fed_press',
    headline: 'Fed Vice Chair speaks on financial stability (sample)',
    summary: 'Demo press release.',
    url: 'https://www.federalreserve.gov/newsevents/speech',
    publishedAt: minutesAgo(720),
    fetchedAt: now,
    category: 'fed',
  },
  {
    sourceId: 'mnd_commentary',
    headline: 'Refinance demand ticks up as 30-year averages fall (sample)',
    summary: 'Demo MND commentary.',
    url: 'https://www.mortgagenewsdaily.com/news',
    publishedAt: minutesAgo(900),
    fetchedAt: now,
    category: 'mortgage',
  },
  {
    sourceId: 'cnbc_bonds',
    headline: 'Bond traders price in shallower rate path through year-end (sample)',
    summary: 'Demo CNBC market wrap.',
    url: 'https://www.cnbc.com/bonds/',
    publishedAt: minutesAgo(1380),
    fetchedAt: now,
    category: 'markets',
  },
];

const demoCalendar: CalendarEvent[] = [
  {
    id: 'demo_cpi',
    sourceId: 'curated_calendar',
    name: 'CPI release (sample)',
    scheduledFor: daysFromNow(4),
    kind: 'cpi',
    importance: 'high',
  },
  {
    id: 'demo_fomc',
    sourceId: 'curated_calendar',
    name: 'FOMC statement (sample)',
    scheduledFor: daysFromNow(40),
    kind: 'fomc',
    importance: 'high',
  },
  {
    id: 'demo_jobs',
    sourceId: 'curated_calendar',
    name: 'Jobs report (sample)',
    scheduledFor: daysFromNow(28),
    kind: 'jobs',
    importance: 'high',
  },
  {
    id: 'demo_auction',
    sourceId: 'curated_calendar',
    name: '10-year Treasury auction (sample)',
    scheduledFor: daysFromNow(11),
    kind: 'auction',
    importance: 'medium',
  },
  {
    id: 'demo_fomc_2',
    sourceId: 'curated_calendar',
    name: 'FOMC statement (with SEP) (sample)',
    scheduledFor: daysFromNow(82),
    kind: 'fomc',
    importance: 'high',
  },
];

export const demoLatest: LatestSnapshot = {
  primary: demoSources[0],
  sources: demoSources,
  health: demoHealth,
  news: demoNews,
  calendar: demoCalendar,
};

const dayMs = 24 * 60 * 60 * 1000;

const demoShape: Record<RangeKey, { count: number; strideMs: number }> = {
  '1D': { count: 2, strideMs: dayMs },
  '5D': { count: 6, strideMs: dayMs },
  '1M': { count: 31, strideMs: dayMs },
  '3M': { count: 92, strideMs: dayMs },
  '1Y': { count: 365, strideMs: dayMs },
  '5Y': { count: 261, strideMs: 7 * dayMs },
  MAX: { count: 521, strideMs: 7 * dayMs },
};

interface SeriesConfig {
  sourceId: RateSourceId;
  base: number;
  wave: number;
  drift: number;
}

const seriesConfigs: SeriesConfig[] = [
  { sourceId: 'mnd_30y_fixed', base: 6.72, wave: 0.08, drift: -0.0008 },
  { sourceId: 'fred_mortgage30us', base: 6.88, wave: 0.06, drift: -0.0006 },
  { sourceId: 'fred_mortgage15us', base: 5.82, wave: 0.05, drift: -0.0005 },
  { sourceId: 'fred_dgs10', base: 4.14, wave: 0.05, drift: -0.0004 },
  { sourceId: 'fred_dgs2', base: 3.71, wave: 0.045, drift: -0.0003 },
  { sourceId: 'fred_dgs30', base: 4.55, wave: 0.05, drift: -0.0004 },
  { sourceId: 'fred_t10y2y', base: 0.43, wave: 0.06, drift: 0.0001 },
  { sourceId: 'fred_dff', base: 4.83, wave: 0.01, drift: -0.0001 },
  { sourceId: 'fred_sofr', base: 4.81, wave: 0.01, drift: -0.0001 },
];

export function makeDemoSeries(range: RangeKey): RateSeries[] {
  const { count, strideMs } = demoShape[range];

  return seriesConfigs.map((config) => ({
    sourceId: config.sourceId,
    label: SOURCE_LABELS[config.sourceId],
    color: SOURCE_COLORS[config.sourceId],
    points: Array.from({ length: count }, (_, index) => {
      const fromEnd = count - index - 1;
      const driftAmount = fromEnd * config.drift * (strideMs / dayMs);
      const rate =
        config.base +
        driftAmount +
        Math.sin(index / 6) * config.wave +
        Math.sin(index / 23) * config.wave * 0.4;
      const date = new Date(Date.now() - fromEnd * strideMs).toISOString().slice(0, 10);
      return { date, rate: Number(rate.toFixed(3)) };
    }),
  }));
}
