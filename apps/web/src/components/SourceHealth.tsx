import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';

import type { SourceHealth as SourceHealthType } from '@refi-radar/shared';

const labels: Record<string, string> = {
  mnd_30y_fixed: 'Mortgage News Daily',
  fred_mortgage30us: 'FRED Mortgage30US',
  fred_dgs10: 'FRED 10Y Treasury',
};

function statusFor(item: SourceHealthType): { label: string; tone: 'good' | 'warn' | 'bad'; Icon: typeof CheckCircle2 } {
  if (item.ok) return { label: 'live', tone: 'good', Icon: CheckCircle2 };
  if (item.stale) return { label: 'stale', tone: 'warn', Icon: Clock3 };
  return { label: 'down', tone: 'bad', Icon: AlertCircle };
}

export function SourceHealth({ items, demo = false }: { items: SourceHealthType[]; demo?: boolean }) {
  if (!items.length) return null;

  return (
    <ul className="health-list" aria-label="Source health">
      {items.map((item) => {
        const status = statusFor(item);
        const Icon = status.Icon;
        return (
          <li key={item.sourceId} className="health-row">
            <Icon className={`health-icon tone-${status.tone}`} aria-hidden="true" />
            <div className="health-row-main">
              <strong>{labels[item.sourceId] ?? item.sourceId}</strong>
              <small>
                {item.lastError ?? (item.lastSuccessAt ? `Last sync ${new Date(item.lastSuccessAt).toLocaleString()}` : 'Waiting for first sync')}
              </small>
            </div>
            <span className={`pill pill-${demo ? 'warn' : status.tone}`}>{demo ? 'demo' : status.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
