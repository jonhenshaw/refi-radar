import { useCallback } from 'react';

import type { LocalAlertRule } from '@refi-radar/shared';

import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'refi-radar/alert-rules';

function makeId(): string {
  return `r_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export type NewRuleInput = Omit<LocalAlertRule, 'id' | 'createdAt' | 'lastTriggeredAt' | 'enabled'> & {
  enabled?: boolean;
};

export function useAlertRules() {
  const [rules, setRules] = useLocalStorage<LocalAlertRule[]>(STORAGE_KEY, []);

  const addRule = useCallback(
    (input: NewRuleInput) => {
      const rule: LocalAlertRule = {
        ...input,
        id: makeId(),
        enabled: input.enabled ?? true,
        createdAt: new Date().toISOString(),
      };
      setRules((prev) => [...prev, rule]);
      return rule;
    },
    [setRules],
  );

  const updateRule = useCallback(
    (id: string, patch: Partial<LocalAlertRule>) => {
      setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
    },
    [setRules],
  );

  const replaceRules = useCallback(
    (next: LocalAlertRule[]) => {
      setRules(next);
    },
    [setRules],
  );

  const toggleRule = useCallback(
    (id: string) => {
      setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)));
    },
    [setRules],
  );

  const deleteRule = useCallback(
    (id: string) => {
      setRules((prev) => prev.filter((rule) => rule.id !== id));
    },
    [setRules],
  );

  return { rules, addRule, updateRule, toggleRule, deleteRule, replaceRules };
}
