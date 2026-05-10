import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import type { LocalAlertRule } from '@refi-radar/shared';
import { registerPushToken, sendTestNotification, syncNotificationRules } from '../lib/api';

const USER_ID_KEY = 'refi-radar:user-id';
const DEVICE_ID_KEY = 'refi-radar:device-id';

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

export function usePushNotifications(rules: LocalAlertRule[]) {
  const native = Capacitor.isNativePlatform();
  const [status, setStatus] = useState<PushStatus>(native ? 'idle' : 'unavailable');
  const [message, setMessage] = useState<string | null>(native ? null : 'Push notifications are available in the iOS app.');
  const userId = useMemo(() => getNotificationUserId(), []);
  const deviceId = useMemo(() => getStoredId(DEVICE_ID_KEY, 'device'), []);

  const syncRules = useCallback(async () => {
    if (!native || status !== 'enabled') return;
    await syncNotificationRules(userId, rules);
  }, [native, rules, status, userId]);

  useEffect(() => {
    void syncRules().catch((error) => {
      console.warn('Failed to sync notification rules', error);
    });
  }, [syncRules]);

  const enable = useCallback(async () => {
    if (!native) return;
    setStatus('requesting');
    setMessage(null);
    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') {
        setStatus('denied');
        setMessage('Notification permission was denied in iOS settings.');
        return;
      }

      await PushNotifications.removeAllListeners();
      await PushNotifications.addListener('registration', async (token: Token) => {
        await registerPushToken({ userId, deviceId, token: token.value, platform: 'ios' });
        await syncNotificationRules(userId, rules);
        setStatus('enabled');
        setMessage('iOS push notifications are enabled.');
      });
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration failed', error);
        setStatus('error');
        setMessage('iOS could not register this device for push notifications.');
      });
      await PushNotifications.register();
    } catch (error) {
      console.error('Push notification setup failed', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to enable notifications.');
    }
  }, [deviceId, native, rules, userId]);

  const sendTest = useCallback(async () => {
    if (!native || status !== 'enabled') return;
    const result = await sendTestNotification(userId);
    setMessage(result.sent > 0 ? 'Sent a test push.' : 'Registered locally; APNs secrets are not configured on the Worker yet.');
  }, [native, status, userId]);

  return { native, status, message, enable, sendTest };
}
