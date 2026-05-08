import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { LatestSnapshot } from '@refi-radar/shared';

import { TickerBar } from './TickerBar';

afterEach(cleanup);

const mockSnapshot: LatestSnapshot = {
  primary: {
    sourceId: 'mnd_30y_fixed',
    observedAt: '2026-05-08T00:00:00Z',
    fetchedAt: '2026-05-08T00:00:00Z',
    rate: 6.72,
    changeBps: -7,
    confidence: 'market_estimate',
  },
  sources: [
    {
      sourceId: 'mnd_30y_fixed',
      observedAt: '2026-05-08T00:00:00Z',
      fetchedAt: '2026-05-08T00:00:00Z',
      rate: 6.72,
      changeBps: -7,
      confidence: 'market_estimate',
    },
    {
      sourceId: 'fred_t10y2y',
      observedAt: '2026-05-08T00:00:00Z',
      fetchedAt: '2026-05-08T00:00:00Z',
      rate: 0.43,
      changeBps: -1,
      confidence: 'proxy',
    },
  ],
  health: [],
};

describe('TickerBar', () => {
  it('renders a region landmark labelled Live rates ticker', () => {
    render(<TickerBar snapshot={mockSnapshot} />);
    const region = screen.getByRole('region', { name: /live rates ticker/i });
    expect(region).toBeInTheDocument();
  });

  it('formats rate cells with monospaced numerics and shows the spread cell as bps', () => {
    render(<TickerBar snapshot={mockSnapshot} />);
    const region = screen.getByRole('region', { name: /live rates ticker/i });
    expect(within(region).getAllByText(/6\.72%/).length).toBeGreaterThan(0);
    expect(within(region).getAllByText(/\+43 bps/).length).toBeGreaterThan(0);
  });

  it('exposes a sr-only summary list for screen readers', () => {
    const { container } = render(<TickerBar snapshot={mockSnapshot} />);
    const dl = container.querySelector('dl.sr-only');
    expect(dl).not.toBeNull();
    expect(dl?.querySelectorAll('dt').length).toBeGreaterThan(0);
  });

  it('falls back to em-dash when an observation is missing', () => {
    const empty: LatestSnapshot = { primary: undefined, sources: [], health: [] };
    render(<TickerBar snapshot={empty} />);
    const region = screen.getByRole('region', { name: /live rates ticker/i });
    expect(within(region).getAllByText('—').length).toBeGreaterThan(0);
  });
});
