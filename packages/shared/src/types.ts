export type SourceId = 'mnd_30y_fixed' | 'fred_mortgage30us' | 'fred_dgs10';

export type ObservationConfidence =
  | 'market_estimate'
  | 'weekly_survey'
  | 'proxy'
  | 'user_derived';

export interface RateObservation {
  sourceId: SourceId;
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

export interface LatestSnapshot {
  primary?: RateObservation;
  sources: RateObservation[];
  health: SourceHealth[];
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
  sourceId: SourceId;
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
