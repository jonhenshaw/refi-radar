import { useEffect, useRef } from 'react';

import {
  evaluateRules,
  type AlertEvent,
  type LatestSnapshot,
  type LocalAlertRule,
  type SourceId,
} from '@refi-radar/shared';

import type { RateSeries } from '../lib/api';

interface Args {
  rules: LocalAlertRule[];
  snapshot: LatestSnapshot | null;
  series: RateSeries[];
  refiBreakEvenMonths?: number;
  enabled: boolean;
  onFire: (events: AlertEvent[], updatedRules: LocalAlertRule[]) => void;
}

export function useAlertEvaluator({ rules, snapshot, series, refiBreakEvenMonths, enabled, onFire }: Args) {
  const onFireRef = useRef(onFire);
  useEffect(() => {
    onFireRef.current = onFire;
  }, [onFire]);

  useEffect(() => {
    if (!enabled || !snapshot || rules.length === 0) return;

    const seriesBySource: Partial<Record<SourceId, { date: string; rate: number }[]>> = {};
    for (const item of series) {
      seriesBySource[item.sourceId] = item.points;
    }

    const { fired, updatedRules } = evaluateRules(rules, {
      snapshot,
      seriesBySource,
      refiBreakEvenMonths,
      now: new Date().toISOString(),
    });

    if (fired.length > 0) {
      onFireRef.current(fired, updatedRules);
    }
  }, [rules, snapshot, series, refiBreakEvenMonths, enabled]);
}
