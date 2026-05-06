function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function monthlyPayment(principal: number, annualRatePercent: number, months: number): number {
  if (principal < 0 || annualRatePercent < 0 || months <= 0) {
    throw new Error('Invalid loan inputs');
  }

  if (annualRatePercent === 0) {
    return roundToCents(principal / months);
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  const factor = (1 + monthlyRate) ** months;
  return roundToCents(principal * ((monthlyRate * factor) / (factor - 1)));
}

export function monthlySavings(currentPayment: number, newPayment: number): number {
  return roundToCents(currentPayment - newPayment);
}

export function breakEvenMonths(closingCosts: number, savings: number): number {
  if (closingCosts < 0) {
    throw new Error('Invalid closing costs');
  }
  if (savings <= 0) {
    return Infinity;
  }
  return Math.ceil(closingCosts / savings);
}
