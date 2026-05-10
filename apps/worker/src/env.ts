import type { ObservationConfidence, RateObservation, SourceId } from '@refi-radar/shared';

export interface Env {
  DB?: D1Database;
  REFI_RADAR_CACHE?: KVNamespace;
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  APNS_BUNDLE_ID?: string;
  APNS_PRIVATE_KEY?: string;
  APNS_USE_SANDBOX?: string;
  NOTIFICATION_ADMIN_TOKEN?: string;
}

export type WorkerObservation = RateObservation & {
  sourceId: SourceId | string;
  confidence: ObservationConfidence;
};
