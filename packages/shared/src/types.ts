export type RateSourceId =
  | 'mnd_30y_fixed'
  | 'fred_mortgage30us'
  | 'fred_dgs10'
  | 'fred_dgs2'
  | 'fred_dgs30'
  | 'fred_t10y2y'
  | 'fred_dff'
  | 'fred_sofr'
  | 'fred_mortgage15us';

export type NewsSourceId =
  | 'fed_press'
  | 'marketwatch_bonds'
  | 'cnbc_bonds'
  | 'mnd_commentary'
  | 'treasury_auctions';

export type CalendarSourceId = 'curated_calendar';

export type SourceId = RateSourceId | NewsSourceId | CalendarSourceId;

export type ObservationConfidence =
  | 'market_estimate'
  | 'weekly_survey'
  | 'proxy'
  | 'user_derived';

export interface RateObservation {
  sourceId: RateSourceId;
  observedAt: string;
  fetchedAt: string;
  rate: number;
  changeBps?: number;
  confidence: ObservationConfidence;
  raw?: unknown;
}

export interface SourceHealth {
  sourceId: SourceId;
  ok: boolean;
  stale: boolean;
  lastSuccessAt?: string;
  lastError?: string;
}

export type NewsCategory = 'fed' | 'markets' | 'mortgage' | 'auctions' | 'commentary';

export interface NewsItem {
  sourceId: NewsSourceId;
  headline: string;
  summary?: string;
  url: string;
  publishedAt: string;
  fetchedAt: string;
  category: NewsCategory;
  raw?: unknown;
}

export type CalendarEventKind = 'fomc' | 'cpi' | 'jobs' | 'auction' | 'other';
export type CalendarEventImportance = 'high' | 'medium' | 'low';

export interface CalendarEvent {
  id: string;
  sourceId: SourceId;
  name: string;
  scheduledFor: string;
  kind: CalendarEventKind;
  importance: CalendarEventImportance;
  raw?: unknown;
}

export interface LatestSnapshot {
  primary?: RateObservation;
  sources: RateObservation[];
  health: SourceHealth[];
  news?: NewsItem[];
  calendar?: CalendarEvent[];
}

export interface RefiInput {
  balance: number;
  currentRate: number;
  newRate: number;
  termYears: number;
  closingCosts: number;
}

export interface AlertRule {
  id: string;
  userId: string;
  sourceId: RateSourceId;
  ruleType: 'below_rate' | 'above_rate' | 'drop_from_recent_high_bps' | 'daily_summary' | 'weekly_summary' | 'break_even_below_months';
  threshold?: number;
  thresholdBps?: number;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface LoanProfile {
  id: string;
  userId: string;
  currentBalance?: number;
  currentRate?: number;
  remainingMonths?: number;
  estimatedClosingCosts?: number;
  targetRate?: number;
  createdAt: string;
  updatedAt: string;
}

export type Range = '1D' | '5D' | '1M' | '3M' | '1Y' | '5Y' | 'MAX';

export interface RefiResult {
  currentPayment: number;
  newPayment: number;
  monthlySavings: number;
  breakEvenMonths: number | null;
}
