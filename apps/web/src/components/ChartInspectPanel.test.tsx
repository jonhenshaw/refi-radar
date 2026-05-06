import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartInspectPanel } from './ChartInspectPanel';

const series = [
  {
    sourceId: 'mnd_30y_fixed' as const,
    label: 'MND 30Y Fixed',
    color: '#1D9BF0',
    points: [
      { date: '2026-05-01', rate: 6.5 },
      { date: '2026-05-02', rate: 6.54 },
    ],
  },
  {
    sourceId: 'fred_mortgage30us' as const,
    label: 'FRED Mortgage30US',
    color: '#16C784',
    points: [{ date: '2026-05-01', rate: 6.3 }],
  },
  {
    sourceId: 'fred_dgs10' as const,
    label: '10Y Treasury',
    color: '#A78BFA',
    points: [{ date: '2026-05-01', rate: 4.45 }],
  },
];

describe('ChartInspectPanel', () => {
  it('places the expanded graph before summary metrics in a dense inspector layout', () => {
    render(<ChartInspectPanel series={series} range="1M" onClose={() => undefined} />);

    const dialog = screen.getByRole('dialog', { name: /expanded mortgage rate history chart/i });
    const chart = within(dialog).getByRole('img', { name: /mortgage rate history chart/i });
    const summary = within(dialog).getByLabelText(/chart summary/i);

    expect(dialog.querySelector('.chart-inspect-topline')).toHaveTextContent('1M Trend');
    expect(summary).toHaveClass('chart-inspect-compact-summary');
    expect(chart.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(summary).getByText('6.54% latest')).toBeInTheDocument();
    expect(within(summary).getByText('3 feeds')).toBeInTheDocument();
    expect(within(summary).getByText('4 pts')).toBeInTheDocument();
  });

  it('uses compact range labels in the inspector title', () => {
    const { rerender } = render(<ChartInspectPanel series={series} range="5D" onClose={() => undefined} />);
    expect(screen.getByText('5D Trend')).toBeInTheDocument();

    rerender(<ChartInspectPanel series={series} range="3M" onClose={() => undefined} />);
    expect(screen.getByText('3M Trend')).toBeInTheDocument();

    rerender(<ChartInspectPanel series={series} range="1Y" onClose={() => undefined} />);
    expect(screen.getByText('1Y Trend')).toBeInTheDocument();
  });
});
