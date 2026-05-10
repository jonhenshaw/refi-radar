import { evaluateRules, type AlertEvent, type AlertRuleType, type LocalAlertRule, type RateSourceId } from '@refi-radar/shared';
import type { Env } from '../env';
import { getSeries } from '../db/queries';
import { getLatestSnapshot } from './latest';

export type PushPlatform = 'ios';

export interface PushRegistrationInput {
  userId: string;
  deviceId: string;
  token: string;
  platform: PushPlatform;
}

interface AlertRuleRow {
  id: string;
  user_id: string;
  source_id: string;
  rule_type: string;
  threshold: number | null;
  threshold_bps: number | null;
  enabled: number;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface UserRow {
  user_id: string;
}

interface PushTokenRow {
  token: string;
  platform: PushPlatform;
}

const APNS_PRODUCTION_URL = 'https://api.push.apple.com/3/device/';
const APNS_SANDBOX_URL = 'https://api.sandbox.push.apple.com/3/device/';

const RATE_RULE_TYPES = new Set<AlertRuleType>(['below_rate', 'above_rate', 'drop_from_recent_high_bps']);

export async function registerPushToken(db: D1Database, input: PushRegistrationInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO push_tokens (user_id, device_id, platform, token, enabled, updated_at)
       VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(device_id, platform) DO UPDATE SET
        user_id = excluded.user_id,
        token = excluded.token,
        enabled = 1,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(input.userId, input.deviceId, input.platform, input.token)
    .run();
}

export async function unregisterPushToken(db: D1Database, userId: string, deviceId: string, platform: PushPlatform): Promise<void> {
  await db
    .prepare(
      `UPDATE push_tokens
       SET enabled = 0, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND device_id = ? AND platform = ?`,
    )
    .bind(userId, deviceId, platform)
    .run();
}

export async function replaceUserAlertRules(db: D1Database, userId: string, rules: LocalAlertRule[]): Promise<void> {
  const existingTriggeredAt = await getExistingRuleTriggerTimes(db, userId);
  await db.prepare('DELETE FROM alert_rules WHERE user_id = ?').bind(userId).run();
  const rateRules = rules.filter((rule) => RATE_RULE_TYPES.has(rule.type));
  if (rateRules.length === 0) return;

  for (const rule of rateRules) {
    await db
      .prepare(
        `INSERT INTO alert_rules (
          id, user_id, source_id, rule_type, threshold, threshold_bps,
          enabled, cooldown_minutes, last_triggered_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        rule.id,
        userId,
        rule.sourceId,
        rule.type,
        rule.type === 'drop_from_recent_high_bps' ? null : rule.threshold,
        rule.type === 'drop_from_recent_high_bps' ? rule.threshold : null,
        rule.enabled ? 1 : 0,
        rule.cooldownMinutes,
        pickLatestTimestamp(rule.lastTriggeredAt, existingTriggeredAt.get(rule.id)),
        rule.createdAt,
      )
      .run();
  }
}

export async function sendTestNotification(env: Env, userId: string): Promise<{ sent: number; skipped: number }> {
  return sendUserNotification(env, userId, {
    title: 'Refi Radar notifications are on',
    body: 'You will get mortgage-rate alerts when your synced rules trigger.',
    data: { type: 'test' },
  });
}

async function getExistingRuleTriggerTimes(db: D1Database, userId: string): Promise<Map<string, string>> {
  const { results } = await db
    .prepare('SELECT id, last_triggered_at FROM alert_rules WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string; last_triggered_at: string | null }>();
  return new Map((results ?? []).flatMap((row) => (row.last_triggered_at ? [[row.id, row.last_triggered_at]] : [])));
}

function pickLatestTimestamp(a?: string, b?: string): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export async function dispatchDueRateAlerts(env: Env): Promise<{ usersChecked: number; events: number; sent: number; skipped: number }> {
  if (!env.DB) return { usersChecked: 0, events: 0, sent: 0, skipped: 0 };
  const { results } = await env.DB
    .prepare(
      `SELECT DISTINCT ar.user_id
       FROM alert_rules ar
       JOIN push_tokens pt ON pt.user_id = ar.user_id AND pt.enabled = 1
       WHERE ar.enabled = 1`,
    )
    .all<UserRow>();

  const users = results ?? [];
  if (users.length === 0) return { usersChecked: 0, events: 0, sent: 0, skipped: 0 };

  const snapshot = await getLatestSnapshot(env);
  const seriesCache = new Map<RateSourceId, Array<{ date: string; rate: number }>>();
  let eventCount = 0;
  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const rules = await getUserAlertRules(env.DB, user.user_id);
    const sources = Array.from(new Set(rules.filter((rule) => rule.type === 'drop_from_recent_high_bps').map((rule) => rule.sourceId)));
    for (const sourceId of sources) {
      if (!seriesCache.has(sourceId)) {
        const rows = await getSeries(env.DB, sourceId, '1M');
        seriesCache.set(sourceId, rows.map((row) => ({ date: row.observedAt.slice(0, 10), rate: row.rate })));
      }
    }
    const seriesBySource = Object.fromEntries(Array.from(seriesCache.entries()));
    const evaluation = evaluateRules(rules, { snapshot, seriesBySource, now: new Date().toISOString() });
    const fired = evaluation.fired;
    if (fired.length === 0) continue;

    await updateTriggeredRules(env.DB, user.user_id, evaluation.updatedRules);
    for (const event of fired) {
      await recordAlertEvent(env.DB, event);
      const delivery = await sendUserNotification(env, user.user_id, {
        title: 'Refi Radar alert',
        body: event.message,
        data: { type: 'alert', eventId: event.id, ruleId: event.ruleId, sourceId: event.sourceId },
      });
      sent += delivery.sent;
      skipped += delivery.skipped;
      await markAlertEventDelivered(env.DB, event.id, delivery.sent > 0 ? 'sent' : 'skipped');
    }
    eventCount += fired.length;
  }

  return { usersChecked: users.length, events: eventCount, sent, skipped };
}

async function getUserAlertRules(db: D1Database, userId: string): Promise<LocalAlertRule[]> {
  const { results } = await db
    .prepare(
      `SELECT id, user_id, source_id, rule_type, threshold, threshold_bps, enabled,
              cooldown_minutes, last_triggered_at, created_at
       FROM alert_rules
       WHERE user_id = ? AND enabled = 1`,
    )
    .bind(userId)
    .all<AlertRuleRow>();

  return (results ?? []).flatMap(rowToLocalAlertRule);
}

function rowToLocalAlertRule(row: AlertRuleRow): LocalAlertRule[] {
  if (!RATE_RULE_TYPES.has(row.rule_type as AlertRuleType)) return [];
  const type = row.rule_type as AlertRuleType;
  const threshold = type === 'drop_from_recent_high_bps' ? row.threshold_bps : row.threshold;
  if (typeof threshold !== 'number') return [];
  return [{
    id: row.id,
    sourceId: row.source_id as RateSourceId,
    type,
    threshold,
    enabled: row.enabled === 1,
    cooldownMinutes: row.cooldown_minutes,
    lastTriggeredAt: row.last_triggered_at ?? undefined,
    createdAt: row.created_at,
  }];
}

async function updateTriggeredRules(db: D1Database, userId: string, rules: LocalAlertRule[]): Promise<void> {
  for (const rule of rules) {
    await db
      .prepare('UPDATE alert_rules SET last_triggered_at = ? WHERE user_id = ? AND id = ?')
      .bind(rule.lastTriggeredAt ?? null, userId, rule.id)
      .run();
  }
}

async function recordAlertEvent(db: D1Database, event: AlertEvent): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO alert_events (id, rule_id, triggered_at, payload_json, delivery_status)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(event.id, event.ruleId, event.firedAt, JSON.stringify(event), 'pending')
    .run();
}

async function markAlertEventDelivered(db: D1Database, eventId: string, status: string): Promise<void> {
  await db
    .prepare('UPDATE alert_events SET delivered_at = CURRENT_TIMESTAMP, delivery_status = ? WHERE id = ?')
    .bind(status, eventId)
    .run();
}

async function sendUserNotification(
  env: Env,
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<{ sent: number; skipped: number }> {
  if (!env.DB) return { sent: 0, skipped: 0 };
  const { results } = await env.DB
    .prepare('SELECT token, platform FROM push_tokens WHERE user_id = ? AND enabled = 1')
    .bind(userId)
    .all<PushTokenRow>();

  let sent = 0;
  let skipped = 0;
  for (const row of results ?? []) {
    const result = await sendApns(env, row.token, payload);
    if (result === 'sent') sent += 1;
    else skipped += 1;
  }
  return { sent, skipped };
}

async function sendApns(
  env: Env,
  deviceToken: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<'sent' | 'skipped'> {
  if (!env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_BUNDLE_ID || !env.APNS_PRIVATE_KEY) {
    return 'skipped';
  }

  const token = await makeApnsJwt(env.APNS_TEAM_ID, env.APNS_KEY_ID, env.APNS_PRIVATE_KEY);
  const endpoint = `${env.APNS_USE_SANDBOX === 'true' ? APNS_SANDBOX_URL : APNS_PRODUCTION_URL}${deviceToken}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'apns-topic': env.APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: 'default',
      },
      ...(payload.data ?? {}),
    }),
  });

  if (response.status === 410 || response.status === 400) {
    await env.DB?.prepare('UPDATE push_tokens SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE token = ?').bind(deviceToken).run();
  }

  return response.ok ? 'sent' : 'skipped';
}

async function makeApnsJwt(teamId: string, keyId: string, privateKey: string): Promise<string> {
  const header = { alg: 'ES256', kid: keyId };
  const claims = { iss: teamId, iat: Math.floor(Date.now() / 1000) };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(signature)}`;
}

function base64UrlJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function base64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, '\n');
  const base64 = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}
