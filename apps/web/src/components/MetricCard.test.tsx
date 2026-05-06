import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('formats mortgage rates and positive basis-point changes', () => {
    render(
      <MetricCard
        label="MND 30Y Fixed"
        value={6.847}
        changeBps={12}
        meta="Updated now"
      />,
    );

    expect(screen.getByText('MND 30Y Fixed')).toBeInTheDocument();
    expect(screen.getByText('6.85%')).toBeInTheDocument();
    expect(screen.getByText('+12 bps')).toBeInTheDocument();
    expect(screen.getByText('+12 bps')).toHaveClass('text-red-300');
  });

  it('renders unavailable values gracefully', () => {
    render(<MetricCard label="Missing source" value={undefined} changeBps={undefined} />);

    expect(screen.getByText('Missing source')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('can be clicked to request a detailed source history view', async () => {
    const onSelect = vi.fn();
    render(<MetricCard label="MND 30Y Fixed" value={6.54} changeBps={-2} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /view MND 30Y Fixed history/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
