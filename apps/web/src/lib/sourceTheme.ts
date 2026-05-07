import type { SourceId } from '@refi-radar/shared';

/**
 * Single source of truth for source-related visual + textual identity.
 * Consumed by api.ts, ChartCanvas, Crosshair, PerSourceLadder, etc.
 * Hex values are duplicated in styles.css `@theme` (--color-source-*)
 * — keep in sync; a vitest assertion catches drift.
 */
export const SOURCE_COLORS: Record<SourceId, string> = {
  mnd_30y_fixed: '#4D9FFF',
  fred_mortgage30us: '#2DD673',
  fred_dgs10: '#B295F5',
};

export const SOURCE_LABELS: Record<SourceId, string> = {
  mnd_30y_fixed: 'MND 30Y Fixed',
  fred_mortgage30us: 'FRED Survey',
  fred_dgs10: '10Y Treasury',
};

export const SOURCE_LABELS_LONG: Record<SourceId, string> = {
  mnd_30y_fixed: 'Mortgage News Daily 30Y',
  fred_mortgage30us: 'FRED Mortgage30US',
  fred_dgs10: 'FRED 10Y Treasury',
};

export const SOURCE_META: Record<SourceId, string> = {
  mnd_30y_fixed: 'daily market feed',
  fred_mortgage30us: 'weekly official avg',
  fred_dgs10: 'market proxy',
};

export const SOURCE_ORDER: SourceId[] = ['mnd_30y_fixed', 'fred_mortgage30us', 'fred_dgs10'];

/** Chart axis + grid colors. Pull from CSS custom properties at runtime when possible,
 * fall back to literals for SVG attrs that need a string immediately. */
export const AXIS_FG = 'rgba(245,245,247,0.42)';
export const AXIS_FG_STRONG = 'rgba(245,245,247,0.62)';
export const GRID_LINE = 'rgba(255,255,255,0.05)';
export const CROSSHAIR_LINE = 'rgba(255,255,255,0.32)';
