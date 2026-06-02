import { Hono } from 'hono';
import type { LocalAlertRule } from '@refi-radar/shared';
import type { Env } from '../env';
import {
  dispatchDueRateAlerts,
  registerPushToken,
  replaceUserAlertRules,
  sendTestNotification,
  upsertUserLoanProfile,
  unregisterPushToken,
  type PushPlatform,
  type SyncedLoanProfile,
} from '../services/notifications';

export const notificationRoutes = new Hono<{ Bindings: Env }>();

notificationRoutes.post('/notifications/register', async (c) => {
  if (!c.env.DB) return c.json({ error: 'database not configured' }, 503);
  const body = await c.req.json<Partial<{ userId: string; deviceId: string; token: string; platform: PushPlatform }>>();
  if (!body.userId || !body.deviceId || !body.token || body.platform !== 'ios') {
    return c.json({ error: 'userId, deviceId, token, and platform=ios are required' }, 400);
  }

  await registerPushToken(c.env.DB, {
    userId: body.userId,
    deviceId: body.deviceId,
    token: body.token,
    platform: body.platform,
  });
  return c.json({ ok: true });
});

notificationRoutes.delete('/notifications/register', async (c) => {
  if (!c.env.DB) return c.json({ error: 'database not configured' }, 503);
  const body = await c.req.json<Partial<{ userId: string; deviceId: string; platform: PushPlatform }>>();
  if (!body.userId || !body.deviceId || body.platform !== 'ios') {
    return c.json({ error: 'userId, deviceId, and platform=ios are required' }, 400);
  }

  await unregisterPushToken(c.env.DB, body.userId, body.deviceId, body.platform);
  return c.json({ ok: true });
});

notificationRoutes.put('/notifications/rules', async (c) => {
  if (!c.env.DB) return c.json({ error: 'database not configured' }, 503);
  const body = await c.req.json<Partial<{ userId: string; rules: LocalAlertRule[]; loanProfile: SyncedLoanProfile }>>();
  if (!body.userId || !Array.isArray(body.rules)) {
    return c.json({ error: 'userId and rules[] are required' }, 400);
  }
  if (body.loanProfile !== undefined && !isValidLoanProfile(body.loanProfile)) {
    return c.json({ error: 'invalid_loan_profile' }, 400);
  }

  await replaceUserAlertRules(c.env.DB, body.userId, body.rules);
  if (body.loanProfile) await upsertUserLoanProfile(c.env.DB, body.userId, body.loanProfile);
  return c.json({ ok: true, synced: body.rules.length });
});

notificationRoutes.post('/notifications/test', async (c) => {
  const body = await c.req.json<Partial<{ userId: string }>>();
  if (!body.userId) return c.json({ error: 'userId is required' }, 400);
  const result = await sendTestNotification(c.env, body.userId);
  return c.json({ ok: true, ...result });
});

notificationRoutes.post('/notifications/dispatch', async (c) => {
  const auth = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!c.env.NOTIFICATION_ADMIN_TOKEN || auth !== c.env.NOTIFICATION_ADMIN_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const result = await dispatchDueRateAlerts(c.env);
  return c.json({ ok: true, ...result });
});

function isValidLoanProfile(value: SyncedLoanProfile): value is SyncedLoanProfile {
  return (
    isPositive(value.currentBalance) &&
    isNonNegative(value.currentRate) &&
    Number.isInteger(value.remainingMonths) &&
    value.remainingMonths > 0 &&
    isNonNegative(value.closingCosts) &&
    (value.targetRate === undefined || isNonNegative(value.targetRate))
  );
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
