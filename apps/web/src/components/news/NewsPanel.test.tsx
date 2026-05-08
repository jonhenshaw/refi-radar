import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CalendarEvent, NewsItem } from '@refi-radar/shared';

import { NewsPanel } from './NewsPanel';

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

  it('renders an empty-state message when nothing matches the active tab', () => {
    render(<NewsPanel news={[]} calendar={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Calendar/i }));
    expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
  });
});
