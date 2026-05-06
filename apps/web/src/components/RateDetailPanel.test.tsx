import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RateDetailPanel, calculateTrendStats } from './RateDetailPanel';

const points = [
  { date: '2026-05-01', rate: 6.72 },
  { date: '2026-05-02', rate: 6.68 },
  { date: '2026-05-03', rate: 6.61 },
  { date: '2026-05-04', rate: 6.54 },
];

afterEach(() => cleanup());

describe('RateDetailPanel', () => {
  it('shows selected source history, trend stats, and latest value', () => {
    render(
      <RateDetailPanel
        label="MND 30Y Fixed"
        sourceId="mnd_30y_fixed"
        series={{ sourceId: 'mnd_30y_fixed', label: 'MND 30Y Fixed', color: '#1D9BF0', points }}
        latest={{ sourceId: 'mnd_30y_fixed', observedAt: '2026-05-04T17:00:00Z', fetchedAt: '2026-05-04T17:01:00Z', rate: 6.54, changeBps: -7, confidence: 'market_estimate' }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole('dialog', { name: /MND 30Y Fixed details/i })).toBeInTheDocument();
    expect(screen.getByText('6.54% latest')).toBeInTheDocument();
    expect(screen.getByText('-18 bps')).toBeInTheDocument();
    expect(screen.getAllByText('Downtrend').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /MND 30Y Fixed historical rate trend/i })).toBeInTheDocument();
  });

  it('places the single-source graph before compact metric chips', () => {
    render(
      <RateDetailPanel
        label="MND 30Y Fixed"
        sourceId="mnd_30y_fixed"
        series={{ sourceId: 'mnd_30y_fixed', label: 'MND 30Y Fixed', color: '#1D9BF0', points }}
        latest={{ sourceId: 'mnd_30y_fixed', observedAt: '2026-05-04T17:00:00Z', fetchedAt: '2026-05-04T17:01:00Z', rate: 6.54, changeBps: -7, confidence: 'market_estimate' }}
        onClose={() => undefined}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /MND 30Y Fixed details/i });
    const chart = screen.getByRole('img', { name: /MND 30Y Fixed historical rate trend/i });
    const summary = screen.getByLabelText(/MND 30Y Fixed summary/i);

    expect(dialog.querySelector('.rate-detail-topline')).toHaveTextContent('MND 30Y Fixed');
    expect(summary).toHaveClass('rate-detail-compact-summary');
    expect(chart.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('6.54% latest')).toBeInTheDocument();
    expect(screen.getByText('-18 bps')).toBeInTheDocument();
    expect(screen.getByText('High 6.72%')).toBeInTheDocument();
    expect(screen.getByText('Low 6.54%')).toBeInTheDocument();
  });

  it('calculates trend stats for the selected series', () => {
    expect(calculateTrendStats(points)).toEqual({
      latest: 6.54,
      first: 6.72,
      high: 6.72,
      low: 6.54,
      changeBps: -18,
      direction: 'down',
    });
  });
});
