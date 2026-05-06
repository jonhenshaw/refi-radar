import type { ObservationConfidence, RateObservation, SourceId } from '@refi-radar/shared';

export interface Env {
  DB?: D1Database;
  REFI_RADAR_CACHE?: KVNamespace;
}

export type WorkerObservation = RateObservation & {
  sourceId: SourceId | string;
  confidence: ObservationConfidence;
};
