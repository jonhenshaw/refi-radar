import { describe, expect, it } from 'vitest';

import { describeRule, evaluateRules, type LocalAlertRule } from './alerts';
import type { LatestSnapshot } from './types';

const NOW = '2026-05-07T12:00:00.000Z';

function makeSnapshot(overrides: Partial<Record<'mnd' | 'fred' | 'dgs', number>> = {}): LatestSnapshot {
  const mnd = overrides.mnd ?? 6.72;
  const fred = overrides.fred ?? 6.88;
  const dgs = overrides.dgs ?? 4.14;
  return {
    primary: { sourceId: 'mnd_30y_fixed', observedAt: NOW, fetchedAt: NOW, rate: mnd, confidence: 'market_estimate' },
    sources: [
      { sourceId: 'mnd_30y_fixed', observedAt: NOW, fetchedAt: NOW, rate: mnd, confidence: 'market_estimate' },
      { sourceId: 'fred_mortgage30us', observedAt: NOW, fetchedAt: NOW, rate: fred, confidence: 'weekly_survey' },
      { sourceId: 'fred_dgs10', observedAt: NOW, fetchedAt: NOW, rate: dgs, confidence: 'proxy' },
    ],
    health: [],
  };
}

function makeRule(overrides: Partial<LocalAlertRule> = {}): LocalAlertRule {
  return {
    id: 'r1',
    sourceId: 'mnd_30y_fixed',
    type: 'below_rate',
    threshold: 7.0,
    enabled: true,
    cooldownMinutes: 360,
    createdAt: NOW,
    ...overrides,
  };
}

describe('evaluateRules', () => {
  it('fires when below_rate threshold is met', () => {
    const rule = makeRule({ type: 'below_rate', threshold: 7.0 });
    const { fired, updatedRules } = evaluateRules([rule], { snapshot: makeSnapshot({ mnd: 6.72 }), now: NOW });
    expect(fired).toHaveLength(1);
    expect(fired[0].sourceId).toBe('mnd_30y_fixed');
    expect(fired[0].observedRate).toBe(6.72);
    expect(updatedRules[0].lastTriggeredAt).toBe(NOW);
  });

  it('does not fire when below_rate threshold is not met', () => {
    const rule = makeRule({ type: 'below_rate', threshold: 5.0 });
    const { fired, updatedRules } = evaluateRules([rule], { snapshot: makeSnapshot({ mnd: 6.72 }), now: NOW });
    expect(fired).toHaveLength(0);
    expect(updatedRules[0].lastTriggeredAt).toBeUndefined();
  });

  it('fires when above_rate threshold is met', () => {
    const rule = makeRule({ type: 'above_rate', threshold: 6.5 });
    const { fired } = evaluateRules([rule], { snapshot: makeSnapshot({ mnd: 6.72 }), now: NOW });
    expect(fired).toHaveLength(1);
  });

  it('skips disabled rules', () => {
    const rule = makeRule({ enabled: false, threshold: 7.0 });
    const { fired } = evaluateRules([rule], { snapshot: makeSnapshot({ mnd: 6.72 }), now: NOW });
    expect(fired).toHaveLength(0);
  });

  it('respects cooldown window', () => {
    const fiveMinutesAgo = new Date(Date.parse(NOW) - 5 * 60 * 1000).toISOString();
    const rule = makeRule({ threshold: 7.0, cooldownMinutes: 360, lastTriggeredAt: fiveMinutesAgo });
    const { fired, updatedRules } = evaluateRules([rule], { snapshot: makeSnapshot({ mnd: 6.72 }), now: NOW });
    expect(fired).toHaveLength(0);
    expect(updatedRules[0].lastTriggeredAt).toBe(fiveMinutesAgo);
  });

  it('fires again after cooldown elapses', () => {
    const eightHoursAgo = new Date(Date.parse(NOW) - 8 * 60 * 60 * 1000).toISOString();
    const rule = makeRule({ threshold: 7.0, cooldownMinutes: 360, lastTriggeredAt: eightHoursAgo });
    const { fired } = evaluateRules([rule], { snapshot: makeSnapshot({ mnd: 6.72 }), now: NOW });
    expect(fired).toHaveLength(1);
  });

  it('fires drop_from_recent_high_bps when drop exceeds threshold', () => {
    const rule = makeRule({ type: 'drop_from_recent_high_bps', threshold: 20 });
    const series = [
      { date: '2026-04-01', rate: 7.05 },
      { date: '2026-04-15', rate: 6.95 },
      { date: '2026-05-07', rate: 6.72 },
    ];
    const { fired } = evaluateRules([rule], {
      snapshot: makeSnapshot({ mnd: 6.72 }),
      seriesBySource: { mnd_30y_fixed: series },
      now: NOW,
    });
    expect(fired).toHaveLength(1);
  });

  it('does not fire drop_from_recent_high_bps when drop is small', () => {
    const rule = makeRule({ type: 'drop_from_recent_high_bps', threshold: 50 });
    const series = [
      { date: '2026-04-01', rate: 6.78 },
      { date: '2026-05-07', rate: 6.72 },
    ];
    const { fired } = evaluateRules([rule], {
      snapshot: makeSnapshot({ mnd: 6.72 }),
      seriesBySource: { mnd_30y_fixed: series },
      now: NOW,
    });
    expect(fired).toHaveLength(0);
  });

  it('fires break_even_below_months when months drop below threshold', () => {
    const rule = makeRule({ type: 'break_even_below_months', threshold: 24 });
    const { fired } = evaluateRules([rule], {
      snapshot: makeSnapshot(),
      refiBreakEvenMonths: 18,
      now: NOW,
    });
    expect(fired).toHaveLength(1);
    expect(fired[0].observedRate).toBe(18);
  });

  it('does not fire break_even when result is missing or non-finite', () => {
    const rule = makeRule({ type: 'break_even_below_months', threshold: 24 });
    const { fired } = evaluateRules([rule], { snapshot: makeSnapshot(), now: NOW });
    expect(fired).toHaveLength(0);
  });

  it('returns rules unchanged when no event fires', () => {
    const rule = makeRule({ threshold: 5.0 });
    const { updatedRules } = evaluateRules([rule], { snapshot: makeSnapshot({ mnd: 6.72 }), now: NOW });
    expect(updatedRules[0]).toBe(rule);
  });
});

describe('describeRule', () => {
  it('describes each rule type readably', () => {
    expect(describeRule(makeRule({ type: 'below_rate', threshold: 6.25 }))).toMatch(/drops to or below 6.25%/);
    expect(describeRule(makeRule({ type: 'above_rate', threshold: 7.5 }))).toMatch(/climbs to or above 7.50%/);
    expect(describeRule(makeRule({ type: 'drop_from_recent_high_bps', threshold: 25 }))).toMatch(/falls 25 bps/);
    expect(describeRule(makeRule({ type: 'break_even_below_months', threshold: 24 }))).toMatch(/below 24 months/);
  });
});
