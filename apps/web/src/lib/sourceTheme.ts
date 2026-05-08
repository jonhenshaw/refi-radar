import type { NewsSourceId, RateSourceId } from '@refi-radar/shared';

/**
 * Single source of truth for source-related visual + textual identity.
 * Consumed by api.ts, ChartCanvas, Crosshair, PerSourceLadder, TickerBar, etc.
 * Hex values are duplicated in styles.css `@theme` (--color-source-*)
 * — keep in sync; a vitest assertion catches drift.
 */
export const SOURCE_COLORS: Record<RateSourceId, string> = {
  mnd_30y_fixed: '#4D9FFF',
  fred_mortgage30us: '#2DD673',
  fred_dgs10: '#B295F5',
  fred_dgs2: '#6EE7F0',
  fred_dgs30: '#F5A742',
  fred_t10y2y: '#FF7A45',
  fred_dff: '#E879F9',
  fred_sofr: '#2DD4BF',
  fred_mortgage15us: '#84F0A8',
};

export const SOURCE_LABELS: Record<RateSourceId, string> = {
  mnd_30y_fixed: 'MND 30Y Fixed',
  fred_mortgage30us: 'FRED Survey',
  fred_dgs10: '10Y Treasury',
  fred_dgs2: '2Y Treasury',
  fred_dgs30: '30Y Treasury',
  fred_t10y2y: '10Y-2Y Spread',
  fred_dff: 'Fed Funds',
  fred_sofr: 'SOFR',
  fred_mortgage15us: 'FRED 15Y Survey',
};

export const SOURCE_LABELS_LONG: Record<RateSourceId, string> = {
  mnd_30y_fixed: 'Mortgage News Daily 30Y',
  fred_mortgage30us: 'FRED Mortgage30US',
  fred_dgs10: 'FRED 10Y Treasury',
  fred_dgs2: 'FRED 2Y Treasury',
  fred_dgs30: 'FRED 30Y Treasury',
  fred_t10y2y: 'FRED 10Y-2Y Spread',
  fred_dff: 'FRED Effective Fed Funds',
  fred_sofr: 'FRED SOFR',
  fred_mortgage15us: 'FRED Mortgage15US',
};

export const SOURCE_META: Record<RateSourceId, string> = {
  mnd_30y_fixed: 'daily market feed',
  fred_mortgage30us: 'weekly official avg',
  fred_dgs10: 'market proxy',
  fred_dgs2: 'market proxy',
  fred_dgs30: 'market proxy',
  fred_t10y2y: 'derived spread',
  fred_dff: 'overnight policy rate',
  fred_sofr: 'overnight benchmark',
  fred_mortgage15us: 'weekly official avg',
};

/** The chart compare endpoint pulls these. Kept narrow to avoid overloading the multi-source chart. */
export const SOURCE_ORDER: RateSourceId[] = ['mnd_30y_fixed', 'fred_mortgage30us', 'fred_dgs10'];

/** Cells displayed in the top ticker bar, left → right. Reads spot rates from /api/latest. */
export const TICKER_ORDER: RateSourceId[] = [
  'mnd_30y_fixed',
  'fred_mortgage30us',
  'fred_mortgage15us',
  'fred_dgs2',
  'fred_dgs10',
  'fred_dgs30',
  'fred_t10y2y',
  'fred_dff',
  'fred_sofr',
];

/** Categorical colors for news source pills. Reuses existing semantic tokens — no new hexes. */
export const NEWS_SOURCE_TONE: Record<NewsSourceId, 'info' | 'good' | 'warn' | 'accent' | 'bad'> = {
  fed_press: 'info',
  marketwatch_bonds: 'warn',
  cnbc_bonds: 'info',
  mnd_commentary: 'accent',
  treasury_auctions: 'warn',
};

export const NEWS_SOURCE_ABBREV: Record<NewsSourceId, string> = {
  fed_press: 'FED',
  marketwatch_bonds: 'MW',
  cnbc_bonds: 'CNBC',
  mnd_commentary: 'MND',
  treasury_auctions: 'TR',
};

export const NEWS_SOURCE_LABEL: Record<NewsSourceId, string> = {
  fed_press: 'Federal Reserve',
  marketwatch_bonds: 'MarketWatch',
  cnbc_bonds: 'CNBC',
  mnd_commentary: 'Mortgage News Daily',
  treasury_auctions: 'Treasury Direct',
};

/** Chart axis + grid colors. Pull from CSS custom properties at runtime when possible,
 * fall back to literals for SVG attrs that need a string immediately. */
export const AXIS_FG = 'rgba(245,245,247,0.42)';
export const AXIS_FG_STRONG = 'rgba(245,245,247,0.62)';
export const GRID_LINE = 'rgba(255,255,255,0.05)';
export const CROSSHAIR_LINE = 'rgba(255,255,255,0.32)';
