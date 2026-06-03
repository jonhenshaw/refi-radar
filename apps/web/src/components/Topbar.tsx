import { useEffect, useState } from 'react';
import { Bell, RadioTower } from 'lucide-react';
import type { PushStatus } from '../hooks/usePushNotifications';

interface Props {
  liveCount: number;
  totalCount: number;
  usingDemo: boolean;
  freshnessText: string;
  lastFetchedAt?: string;
  targetRate: number;
  onTargetRateChange: (rate: number) => void;
  notificationStatus: PushStatus;
  notificationMessage?: string | null;
  onEnableNotifications: () => void;
  onSendTestNotification: () => void;
}

const FRESH_WITHIN_MS = 120_000;

function useFreshness(lastFetchedAt: string | undefined, usingDemo: boolean): boolean {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!lastFetchedAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [lastFetchedAt]);
  if (usingDemo || !lastFetchedAt) return false;
  const ms = Date.now() - Date.parse(lastFetchedAt);
  void tick;
  return Number.isFinite(ms) && ms >= 0 && ms < FRESH_WITHIN_MS;
}

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function Topbar({
  liveCount,
  totalCount,
  usingDemo,
  freshnessText,
  lastFetchedAt,
  targetRate,
  onTargetRateChange,
  notificationStatus,
  notificationMessage,
  onEnableNotifications,
  onSendTestNotification,
}: Props) {
  const clock = useClock();
  const fresh = useFreshness(lastFetchedAt, usingDemo);
  const statusText = usingDemo
    ? 'demo data'
    : totalCount === 0
      ? 'syncing'
      : liveCount === totalCount
        ? `${liveCount} live`
        : `${liveCount}/${totalCount} live`;
  const tone = usingDemo ? 'warn' : liveCount === totalCount && totalCount > 0 ? 'good' : 'flat';
  const notificationLabel =
    notificationStatus === 'enabled'
      ? 'Push on'
      : notificationStatus === 'requesting'
        ? 'Enabling…'
        : notificationStatus === 'unavailable'
          ? 'iOS only'
          : 'Enable push';
  const notificationTone = notificationStatus === 'enabled' ? 'text-good' : notificationStatus === 'error' || notificationStatus === 'denied' ? 'text-warn' : 'text-fg-muted';

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-2">
      <div className="flex items-center gap-2">
        <RadioTower className="h-4 w-4 text-fg" aria-hidden="true" />
        <span className="font-semibold tracking-tight text-fg">Refi Radar</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-[11px]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : 'bg-fg-dim'
          }`}
          aria-hidden="true"
        />
        <span className="font-mono-tnum uppercase tracking-wider text-fg-muted">{statusText}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={notificationStatus === 'enabled' ? onSendTestNotification : onEnableNotifications}
          disabled={notificationStatus === 'requesting' || notificationStatus === 'unavailable'}
          title={notificationMessage ?? 'Enable iOS push notifications'}
          className={`inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-[11px] uppercase tracking-wider transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 ${notificationTone}`}
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{notificationLabel}</span>
        </button>
        <label className="flex items-center gap-1.5 text-[11px] text-fg-dim">
          <span className="uppercase tracking-wider">Target</span>
          <span className="flex items-center rounded-sm border border-line px-1.5 focus-within:border-line-strong">
            <input
              type="number"
              step="0.05"
              min="0"
              max="20"
              value={targetRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onTargetRateChange(v);
              }}
              aria-label="Target rate"
              className="w-12 bg-transparent font-mono-tnum text-fg text-right outline-none"
            />
            <span className="font-mono-tnum text-fg-muted">%</span>
          </span>
        </label>
        <span className="hidden sm:inline-flex items-baseline gap-1 text-[11px] text-fg-dim">
          <span className="uppercase tracking-wider">UTC</span>
          <span className="font-mono-tnum text-fg-muted">{clock}</span>
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-fg-dim">
          {fresh ? <span className="pulse-dot" aria-hidden="true" /> : null}
          <span>{freshnessText}</span>
        </span>
      </div>
    </header>
  );
}
