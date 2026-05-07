import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RateSeries } from '../../lib/api';
import { RateChart } from './RateChart';

const seriesFixture: RateSeries[] = [
  {
    sourceId: 'mnd_30y_fixed',
    label: 'MND 30Y Fixed',
    color: '#1D9BF0',
    points: Array.from({ length: 12 }, (_, i) => ({
      date: `2026-0${(i % 9) + 1}-0${(i % 28) + 1}`.replace(/-0(\d\d)/, '-$1'),
      rate: 6.5 + Math.sin(i / 3) * 0.1,
    })),
  },
  {
    sourceId: 'fred_mortgage30us',
    label: 'FRED Survey',
    color: '#2ED47A',
    points: Array.from({ length: 12 }, (_, i) => ({
      date: `2026-0${(i % 9) + 1}-0${(i % 28) + 1}`.replace(/-0(\d\d)/, '-$1'),
      rate: 6.7 + Math.cos(i / 4) * 0.05,
    })),
  },
];

describe('RateChart', () => {
  it('renders the SVG once data is available', async () => {
    render(<RateChart series={seriesFixture} />);
    await waitFor(() => expect(screen.getByRole('img', { name: /mortgage rate history chart/i })).toBeInTheDocument());
  });

  it('renders a skeleton when loading', () => {
    const { container } = render(<RateChart series={[]} loading />);
    expect(container.querySelector('.chart-skeleton')).toBeInTheDocument();
  });

  it('renders an empty state when there are no points', () => {
    render(<RateChart series={[]} />);
    expect(screen.getByText(/no rate history available/i)).toBeInTheDocument();
  });

  it('shows a tooltip on pointermove', async () => {
    const { container } = render(<RateChart series={seriesFixture} />);
    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument());
    const frame = container.querySelector('.chart-frame') as HTMLElement;

    fireEvent.pointerMove(frame, { clientX: 460, clientY: 100, pointerType: 'mouse', buttons: 0 });

    await waitFor(() => {
      expect(container.querySelector('.chart-tooltip')).toBeInTheDocument();
    });
  });

  it('shows a Reset zoom chip after a mouse drag-to-zoom', async () => {
    const { container } = render(<RateChart series={seriesFixture} />);
    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument());
    const frame = container.querySelector('.chart-frame') as HTMLElement;

    fireEvent.pointerDown(frame, { clientX: 200, clientY: 100, pointerType: 'mouse', button: 0, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 600, clientY: 100, pointerType: 'mouse', buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(frame, { clientX: 600, clientY: 100, pointerType: 'mouse', pointerId: 1 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reset zoom/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /reset zoom/i })).not.toBeInTheDocument();
    });
  });

  it('moves the scrub on ArrowRight key press', async () => {
    const { container } = render(<RateChart series={seriesFixture} />);
    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument());
    const frame = container.querySelector('.chart-frame') as HTMLElement;

    fireEvent.keyDown(frame, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(container.querySelector('.chart-tooltip')).toBeInTheDocument();
    });
  });
});
