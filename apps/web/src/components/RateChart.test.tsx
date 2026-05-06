import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RateChart } from './RateChart';
import type { RateSeries } from '../lib/api';

const series: RateSeries[] = [
  {
    sourceId: 'mnd_30y_fixed',
    label: 'MND 30Y Fixed',
    color: '#1D9BF0',
    points: [
      { date: '2026-05-01', rate: 6.6 },
      { date: '2026-05-02', rate: 6.54 },
    ],
  },
];

describe('RateChart', () => {
  it('lets users inspect a populated chart when an inspect handler is provided', () => {
    const onInspect = vi.fn();

    render(<RateChart series={series} onInspect={onInspect} />);

    fireEvent.click(screen.getByRole('button', { name: /open mortgage rate history chart/i }));

    expect(onInspect).toHaveBeenCalledTimes(1);
  });
});
