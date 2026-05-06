import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefiCalculator, calculateRefiScenario } from './RefiCalculator';

describe('calculateRefiScenario', () => {
  it('calculates payments, monthly savings, and break-even month', () => {
    const result = calculateRefiScenario({
      balance: 400_000,
      currentRate: 7,
      newRate: 6,
      termYears: 30,
      closingCosts: 4_000,
    });

    expect(result.currentPayment).toBeCloseTo(2661.21, 1);
    expect(result.newPayment).toBeCloseTo(2398.20, 1);
    expect(result.monthlySavings).toBeCloseTo(263.01, 1);
    expect(result.breakEvenMonths).toBe(16);
  });
});

describe('RefiCalculator', () => {
  it('updates the refinance summary when inputs change', () => {
    render(<RefiCalculator suggestedRate={6} />);

    fireEvent.change(screen.getByLabelText(/loan balance/i), { target: { value: '400000' } });
    fireEvent.change(screen.getByLabelText(/current rate/i), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/new rate/i), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/closing costs/i), { target: { value: '4000' } });

    const summary = screen.getByTestId('refi-summary');
    expect(within(summary).getByText('$2,661')).toBeInTheDocument();
    expect(within(summary).getByText('$2,398')).toBeInTheDocument();
    expect(within(summary).getByText('$263/mo')).toBeInTheDocument();
    expect(within(summary).getByText('16 months')).toBeInTheDocument();
  });
});
