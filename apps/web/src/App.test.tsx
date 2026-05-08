import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LatestSnapshot } from '@refi-radar/shared';
import type { RangeKey, RateSeries } from './lib/api';
import App from './App';

const getLatestMock = vi.hoisted(() => vi.fn<() => Promise<LatestSnapshot>>());
const getCompareSeriesMock = vi.hoisted(() => vi.fn<(range?: RangeKey) => Promise<RateSeries[]>>());

vi.mock('./lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api')>();
  return {
    ...actual,
    getLatest: getLatestMock,
    getCompareSeries: getCompareSeriesMock,
  };
});

const latest: LatestSnapshot = {
  primary: {
    sourceId: 'mnd_30y_fixed',
    observedAt: '2026-05-08T12:00:00.000Z',
    fetchedAt: '2026-05-08T12:00:00.000Z',
    rate: 6.5,
    confidence: 'market_estimate',
  },
  sources: [
    {
      sourceId: 'mnd_30y_fixed',
      observedAt: '2026-05-08T12:00:00.000Z',
      fetchedAt: '2026-05-08T12:00:00.000Z',
      rate: 6.5,
      confidence: 'market_estimate',
    },
    {
      sourceId: 'fred_dgs10',
      observedAt: '2026-05-08T12:00:00.000Z',
      fetchedAt: '2026-05-08T12:00:00.000Z',
      rate: 4.3,
      confidence: 'proxy',
    },
  ],
  health: [],
  news: [],
  calendar: [],
};

function makeMndSeries(range: RangeKey, startRate: number, endRate: number): RateSeries[] {
  const series: RateSeries[] = [
    {
      sourceId: 'mnd_30y_fixed',
      label: 'MND 30Y Fixed',
      color: '#1D9BF0',
      points: [
        { date: '2026-04-08', rate: startRate },
        { date: '2026-04-18', rate: startRate + (endRate - startRate) / 3 },
        { date: '2026-04-28', rate: startRate + ((endRate - startRate) * 2) / 3 },
        { date: '2026-05-08', rate: endRate },
      ],
    },
    {
      sourceId: 'fred_dgs10',
      label: '10Y Treasury',
      color: '#8B5CF6',
      points: [
        { date: '2026-04-08', rate: 4.2 },
        { date: '2026-05-08', rate: 4.3 },
      ],
    },
  ];
  return series.map((item) => ({ ...item, label: `${item.label} ${range}` }));
}

describe('App', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps key-stat trend metrics independent from the selected chart timeframe', async () => {
    getLatestMock.mockResolvedValue(latest);
    getCompareSeriesMock.mockImplementation(async (range = '1M') => {
      if (range === 'MAX') return makeMndSeries('MAX', 6.8, 6.5);
      if (range === '5D') return makeMndSeries('5D', 6.4, 6.7);
      return makeMndSeries(range, 6.1, 6.4);
    });

    render(<App />);

    await waitFor(() => expect(getCompareSeriesMock).toHaveBeenCalledWith('MAX'));
    const trendCard = screen.getByText('Trend 30d').closest('article');
    expect(trendCard).not.toBeNull();
    expect(within(trendCard as HTMLElement).getByText('−1.00/day')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '5D' }));

    await waitFor(() => expect(getCompareSeriesMock).toHaveBeenCalledWith('5D'));
    expect(within(trendCard as HTMLElement).getByText('−1.00/day')).toBeInTheDocument();
    expect(within(trendCard as HTMLElement).queryByText('+1.00/day')).not.toBeInTheDocument();
  });
});
