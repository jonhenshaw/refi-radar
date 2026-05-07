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
  const recentEvents = events.slice(0, 4);

  if (recentEvents.length > 0) {
    return (
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Recent alerts</p>
          <button
            type="button"
            onClick={onManage}
            className="text-[11px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Manage
          </button>
        </div>
        <ul className="grid gap-1.5">
          {recentEvents.map((event) => (
            <li
              key={event.id}
              className="grid grid-cols-[16px_1fr_auto] items-baseline gap-2 text-[12px]"
            >
              <Bell className="h-3 w-3 text-warn" aria-hidden="true" />
              <p className="text-fg">{event.message}</p>
              <p className="font-mono-tnum text-[10px] text-fg-dim">{relativeTime(event.firedAt)}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (enabled.length === 0) {
    return (
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-[12px] text-fg-muted">
          No alerts set up. Add a rule to get notified when rates move.
        </p>
        <button
          type="button"
          onClick={onManage}
          className="self-start text-[11px] text-accent underline-offset-2 hover:underline"
        >
          Add your first rule →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Watching</p>
        <button
          type="button"
          onClick={onManage}
          className="text-[11px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Manage
        </button>
      </div>
      <ul className="grid gap-1 text-[12px] text-fg-muted">
        {enabled.map((rule) => (
          <li key={rule.id} className="font-mono-tnum">
            <span className="text-fg-dim mr-2">·</span>
            {describeRule(rule)}
          </li>
        ))}
      </ul>
    </div>
  );
}
