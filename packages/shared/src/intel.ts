import type {
  IntelField,
  IntelUnit,
  ObservationConfidence,
  RateHistoryPoint,
  RateIntel,
  RateObservation,
  RateSourceId,
  SourceHealth,
} from './types';

const MORTGAGE_SOURCE: RateSourceId = 'mnd_30y_fixed';
const FRED_30Y_SOURCE: RateSourceId = 'fred_mortgage30us';
const TREASURY_10Y_SOURCE: RateSourceId = 'fred_dgs10';
const SPREAD_SOURCES: RateSourceId[] = [MORTGAGE_SOURCE, TREASURY_10Y_SOURCE];
const ONE_YEAR_DAYS = 365;
const FIFTY_TWO_WEEKS_DAYS = 364;

export function mortgageTreasurySpreadBps(mortgageRate: number, treasuryRate: number): number {
  return Math.round((mortgageRate - treasuryRate) * 100);
}

/** Align two rate histories by calendar date and return mortgage-minus-Treasury spread in percent. */
export function buildAlignedSpreadSeries(
  mortgagePoints: RateHistoryPoint[],
  treasuryPoints: RateHistoryPoint[],
): RateHistoryPoint[] {
  if (!mortgagePoints.length || !treasuryPoints.length) return [];
  const treasuryByDate = new Map(treasuryPoints.map((point) => [normalizeDate(point.date), point.rate]));
  return mortgagePoints.flatMap((point) => {
    const treasuryRate = treasuryByDate.get(normalizeDate(point.date));
    if (treasuryRate === undefined) return [];
    return [{ date: normalizeDate(point.date), rate: point.rate - treasuryRate }];
  });
}

/** Percentile rank (0–100): share of history at or below `value`. */
export function percentileRank(values: number[], value: number): number | undefined {
  if (!values.length || !Number.isFinite(value)) return undefined;
  const below = values.filter((entry) => entry <= value).length;
  return Math.round((below / values.length) * 100);
}

export function extremes(values: number[]): { lo: number; hi: number } | undefined {
  if (!values.length) return undefined;
  let lo = Infinity;
  let hi = -Infinity;
  for (const value of values) {
    if (value < lo) lo = value;
    if (value > hi) hi = value;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;
  return { lo, hi };
}

export function pointsWithinDays(points: RateHistoryPoint[], days: number, now = new Date()): RateHistoryPoint[] {
  if (!points.length) return [];
  const cutoffMs = now.getTime() - days * 86_400_000;
  return points.filter((point) => dateToMs(point.date) >= cutoffMs);
}

function normalizeDate(date: string): string {
  return date.slice(0, 10);
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function dateToMs(date: string): number {
  return Date.parse(`${normalizeDate(date)}T00:00:00.000Z`);
}

function observationToHistoryPoint(observation: RateObservation): RateHistoryPoint {
  return { date: normalizeDate(observation.observedAt), rate: observation.rate };
}

function historyFromObservations(observations: RateHistoryPoint[], latest?: RateObservation): RateHistoryPoint[] {
  const byDate = new Map<string, number>();
  for (const point of observations) {
    byDate.set(normalizeDate(point.date), point.rate);
  }
  if (latest) {
    byDate.set(normalizeDate(latest.observedAt), latest.rate);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rate]) => ({ date, rate }));
}

function healthForSource(health: SourceHealth[] | undefined, sourceId: RateSourceId): SourceHealth | undefined {
  return health?.find((entry) => entry.sourceId === sourceId);
}

function directField(
  label: string,
  observation: RateObservation | undefined,
  health: SourceHealth | undefined,
): IntelField {
  if (!observation) {
    return {
      label,
      unit: 'percent',
      derivation: 'direct',
      sourceId: undefined,
      unavailableReason: health?.lastError ?? 'No observations collected yet',
      stale: health?.stale ?? true,
    };
  }
  return {
    value: observation.rate,
    label,
    unit: 'percent',
    derivation: 'direct',
    sourceId: observation.sourceId,
    observedAt: observation.observedAt,
    fetchedAt: observation.fetchedAt,
    confidence: observation.confidence,
    stale: health?.stale ?? false,
    unavailableReason: health?.stale ? health.lastError ?? 'Latest observation is stale' : undefined,
  };
}

function derivedField(
  label: string,
  unit: IntelUnit,
  value: number | undefined,
  sourceIds: RateSourceId[],
  observedAt: string | undefined,
  unavailableReason?: string,
): IntelField {
  if (value === undefined || !Number.isFinite(value)) {
    return {
      label,
      unit,
      derivation: 'derived',
      sourceIds,
      observedAt,
      unavailableReason: unavailableReason ?? 'Insufficient history',
    };
  }
  return {
    value,
    label,
    unit,
    derivation: 'derived',
    sourceIds,
    observedAt,
  };
}

export interface BuildRateIntelInput {
  sources: RateObservation[];
  health?: SourceHealth[];
  mortgageHistory?: RateHistoryPoint[];
  treasuryHistory?: RateHistoryPoint[];
  fred30History?: RateHistoryPoint[];
  now?: Date;
}

