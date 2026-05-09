import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarEvent, NewsItem } from '@refi-radar/shared';

import { getCalendar, getHeadlines } from '../../lib/api';
import { NewsPanel } from './NewsPanel';


vi.mock('../../lib/api', () => ({
  getCalendar: vi.fn(async () => []),
  getHeadlines: vi.fn(async () => []),
}));

beforeEach(() => {
  vi.mocked(getCalendar).mockResolvedValue([]);
  vi.mocked(getHeadlines).mockResolvedValue([]);
});

afterEach(cleanup);

const news: NewsItem[] = [
  {
    sourceId: 'fed_press',
    headline: 'Fed holds rates steady',
    url: 'https://example.com/fed',
    publishedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    fetchedAt: new Date().toISOString(),
    category: 'fed',
  },
  {
    sourceId: 'cnbc_bonds',
    headline: '10-year yield slips',
    url: 'https://example.com/cnbc',
    publishedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    fetchedAt: new Date().toISOString(),
    category: 'markets',
  },
];

const calendar: CalendarEvent[] = [
  {
    id: 'demo_cpi',
    sourceId: 'curated_calendar',
    name: 'CPI release',
    scheduledFor: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    kind: 'cpi',
    importance: 'high',
  },
];

describe('NewsPanel', () => {
  it('renders all headlines on the All tab by default', () => {
    render(<NewsPanel news={news} calendar={calendar} />);
    expect(screen.getByText('Fed holds rates steady')).toBeInTheDocument();
    expect(screen.getByText('10-year yield slips')).toBeInTheDocument();
  });

  it('filters headlines by category when a tab is selected', () => {
    render(<NewsPanel news={news} calendar={calendar} />);
    fireEvent.click(screen.getByRole('button', { name: /^Fed$/i }));
    expect(screen.getByText('Fed holds rates steady')).toBeInTheDocument();
    expect(screen.queryByText('10-year yield slips')).not.toBeInTheDocument();
  });

  it('shows calendar entries on the Calendar tab', () => {
    render(<NewsPanel news={news} calendar={calendar} />);
    fireEvent.click(screen.getByRole('button', { name: /Calendar/i }));
    expect(screen.getByText('CPI release')).toBeInTheDocument();
    expect(screen.queryByText('Fed holds rates steady')).not.toBeInTheDocument();
  });

  it('renders an empty-state message when nothing matches the active tab', async () => {
    render(<NewsPanel news={[]} calendar={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Calendar/i }));
    expect(await screen.findByText(/No upcoming events/i)).toBeInTheDocument();
  });

  it('falls back to provided sample data when both snapshot and api return empty', async () => {
    render(
      <NewsPanel
        news={[]}
        calendar={[]}
        fallbackNews={[news[0]]}
        fallbackCalendar={calendar}
      />,
    );

    expect(await screen.findByText('Fed holds rates steady')).toBeInTheDocument();
    expect(screen.getByText(/Sample feed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Calendar/i }));
    expect(await screen.findByText('CPI release')).toBeInTheDocument();
  });

  it('loads missing headlines and calendar from the dedicated endpoints', async () => {
    vi.mocked(getHeadlines).mockResolvedValue([news[0]]);
    vi.mocked(getCalendar).mockResolvedValue(calendar);

    render(<NewsPanel news={[]} calendar={[]} />);

    expect(await screen.findByText('Fed holds rates steady')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Calendar/i }));
    expect(await screen.findByText('CPI release')).toBeInTheDocument();
  });
});
