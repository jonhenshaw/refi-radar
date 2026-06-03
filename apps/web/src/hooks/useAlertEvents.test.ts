import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AlertEvent } from '@refi-radar/shared';

import { useAlertEvents } from './useAlertEvents';

function makeEvent(id: string): AlertEvent {
  return {
    id,
    ruleId: 'rule-1',
    firedAt: '2026-06-02T12:00:00.000Z',
    message: 'Alert fired',
    sourceId: 'mnd_30y_fixed',
    ruleSnapshot: { type: 'below_rate', threshold: 6.25 },
  };
}

describe('useAlertEvents', () => {
  it('dedupes alert events by id while keeping the newest event first', () => {
    const { result } = renderHook(() => useAlertEvents());

    act(() => result.current.appendEvents([makeEvent('event-1')]));
    act(() => result.current.appendEvents([makeEvent('event-2'), makeEvent('event-1')]));

    expect(result.current.events.map((event) => event.id)).toEqual(['event-2', 'event-1']);
  });
});
