import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { RateIntel } from '@refi-radar/shared';
import { buildRateIntel } from '@refi-radar/shared';

import { IntelStrip } from './IntelStrip';

function makeIntel(): RateIntel {
  return buildRateIntel({
    sources: [
      {
        sourceId: 'mnd_30y_fixed',
        observedAt: '2026-05-08',
        fetchedAt: '2026-05-08T12:00:00.000Z',
        rate: 6.5,
        confidence: 'market_estimate',
      },
      {
        sourceId: 'fred_mortgage30us',
        observedAt: '2026-05-08',
        fetchedAt: '2026-05-08T12:00:00.000Z',
        rate: 6.7,
        confidence: 'weekly_survey',
      },
      {
        sourceId: 'fred_dgs10',
        observedAt: '2026-05-08',
        fetchedAt: '2026-05-08T12:00:00.000Z',
        rate: 4.3,
        confidence: 'proxy',
      },
    ],
    health: [
      { sourceId: 'mnd_30y_fixed', ok: true, stale: false },
      { sourceId: 'fred_mortgage30us', ok: true, stale: false },
      { sourceId: 'fred_dgs10', ok: true, stale: false },
    ],
    mortgageHistory: [
      { date: '2026-04-08', rate: 6.8 },
      { date: '2026-05-08', rate: 6.5 },
    ],
    treasuryHistory: [
      { date: '2026-04-08', rate: 4.2 },
      { date: '2026-05-08', rate: 4.3 },
    ],
    now: new Date('2026-05-08T12:00:00.000Z'),
  });
}

describe('IntelStrip', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders labeled intel values with source metadata', () => {
    render(<IntelStrip intel={makeIntel()} />);
    const mobile = within(screen.getByTestId('intel-strip-mobile'));
    expect(screen.getByText('Rate intel')).toBeInTheDocument();
    expect(mobile.getByText('6.50%')).toBeInTheDocument();
    expect(mobile.getByText('220 bps')).toBeInTheDocument();
    expect(mobile.getAllByText(/market estimate/i).length).toBeGreaterThan(0);
  });

  it('shows unavailable messaging instead of inventing values', () => {
    render(
      <IntelStrip
        intel={buildRateIntel({
          sources: [],
          health: [],
          now: new Date('2026-05-08T12:00:00.000Z'),
        })}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No observations collected yet/i).length).toBeGreaterThan(0);
  });

  it('uses mobile section labels for stacked layout', () => {
    render(<IntelStrip intel={makeIntel()} />);
    const mobile = within(screen.getByTestId('intel-strip-mobile'));
    expect(mobile.getByText('Spot rates')).toBeInTheDocument();
    expect(mobile.getByText('Spread context')).toBeInTheDocument();
  });
});
