import { Bell } from 'lucide-react';

import { describeRule, type AlertEvent, type LocalAlertRule } from '@refi-radar/shared';

interface Props {
  rules: LocalAlertRule[];
  events: AlertEvent[];
  onManage: () => void;
}

function relativeTime(iso: string, now = Date.now()): string {
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AlertsFeed({ rules, events, onManage }: Props) {
  const enabled = rules.filter((r) => r.enabled);
  const recentEvents = events.slice(0, 5);

  if (recentEvents.length > 0) {
    return (
      <div className="alerts-feed">
        <div className="alerts-feed-head">
          <p className="alerts-feed-eyebrow">Recent alerts</p>
          <button type="button" className="alerts-feed-link" onClick={onManage}>
            Manage rules
          </button>
        </div>
        <ul className="alerts-feed-list">
          {recentEvents.map((event) => (
            <li key={event.id} className="alerts-feed-event">
              <span className="alerts-feed-icon" aria-hidden="true">
                <Bell />
              </span>
              <div className="alerts-feed-event-text">
                <p className="alerts-feed-message">{event.message}</p>
                <p className="alerts-feed-time">{relativeTime(event.firedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (enabled.length === 0) {
    return (
      <div className="alerts-feed alerts-feed-empty">
        <p className="alerts-feed-empty-text">
          No alerts set up yet. Add a rule to get notified when rates move.
        </p>
        <button type="button" className="alerts-feed-link" onClick={onManage}>
          Add your first rule
        </button>
      </div>
    );
  }

  return (
    <div className="alerts-feed">
      <div className="alerts-feed-head">
        <p className="alerts-feed-eyebrow">Watching</p>
        <button type="button" className="alerts-feed-link" onClick={onManage}>
          Manage rules
        </button>
      </div>
      <ul className="watch-list">
        {enabled.map((rule) => (
          <li key={rule.id}>{describeRule(rule)}</li>
        ))}
      </ul>
    </div>
  );
}
