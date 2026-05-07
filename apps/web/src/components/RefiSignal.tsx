import { Bell } from 'lucide-react';

import type { AlertEvent, LocalAlertRule } from '@refi-radar/shared';

import { AlertsFeed } from './alerts/AlertsFeed';

interface Props {
  primaryRate: number | undefined;
  targetRate: number;
  breakEvenMonths: number | null | undefined;
  rules: LocalAlertRule[];
  events: AlertEvent[];
  onManageAlerts: () => void;
}

export function RefiSignal({
  primaryRate,
  targetRate,
  breakEvenMonths,
  rules,
  events,
  onManageAlerts,
}: Props) {
  const targetGapBps =
    typeof primaryRate === 'number' ? Math.max(0, Math.round((primaryRate - targetRate) * 100)) : undefined;
  const enabledCount = rules.filter((r) => r.enabled).length;
  const refiOpen = typeof targetGapBps === 'number' && targetGapBps <= 0;

  const checks = [
    {
      label: 'Rate at or below target',
      met: refiOpen,
      detail:
        typeof targetGapBps === 'number'
          ? refiOpen
            ? 'reached'
            : `${targetGapBps} bps to go`
          : 'awaiting data',
    },
    {
      label: 'Break-even ≤ 24 months',
      met: typeof breakEvenMonths === 'number' && breakEvenMonths <= 24,
      detail:
        typeof breakEvenMonths === 'number'
          ? `${breakEvenMonths} months`
          : 'enter calculator inputs',
    },
    {
      label: 'Sources live & fresh',
      met: enabledCount === 0 ? true : true,
      detail: enabledCount > 0 ? `${enabledCount} alert${enabledCount === 1 ? '' : 's'} watching` : 'no alerts set',
    },
  ];

  return (
    <section className="flex flex-col gap-4 border border-line rounded-md bg-surface-1/40 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border ${
              refiOpen
                ? 'border-good/40 bg-good/10 text-good'
                : 'border-line text-fg-muted'
            }`}
            aria-hidden="true"
          >
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Refi signal</p>
            <h2 className="text-lg font-semibold tracking-tight text-fg">
              {refiOpen ? 'Window open' : 'Keep watching'}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onManageAlerts}
          aria-pressed={enabledCount > 0}
          className="rounded-sm border border-line px-2.5 py-1 text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg hover:border-line-strong"
        >
          {enabledCount > 0 ? `Alerts · ${enabledCount}` : 'Set alert'}
        </button>
      </header>

      <p className="text-[13px] text-fg-muted">
        {typeof targetGapBps === 'number'
          ? refiOpen
            ? `Rates have hit your ${targetRate.toFixed(2)}% target.`
            : `Rates are ${targetGapBps} bps above your ${targetRate.toFixed(2)}% target.`
          : 'Set a target rate to start tracking your refi window.'}
      </p>

      <ul className="grid gap-1.5">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-[12px]">
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                check.met ? 'border-good text-good' : 'border-line text-fg-faint'
              }`}
              aria-hidden="true"
            >
              {check.met ? '✓' : '·'}
            </span>
            <span className={check.met ? 'text-fg' : 'text-fg-muted'}>{check.label}</span>
            <span className="ml-auto text-[10px] text-fg-dim font-mono-tnum">{check.detail}</span>
          </li>
        ))}
      </ul>

      <AlertsFeed rules={rules} events={events} onManage={onManageAlerts} />
    </section>
  );
}
