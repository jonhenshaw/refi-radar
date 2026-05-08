import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarEvent, LatestSnapshot, NewsItem } from '@refi-radar/shared';

import App from './App';

const headline: NewsItem = {
  sourceId: 'fed_press',
  headline: 'Fed statement crosses the wire',
  url: 'https://example.com/fed-statement',
  publishedAt: '2026-05-08T12:00:00.000Z',
  fetchedAt: '2026-05-08T12:00:05.000Z',
  category: 'fed',
};

const calendarEvent: CalendarEvent = {
  id: 'cpi_20260512',
  sourceId: 'curated_calendar',
  name: 'CPI release (April)',
  scheduledFor: '2026-05-12T12:30:00.000Z',
  kind: 'cpi',
  importance: 'high',
};

const latestWithoutNewsroom: LatestSnapshot = {
  primary: {
    sourceId: 'mnd_30y_fixed',
    observedAt: '2026-05-08T12:00:00.000Z',
    fetchedAt: '2026-05-08T12:01:00.000Z',
    rate: 6.7,
    confidence: 'market_estimate',
  },
  sources: [
    {
      sourceId: 'mnd_30y_fixed',
      observedAt: '2026-05-08T12:00:00.000Z',
      fetchedAt: '2026-05-08T12:01:00.000Z',
      rate: 6.7,
      confidence: 'market_estimate',
    },
  ],
  health: [],
};

vi.mock('./lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api')>();
  return {
    ...actual,
    calculateRefi: vi.fn(),
    getCalendar: vi.fn(async () => [calendarEvent]),
    getCompareSeries: vi.fn(async () => []),
    getHeadlines: vi.fn(async () => [headline]),
    getLatest: vi.fn(async () => latestWithoutNewsroom),
  };
});

describe('App newsroom loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('loads headlines and calendar independently of the latest snapshot cache', async () => {
    render(<App />);

    expect(await screen.findByText('Fed statement crosses the wire')).toBeInTheDocument();

    screen.getByRole('button', { name: /Calendar/i }).click();

    expect(await screen.findByText('CPI release (April)')).toBeInTheDocument();
  });
});
