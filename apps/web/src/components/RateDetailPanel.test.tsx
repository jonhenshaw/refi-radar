import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RateDetailPanel, calculateTrendStats } from './RateDetailPanel';

const points = [
  { date: '2026-05-01', rate: 6.72 },
  { date: '2026-05-02', rate: 6.68 },
  { date: '2026-05-03', rate: 6.61 },
  { date: '2026-05-04', rate: 6.54 },
];

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
    expect(screen.getAllByText('6.54%').length).toBeGreaterThan(0);
    expect(screen.getByText('-18 bps')).toBeInTheDocument();
    expect(screen.getAllByText('Downtrend').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /MND 30Y Fixed historical rate trend/i })).toBeInTheDocument();
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
