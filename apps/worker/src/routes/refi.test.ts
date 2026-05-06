import { describe, expect, it } from 'vitest';
import app from '../index';

describe('refi route', () => {
  it('calculates refinance payment metrics', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/refi/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentBalance: 650000,
          currentRate: 7.125,
          remainingMonths: 330,
          newRate: 6.375,
          closingCosts: 5200,
        }),
      }),
      {},
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      currentPayment: 4496.88,
      newPayment: 4180.73,
      monthlySavings: 316.15,
      breakEvenMonths: 17,
    });
  });

  it('rejects invalid payloads', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/refi/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentBalance: -1, currentRate: 7, remainingMonths: 360, newRate: 6, closingCosts: 1000 }),
      }),
      {},
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_refi_payload' });
  });

  it('returns a JSON-safe null break-even when refinance does not save money', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/refi/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentBalance: 300000, currentRate: 6, remainingMonths: 360, newRate: 7, closingCosts: 1000 }),
      }),
      {},
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ breakEvenMonths: null });
  });
});
