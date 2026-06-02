import { describe, expect, it } from 'vitest';
import type { PushNotificationSchema } from '@capacitor/push-notifications';

import { notificationToAlertEvent } from './usePushNotifications';

describe('notificationToAlertEvent', () => {
  it('maps APNs alert payloads into local alert events', () => {
    const event = notificationToAlertEvent({
      id: 'notification-1',
      title: 'Refi Radar alert',
      body: 'MND 30Y Fixed dropped to 6.10% (target <= 6.25%)',
      data: {
        type: 'alert',
        eventId: 'event-1',
        ruleId: 'rule-1',
        sourceId: 'mnd_30y_fixed',
        ruleType: 'below_rate',
        threshold: '6.25',
      },
    } satisfies PushNotificationSchema);

    expect(event).toEqual(expect.objectContaining({
      id: 'event-1',
      ruleId: 'rule-1',
      message: 'MND 30Y Fixed dropped to 6.10% (target <= 6.25%)',
      sourceId: 'mnd_30y_fixed',
      ruleSnapshot: {
        type: 'below_rate',
        threshold: 6.25,
        label: 'Refi Radar alert',
      },
    }));
  });

  it('ignores non-alert push payloads', () => {
    expect(notificationToAlertEvent({
      id: 'notification-1',
      title: 'Refi Radar notifications are on',
      data: { type: 'test' },
    } satisfies PushNotificationSchema)).toBeNull();
  });
});
