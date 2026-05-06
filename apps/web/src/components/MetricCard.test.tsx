import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
