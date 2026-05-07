import { fireEvent, render, screen, within, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

import type { LatestSnapshot } from '@refi-radar/shared';

import { MobileDashboard } from './MobileDashboard';
import type { RateSeries, RangeKey } from '../lib/api';

const latest: LatestSnapshot = {
  primary: {
    sourceId: 'mnd_30y_fixed',
    observedAt: '2026-05-05T17:28:45.499Z',
    fetchedAt: '2026-05-05T17:40:45.499Z',
    rate: 6.54,
    changeBps: -2,
    confidence: 'market_estimate',
  },
  sources: [
    {
      sourceId: 'mnd_30y_fixed',
      observedAt: '2026-05-05T17:28:45.499Z',
      fetchedAt: '2026-05-05T17:40:45.499Z',
      rate: 6.54,
      changeBps: -2,
      confidence: 'market_estimate',
    },
    {
      sourceId: 'fred_mortgage30us',
      observedAt: '2026-04-30',
      fetchedAt: '2026-05-05T17:40:45.499Z',
      rate: 6.3,
      confidence: 'weekly_survey',
    },
    {
      sourceId: 'fred_dgs10',
      observedAt: '2026-05-04',
      fetchedAt: '2026-05-05T17:40:45.499Z',
      rate: 4.45,
      confidence: 'proxy',
    },
  ],
  health: [
    { sourceId: 'mnd_30y_fixed', ok: true, stale: false, lastSuccessAt: '2026-05-05T17:40:45.499Z' },
    { sourceId: 'fred_mortgage30us', ok: true, stale: false, lastSuccessAt: '2026-05-05T17:40:45.499Z' },
    { sourceId: 'fred_dgs10', ok: true, stale: false, lastSuccessAt: '2026-05-05T17:40:45.499Z' },
  ],
};

const series: RateSeries[] = [
  {
    sourceId: 'mnd_30y_fixed',
    label: 'MND 30Y Fixed',
    color: '#1D9BF0',
    points: [
      { date: '2025-05-06', rate: 6.91 },
      { date: '2025-08-06', rate: 6.75 },
      { date: '2026-01-06', rate: 6.43 },
      { date: '2026-05-05', rate: 6.54 },
    ],
  },
];

afterEach(() => cleanup());

describe('MobileDashboard', () => {
  it('renders a dense mobile market ticker with spaced numeric typography', () => {
    render(
      <MobileDashboard
        latest={latest}
        series={series}
        range="1Y"
        onRangeChange={vi.fn()}
        onSelectSource={vi.fn()}
        onInspectChart={vi.fn()}
        usingDemo={false}
        loading={false}
      />,
    );

    const dashboard = screen.getByRole('region', { name: /mobile rate dashboard/i });
    expect(dashboard).toBeInTheDocument();
    const heroRate = within(dashboard).getByLabelText('6.54 percent');
    expect(within(heroRate).getByText('6.54')).toHaveClass('mobile-rate-number');
    expect(within(heroRate).getByText('%')).toHaveClass('mobile-rate-symbol');
    expect(screen.getByText('Target gap')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.getAllByText('bps').length).toBeGreaterThan(0);
    expect(screen.getByText('12M low')).toBeInTheDocument();
    expect(screen.getByText('6.43')).toBeInTheDocument();
  });

  it('updates the trend label to match the active date range', () => {
    const labels: Record<RangeKey, RegExp> = {
      '1D': /1-day trend/i,
      '5D': /5-day trend/i,
      '1M': /1-month trend/i,
      '3M': /3-month trend/i,
      '1Y': /12-month trend/i,
      '5Y': /5-year trend/i,
      MAX: /full history/i,
    };

    for (const [range, label] of Object.entries(labels) as Array<[RangeKey, RegExp]>) {
      const { unmount } = render(
        <MobileDashboard
          latest={latest}
          series={series}
          range={range}
          onRangeChange={vi.fn()}
          onSelectSource={vi.fn()}
          onInspectChart={vi.fn()}
          usingDemo={false}
          loading={false}
        />,
      );

      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
      unmount();
    }
  });

  it('keeps graph, source rows, and range pills interactive', () => {
    const onRangeChange = vi.fn();
    const onSelectSource = vi.fn();
    const onInspectChart = vi.fn();

    render(
      <MobileDashboard
        latest={latest}
        series={series}
        range="1Y"
        onRangeChange={onRangeChange}
        onSelectSource={onSelectSource}
        onInspectChart={onInspectChart}
        usingDemo={false}
        loading={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /show 1M history/i }));
    expect(onRangeChange).toHaveBeenCalledWith('1M');

    fireEvent.click(screen.getByRole('button', { name: /open mortgage rate history chart/i }));
    expect(onInspectChart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /view MND 30Y Fixed details/i }));
    expect(onSelectSource).toHaveBeenCalledWith('mnd_30y_fixed');
  });
});
