import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Newspaper } from 'lucide-react';
import type { CalendarEvent, CalendarEventImportance, NewsCategory, NewsItem } from '@refi-radar/shared';

import { getCalendar, getHeadlines } from '../../lib/api';
import { relativeTime } from '../../lib/relativeTime';
import { NewsRow } from './NewsRow';

interface Props {
  news: NewsItem[];
  calendar: CalendarEvent[];
  loading?: boolean;
}

type TabKey = 'all' | NewsCategory | 'calendar';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'fed', label: 'Fed' },
  { key: 'markets', label: 'Markets' },
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'calendar', label: 'Calendar' },
];

const IMPORTANCE_TONE: Record<CalendarEventImportance, string> = {
  high: 'bg-warn',
  medium: 'bg-info',
  low: 'bg-fg-dim',
};

function formatScheduled(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CalendarRow({ event }: { event: CalendarEvent }) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto] items-baseline gap-3 px-1 py-1.5 text-[12px]">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${IMPORTANCE_TONE[event.importance]}`}
        aria-label={`${event.importance} importance`}
      />
      <span className="truncate text-fg">{event.name}</span>
      <span className="font-mono-tnum text-[10px] text-fg-muted whitespace-nowrap">
        {formatScheduled(event.scheduledFor)}
      </span>
      <span className="font-mono-tnum text-[10px] text-fg-dim whitespace-nowrap">
        {relativeTime(event.scheduledFor)}
      </span>
    </li>
  );
}

export function NewsPanel({ news, calendar, loading = false }: Props) {
  const [tab, setTab] = useState<TabKey>('all');
  const [fetchedNews, setFetchedNews] = useState<NewsItem[]>([]);
  const [fetchedCalendar, setFetchedCalendar] = useState<CalendarEvent[]>([]);
  const [fetchingSupplemental, setFetchingSupplemental] = useState(false);

  useEffect(() => {
    if (news.length > 0 && calendar.length > 0) return;

    let cancelled = false;
    setFetchingSupplemental(true);

    Promise.allSettled([
      news.length > 0 ? Promise.resolve(news) : getHeadlines({ limit: 8 }),
      calendar.length > 0 ? Promise.resolve(calendar) : getCalendar({ limit: 5 }),
    ])
      .then(([headlinesResult, eventsResult]) => {
        if (cancelled) return;
        if (headlinesResult.status === 'fulfilled') setFetchedNews(headlinesResult.value);
        if (eventsResult.status === 'fulfilled') setFetchedCalendar(eventsResult.value);
      })
      .finally(() => {
        if (!cancelled) setFetchingSupplemental(false);
      });

    return () => {
      cancelled = true;
    };
  }, [calendar, news]);

  const visibleNews = news.length > 0 ? news : fetchedNews;
  const visibleCalendar = calendar.length > 0 ? calendar : fetchedCalendar;
  const panelLoading = loading || (fetchingSupplemental && visibleNews.length === 0 && visibleCalendar.length === 0);

  const filteredNews = useMemo(() => {
    if (tab === 'calendar') return [];
    if (tab === 'all') return visibleNews;
    return visibleNews.filter((item) => item.category === tab);
  }, [visibleNews, tab]);

  const calendarVisible = tab === 'calendar';
  const empty = calendarVisible ? visibleCalendar.length === 0 : filteredNews.length === 0;

  return (
    <section
      aria-label="Newsroom and economic calendar"
      className="mt-4 flex flex-col gap-3 border border-line rounded-md bg-surface-1/40 p-3 sm:p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-fg-dim" aria-hidden="true" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Newsroom</p>
            <h2 className="text-base font-semibold tracking-tight text-fg">Headlines &amp; calendar</h2>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="News categories">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                className={`rounded-sm border px-2 py-1 text-[11px] uppercase tracking-wider transition-colors ${
                  active
                    ? 'border-line-strong bg-surface-2 text-fg'
                    : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                }`}
              >
                {t.key === 'calendar' ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                    {t.label}
                  </span>
                ) : (
                  t.label
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {panelLoading ? (
        <p className="text-[12px] text-fg-dim">Loading…</p>
      ) : empty ? (
        <p className="text-[12px] text-fg-dim">
          {calendarVisible ? 'No upcoming events.' : 'No headlines in this category yet.'}
        </p>
      ) : calendarVisible ? (
        <ul className="grid gap-0.5">
          {visibleCalendar.map((event) => (
            <CalendarRow key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <ul className="grid gap-0.5">
          {filteredNews.map((item) => (
            <NewsRow key={`${item.sourceId}-${item.url}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
