import type { CalendarEventImportance, CalendarEventKind } from '@refi-radar/shared';
import type { CalendarEventInput, SourceInput } from '../db/queries';
import calendarData from '../data/economicCalendar.json';

interface CuratedEvent {
  id: string;
  name: string;
  scheduledFor: string;
  kind: CalendarEventKind;
  importance: CalendarEventImportance;
}

export const curatedCalendarSource: SourceInput = {
  id: 'curated_calendar',
  name: 'Curated US Economic Calendar',
  kind: 'calendar',
  url: undefined,
  cadenceMinutes: 60 * 24 * 7,
};

export function loadCuratedCalendar(now = new Date()): CalendarEventInput[] {
  const events = (calendarData.events as CuratedEvent[]) ?? [];
  const cutoff = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  return events
    .filter((event) => event.scheduledFor >= cutoff)
    .map((event) => ({
      id: event.id,
      sourceId: curatedCalendarSource.id,
      name: event.name,
      scheduledFor: event.scheduledFor,
      kind: event.kind,
      importance: event.importance,
      raw: { curated: true },
    }));
}
