import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type PushNotificationSchema, type Token } from '@capacitor/push-notifications';
import type { AlertEvent, AlertRuleType, LocalAlertRule, RateSourceId } from '@refi-radar/shared';
import { registerPushToken, sendTestNotification, syncNotificationRules, type NotificationLoanProfileInput } from '../lib/api';

const USER_ID_KEY = 'refi-radar:user-id';
const DEVICE_ID_KEY = 'refi-radar:device-id';
const PUSH_ENABLED_KEY = 'refi-radar:push-enabled';
const RATE_SOURCE_IDS = new Set<RateSourceId>([
  'mnd_30y_fixed',
  'fred_mortgage30us',
  'fred_dgs10',
  'fred_dgs2',
  'fred_dgs30',
  'fred_t10y2y',
  'fred_dff',
  'fred_sofr',
  'fred_mortgage15us',
]);
const ALERT_RULE_TYPES = new Set<AlertRuleType>([
  'below_rate',
  'above_rate',
  'drop_from_recent_high_bps',
  'break_even_below_months',
]);

export type PushStatus = 'unavailable' | 'idle' | 'requesting' | 'enabled' | 'denied' | 'error';

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function safeStorage(): Storage | null {
  return typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && typeof localStorage.setItem === 'function'
    ? localStorage
    : null;
}

function getStoredId(key: string, prefix: string): string {
  const storage = safeStorage();
  const existing = storage?.getItem(key);
  if (existing) return existing;
  const next = makeId(prefix);
  storage?.setItem(key, next);
  return next;
}

export function getNotificationUserId(): string {
  return getStoredId(USER_ID_KEY, 'user');
}

export function getStoredPushEnabled(): boolean {
  return safeStorage()?.getItem(PUSH_ENABLED_KEY) === 'true';
}

export function setStoredPushEnabled(enabled: boolean): void {
  safeStorage()?.setItem(PUSH_ENABLED_KEY, enabled ? 'true' : 'false');
}

function isRateSourceId(value: unknown): value is RateSourceId {
  return typeof value === 'string' && RATE_SOURCE_IDS.has(value as RateSourceId);
}

function isAlertRuleType(value: unknown): value is AlertRuleType {
  return typeof value === 'string' && ALERT_RULE_TYPES.has(value as AlertRuleType);
}

function numericDataValue(value: unknown): number | undefined {
  const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function notificationToAlertEvent(notification: PushNotificationSchema): AlertEvent | null {
  const data = typeof notification.data === 'object' && notification.data !== null
    ? notification.data as Record<string, unknown>
    : {};
  if (data.type !== 'alert') return null;

  const sourceId = isRateSourceId(data.sourceId) ? data.sourceId : 'mnd_30y_fixed';
  const ruleType = isAlertRuleType(data.ruleType) ? data.ruleType : 'below_rate';
  return {
    id: String(data.eventId ?? notification.id),
    ruleId: String(data.ruleId ?? 'push'),
    firedAt: new Date().toISOString(),
    message: notification.body ?? notification.title ?? 'Refi Radar alert triggered',
    sourceId,
    ruleSnapshot: {
      type: ruleType,
      threshold: numericDataValue(data.threshold) ?? 0,
      label: notification.title,
    },
  };
}

export function usePushNotifications(
  rules: LocalAlertRule[],
  loanProfile?: NotificationLoanProfileInput,
  onAlertNotification?: (event: AlertEvent) => void,
) {
  const native = Capacitor.isNativePlatform();
  const [status, setStatus] = useState<PushStatus>(native ? 'idle' : 'unavailable');
  const [message, setMessage] = useState<string | null>(native ? null : 'Push notifications are available in the iOS app.');
  const userId = useMemo(() => getNotificationUserId(), []);
  const deviceId = useMemo(() => getStoredId(DEVICE_ID_KEY, 'device'), []);

  const syncRules = useCallback(async () => {
    if (!native || status !== 'enabled') return;
    await syncNotificationRules(userId, rules, loanProfile);
  }, [loanProfile, native, rules, status, userId]);

  useEffect(() => {
    void syncRules().catch((error) => {
      console.warn('Failed to sync notification rules', error);
    });
  }, [syncRules]);

  const setupNativePush = useCallback(async (requestPrompt: boolean) => {
    if (!native) return;
    setStatus('requesting');
    setMessage(null);
    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt' && requestPrompt) {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive === 'prompt') {
        setStoredPushEnabled(false);
        setStatus('idle');
        return;
      }
      if (permission.receive !== 'granted') {
        setStoredPushEnabled(false);
        setStatus('denied');
        setMessage('Notification permission was denied in iOS settings.');
        return;
      }

      await PushNotifications.removeAllListeners();
      await PushNotifications.addListener('registration', async (token: Token) => {
        await registerPushToken({ userId, deviceId, token: token.value, platform: 'ios' });
        await syncNotificationRules(userId, rules, loanProfile);
        setStoredPushEnabled(true);
        setStatus('enabled');
        setMessage('iOS push notifications are enabled.');
      });
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration failed', error);
        setStatus('error');
        setMessage('iOS could not register this device for push notifications.');
      });
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const event = notificationToAlertEvent(notification);
        if (event) onAlertNotification?.(event);
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const event = notificationToAlertEvent(notification);
        if (event) onAlertNotification?.(event);
      });
      await PushNotifications.register();
    } catch (error) {
      console.error('Push notification setup failed', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to enable notifications.');
    }
  }, [deviceId, loanProfile, native, onAlertNotification, rules, userId]);

  useEffect(() => {
    if (!native || status !== 'idle' || !getStoredPushEnabled()) return;
    void setupNativePush(false);
  }, [native, setupNativePush, status]);

  const enable = useCallback(async () => {
    await setupNativePush(true);
  }, [setupNativePush]);

  const sendTest = useCallback(async () => {
    if (!native || status !== 'enabled') return;
    const result = await sendTestNotification(userId);
    setMessage(result.sent > 0 ? 'Sent a test push.' : 'Registered locally; APNs secrets are not configured on the Worker yet.');
  }, [native, status, userId]);

  return { native, status, message, enable, sendTest };
}
