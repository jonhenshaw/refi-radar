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