/**
 * Build the rate-intel strip from latest observations plus ~1Y history.
 *
 * Spread = MND 30Y market estimate minus FRED 10Y Treasury (DGS10), in basis points.
 * Percentile = share of aligned daily spreads over the last 365 days at or below today's spread.
 * 52-week high/low = min/max aligned spread over the last 364 days; "vs" fields are distance in bps.
 */
export function buildRateIntel(input: BuildRateIntelInput): RateIntel {
  const now = input.now ?? new Date();
  const bySource = new Map(input.sources.map((source) => [source.sourceId, source]));
  const mnd = bySource.get(MORTGAGE_SOURCE);
  const fred30 = bySource.get(FRED_30Y_SOURCE);
  const treasury10 = bySource.get(TREASURY_10Y_SOURCE);

  const mndHistory = historyFromObservations(input.mortgageHistory ?? [], mnd);
  const treasuryHistory = historyFromObservations(input.treasuryHistory ?? [], treasury10);
  const fred30History = historyFromObservations(input.fred30History ?? [], fred30);

  const spreadSeries = buildAlignedSpreadSeries(mndHistory, treasuryHistory);
  const spreadHistory1Y = pointsWithinDays(spreadSeries, ONE_YEAR_DAYS, now);
  const spreadHistory52W = pointsWithinDays(spreadSeries, FIFTY_TWO_WEEKS_DAYS, now);
  const mortgageHistory1Y = pointsWithinDays(mndHistory, ONE_YEAR_DAYS, now);

  const spreadUnavailable =
    !mnd || !treasury10 || healthForSource(input.health, MORTGAGE_SOURCE)?.stale || healthForSource(input.health, TREASURY_10Y_SOURCE)?.stale
      ? 'Mortgage or 10Y Treasury observation missing or stale'
      : undefined;

  const currentSpreadBps =
    mnd && treasury10 && !spreadUnavailable
      ? mortgageTreasurySpreadBps(mnd.rate, treasury10.rate)
      : undefined;

  const spreadPercentile1Y =
    typeof currentSpreadBps === 'number' && spreadHistory1Y.length >= 2
      ? percentileRank(
          spreadHistory1Y.map((point) => point.rate),
          currentSpreadBps / 100,
        )
      : undefined;

  const spreadExtremes52W =
    spreadHistory52W.length >= 2
      ? extremes(spreadHistory52W.map((point) => point.rate))
      : undefined;

  const spreadVs52WeekHighBps =
    typeof currentSpreadBps === 'number' && spreadExtremes52W
      ? normalizeZero(Math.round(currentSpreadBps - spreadExtremes52W.hi * 100))
      : undefined;
  const spreadVs52WeekLowBps =
    typeof currentSpreadBps === 'number' && spreadExtremes52W
      ? normalizeZero(Math.round(currentSpreadBps - spreadExtremes52W.lo * 100))
      : undefined;

  const mortgage30yPercentile1Y =
    mnd && mortgageHistory1Y.length >= 2
      ? percentileRank(
          mortgageHistory1Y.map((point) => point.rate),
          mnd.rate,
        )
      : undefined;

  const asOf = [mnd?.observedAt, treasury10?.observedAt].filter(Boolean).sort().at(-1);

  return {
    mnd30y: directField('30Y market estimate', mnd, healthForSource(input.health, MORTGAGE_SOURCE)),
    fred30y: directField('Official weekly 30Y', fred30, healthForSource(input.health, FRED_30Y_SOURCE)),
    treasury10y: directField('10Y Treasury', treasury10, healthForSource(input.health, TREASURY_10Y_SOURCE)),
    spreadBps: derivedField(
      'Mortgage − 10Y spread',
      'bps',
      currentSpreadBps,
      SPREAD_SOURCES,
      asOf,
      spreadUnavailable,
    ),
    spreadPercentile1Y: derivedField(
      'Spread 1Y percentile',
      'pct_rank',
      spreadPercentile1Y,
      SPREAD_SOURCES,
      asOf,
      spreadHistory1Y.length < 2 ? 'Need at least two aligned spread days in the last year' : spreadUnavailable,
    ),
    spreadVs52WeekHighBps: derivedField(
      'Spread vs 52w high',
      'bps',
      spreadVs52WeekHighBps,
      SPREAD_SOURCES,
      asOf,
      spreadExtremes52W ? undefined : 'Need at least two aligned spread days in the last 52 weeks',
    ),
    spreadVs52WeekLowBps: derivedField(
      'Spread vs 52w low',
      'bps',
      spreadVs52WeekLowBps,
      SPREAD_SOURCES,
      asOf,
      spreadExtremes52W ? undefined : 'Need at least two aligned spread days in the last 52 weeks',
    ),
    mortgage30yPercentile1Y: derivedField(
      '30Y 1Y percentile',
      'pct_rank',
      mortgage30yPercentile1Y,
      [MORTGAGE_SOURCE],
      mnd?.observedAt,
      mortgageHistory1Y.length < 2 ? 'Need at least two MND observations in the last year' : undefined,
    ),
    computedAt: now.toISOString(),
  };
}

export function observationHistoryPoints(observations: RateObservation[]): RateHistoryPoint[] {
  return observations.map(observationToHistoryPoint);
}
