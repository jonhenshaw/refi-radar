import type { LatestSnapshot, RateObservation, RateSourceId } from './types';

export type AlertRuleType =
  | 'below_rate'
  | 'above_rate'
  | 'drop_from_recent_high_bps'
  | 'break_even_below_months';

export interface LocalAlertRule {
  id: string;
  sourceId: RateSourceId;
  type: AlertRuleType;
  threshold: number;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  createdAt: string;
  label?: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  firedAt: string;
  message: string;
  sourceId: RateSourceId;
  observedRate?: number;
  ruleSnapshot: {
    type: AlertRuleType;
    threshold: number;
    label?: string;
  };
}

export interface SeriesPoint {
  date: string;
  rate: number;
}

export interface EvaluationContext {
  snapshot: LatestSnapshot;
  seriesBySource?: Partial<Record<RateSourceId, SeriesPoint[]>>;
  refiBreakEvenMonths?: number;
  now: string;
}

export interface EvaluationResult {
  fired: AlertEvent[];
  updatedRules: LocalAlertRule[];
}

const SOURCE_LABELS: Record<RateSourceId, string> = {
  mnd_30y_fixed: 'MND 30Y Fixed',
  fred_mortgage30us: 'FRED Survey',
  fred_dgs10: '10Y Treasury',
  fred_dgs2: '2Y Treasury',
  fred_dgs30: '30Y Treasury',
  fred_t10y2y: '10Y-2Y Spread',
  fred_dff: 'Fed Funds (DFF)',
  fred_sofr: 'SOFR',
  fred_mortgage15us: 'FRED 15Y Survey',
};

function pickObservation(snapshot: LatestSnapshot, sourceId: RateSourceId): RateObservation | undefined {
  return snapshot.sources.find((s) => s.sourceId === sourceId);
}

function isCoolingDown(rule: LocalAlertRule, nowMs: number): boolean {
  if (!rule.lastTriggeredAt) return false;
  const lastMs = Date.parse(rule.lastTriggeredAt);
  if (!Number.isFinite(lastMs)) return false;
  return nowMs - lastMs < rule.cooldownMinutes * 60 * 1000;
}

function makeEventId(ruleId: string, nowMs: number): string {
  return `${ruleId}-${nowMs.toString(36)}`;
}

function describeMatch(
  rule: LocalAlertRule,
  observed: number | undefined,
): string {
  const label = rule.label ?? SOURCE_LABELS[rule.sourceId];
  const observedText = typeof observed === 'number' ? observed.toFixed(2) : '—';
  switch (rule.type) {
    case 'below_rate':
      return `${label} dropped to ${observedText}% (target ≤ ${rule.threshold.toFixed(2)}%)`;
    case 'above_rate':
      return `${label} climbed to ${observedText}% (alert > ${rule.threshold.toFixed(2)}%)`;
    case 'drop_from_recent_high_bps':
      return `${label} fell ${Math.round(rule.threshold)} bps from its recent high to ${observedText}%`;
    case 'break_even_below_months':
      return `Break-even fell to ${typeof observed === 'number' ? Math.round(observed) : '—'} months (alert < ${Math.round(rule.threshold)})`;
  }
}

function evaluateRule(
  rule: LocalAlertRule,
  ctx: EvaluationContext,
): { triggered: boolean; observed?: number } {
  if (rule.type === 'break_even_below_months') {
    const months = ctx.refiBreakEvenMonths;
    if (typeof months !== 'number' || !Number.isFinite(months)) {
      return { triggered: false };
    }
    return { triggered: months < rule.threshold, observed: months };
  }

  const observation = pickObservation(ctx.snapshot, rule.sourceId);
  if (!observation || typeof observation.rate !== 'number') {
    return { triggered: false };
  }

  const rate = observation.rate;

  if (rule.type === 'below_rate') {
    return { triggered: rate <= rule.threshold, observed: rate };
  }

  if (rule.type === 'above_rate') {
    return { triggered: rate >= rule.threshold, observed: rate };
  }

  if (rule.type === 'drop_from_recent_high_bps') {
    const series = ctx.seriesBySource?.[rule.sourceId] ?? [];
    if (series.length === 0) return { triggered: false, observed: rate };
    const high = series.reduce((max, p) => (p.rate > max ? p.rate : max), -Infinity);
    if (!Number.isFinite(high)) return { triggered: false, observed: rate };
    const dropBps = (high - rate) * 100;
    return { triggered: dropBps >= rule.threshold, observed: rate };
  }

  return { triggered: false };
}

export function evaluateRules(rules: LocalAlertRule[], ctx: EvaluationContext): EvaluationResult {
  const nowMs = Date.parse(ctx.now);
  const fired: AlertEvent[] = [];
  const updatedRules = rules.map((rule) => {
    if (!rule.enabled) return rule;
    if (isCoolingDown(rule, nowMs)) return rule;

    const result = evaluateRule(rule, ctx);
    if (!result.triggered) return rule;

    fired.push({
      id: makeEventId(rule.id, nowMs),
      ruleId: rule.id,
      firedAt: ctx.now,
      message: describeMatch(rule, result.observed),
      sourceId: rule.sourceId,
      observedRate: result.observed,
      ruleSnapshot: { type: rule.type, threshold: rule.threshold, label: rule.label },
    });

    return { ...rule, lastTriggeredAt: ctx.now };
  });

  return { fired, updatedRules };
}

export function describeRule(rule: LocalAlertRule): string {
  const label = rule.label ?? SOURCE_LABELS[rule.sourceId];
  switch (rule.type) {
    case 'below_rate':
      return `${label} drops to or below ${rule.threshold.toFixed(2)}%`;
    case 'above_rate':
      return `${label} climbs to or above ${rule.threshold.toFixed(2)}%`;
    case 'drop_from_recent_high_bps':
      return `${label} falls ${Math.round(rule.threshold)} bps from recent high`;
    case 'break_even_below_months':
      return `Refi break-even drops below ${Math.round(rule.threshold)} months`;
  }
}
