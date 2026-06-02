import { describe, expect, it, vi } from 'vitest';
import type { LocalAlertRule } from '@refi-radar/shared';
import { app } from '../index';

interface DbCall {
  sql: string;
  params: unknown[];
}

function makeDb() {
  const calls: DbCall[] = [];
  return {
    calls,
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => ({ results: [] })),
        run: vi.fn(async () => {
          calls.push({ sql, params });
          return { success: true, meta: { changes: 1 } };
        }),
      })),
    })),
  };
}

const breakEvenRule: LocalAlertRule = {
  id: 'r_break_even',
  sourceId: 'mnd_30y_fixed',
  type: 'break_even_below_months',
  threshold: 24,
  enabled: true,
  cooldownMinutes: 360,
  createdAt: '2026-05-08T12:00:00.000Z',
};

describe('notification routes', () => {
  it('syncs break-even rules and loan profile context for push evaluation', async () => {
    const db = makeDb();

    const res = await app.fetch(
      new Request('http://localhost/api/notifications/rules', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_1',
          rules: [breakEvenRule],
          loanProfile: {
            currentBalance: 425000,
            currentRate: 7.15,
            remainingMonths: 360,
            closingCosts: 4500,
            targetRate: 6.25,
          },
        }),
      }),
      { DB: db as unknown as D1Database },
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, synced: 1 });

    const alertInsert = db.calls.find((call) => call.sql.includes('INSERT INTO alert_rules'));
    expect(alertInsert?.params).toEqual([
      'r_break_even',
      'user_1',
      'mnd_30y_fixed',
      'break_even_below_months',
      24,
      null,
      1,
      360,
      null,
      '2026-05-08T12:00:00.000Z',
    ]);

    const profileUpsert = db.calls.find((call) => call.sql.includes('INSERT INTO loan_profiles'));
    expect(profileUpsert?.params).toEqual(['user_1', 'user_1', 425000, 7.15, 360, 4500, 6.25]);
  });

  it('rejects invalid synced loan profile context', async () => {
    const db = makeDb();
    const res = await app.fetch(
      new Request('http://localhost/api/notifications/rules', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_1',
          rules: [breakEvenRule],
          loanProfile: {
            currentBalance: -1,
            currentRate: 7.15,
            remainingMonths: 360,
            closingCosts: 4500,
          },
        }),
      }),
      { DB: db as unknown as D1Database },
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_loan_profile' });
    expect(db.calls).toHaveLength(0);
  });
});
