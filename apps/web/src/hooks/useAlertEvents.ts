import { useCallback } from 'react';

import type { AlertEvent } from '@refi-radar/shared';

import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'refi-radar/alert-events';
const MAX_EVENTS = 50;

export function useAlertEvents() {
  const [events, setEvents] = useLocalStorage<AlertEvent[]>(STORAGE_KEY, []);

  const appendEvents = useCallback(
    (incoming: AlertEvent[]) => {
      if (incoming.length === 0) return;
      setEvents((prev) => {
        const seen = new Set<string>();
        return [...incoming, ...prev]
          .filter((event) => {
            if (seen.has(event.id)) return false;
            seen.add(event.id);
            return true;
          })
          .slice(0, MAX_EVENTS);
      });
    },
    [setEvents],
  );

  const clearEvents = useCallback(() => setEvents([]), [setEvents]);

  return { events, appendEvents, clearEvents };
}
