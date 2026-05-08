import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RateObservation } from '@refi-radar/shared';
import type { RateSeries } from '../lib/api';
import { Hero } from './Hero';

const primary: RateObservation = {
  sourceId: 'mnd_30y_fixed',
  observedAt: '2026-05-07T18:00:00.000Z',
  fetchedAt: '2026-05-07T18:00:00.000Z',
  rate: 6.44,
  confidence: 'market_estimate',
};

const primarySeries: RateSeries = {
  sourceId: 'mnd_30y_fixed',
  label: 'MND 30Y Fixed',
  color: '#1D9BF0',
  points: [
    { date: '2026-05-06', rate: 6.46 },
    { date: '2026-05-07', rate: 6.44 },
  ],
};

describe('Hero', () => {
  it('falls back to series data when the latest snapshot lacks a 1d change', () => {
    render(
      <Hero
        primary={primary}
        primarySeries={primarySeries}
        treasurySeries={undefined}
        freshnessText="Updated 2:00 PM"
        loading={false}
      />,
    );

    expect(screen.getByText(/2 bps/)).toBeInTheDocument();
  });
});
