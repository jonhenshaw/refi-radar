import { breakEvenMonths, monthlyPayment, monthlySavings } from '@refi-radar/shared';
import { Hono } from 'hono';
import type { Env } from '../env';

interface RefiPayload {
  currentBalance: number;
  currentRate: number;
  remainingMonths: number;
  newRate: number;
  closingCosts: number;
}

export const refiRoutes = new Hono<{ Bindings: Env }>();

refiRoutes.post('/refi/calculate', async (c) => {
  let payload: Partial<RefiPayload>;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  if (!isValidPayload(payload)) {
    return c.json({ error: 'invalid_refi_payload' }, 400);
  }

  const currentPayment = monthlyPayment(payload.currentBalance, payload.currentRate, payload.remainingMonths);
  const newPayment = monthlyPayment(payload.currentBalance, payload.newRate, payload.remainingMonths);
  const savings = monthlySavings(currentPayment, newPayment);

  const breakEven = breakEvenMonths(payload.closingCosts, savings);

  return c.json({
    currentPayment: roundMoney(currentPayment),
    newPayment: roundMoney(newPayment),
    monthlySavings: roundMoney(savings),
    breakEvenMonths: Number.isFinite(breakEven) ? breakEven : null,
  });
});

function isValidPayload(payload: Partial<RefiPayload>): payload is RefiPayload {
  return (
    isPositive(payload.currentBalance) &&
    isNonNegative(payload.currentRate) &&
    Number.isInteger(payload.remainingMonths) &&
    Number(payload.remainingMonths) > 0 &&
    isNonNegative(payload.newRate) &&
    isNonNegative(payload.closingCosts)
  );
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
