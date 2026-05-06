import { describe, expect, it } from 'vitest';

import { breakEvenMonths, monthlyPayment, monthlySavings } from './finance';

describe('finance utilities', () => {
  it('calculates a standard mortgage payment rounded to cents', () => {
    expect(monthlyPayment(300_000, 6.5, 360)).toBe(1896.2);
  });

  it('handles a zero-rate loan payment as principal divided by months', () => {
    expect(monthlyPayment(120_000, 0, 360)).toBe(333.33);
  });

  it('calculates monthly savings from current and new payments', () => {
    expect(monthlySavings(2_500, 2_100.25)).toBe(399.75);
  });

  it('calculates break-even months rounded up', () => {
    expect(breakEvenMonths(5_000, 399.75)).toBe(13);
  });

  it('returns Infinity for break-even months when savings are not positive', () => {
    expect(breakEvenMonths(5_000, 0)).toBe(Infinity);
    expect(breakEvenMonths(5_000, -50)).toBe(Infinity);
  });
});
