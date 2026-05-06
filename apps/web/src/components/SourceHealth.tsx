import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';

import type { SourceHealth as SourceHealthType } from '@refi-radar/shared';

const labels: Record<string, string> = {
  mnd_30y_fixed: 'Mortgage News Daily',
  fred_mortgage30us: 'FRED Mortgage30US',
  fred_dgs10: 'FRED 10Y Treasury',
};

export function SourceHealth({ items, demo = false }: { items: SourceHealthType[]; demo?: boolean }) {
  if (!items.length) {
    return <p className="text-sm text-white/45">No source health checks available yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.ok ? CheckCircle2 : item.stale ? Clock3 : AlertCircle;
        return (
          <div key={item.sourceId} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.025] p-3">
            <div className="flex items-center gap-3">
              <Icon className={item.ok ? 'h-4 w-4 text-emerald-300' : 'h-4 w-4 text-amber-300'} />
              <div>
                <p className="text-sm font-medium text-white/85">{labels[item.sourceId] ?? item.sourceId}</p>
                <p className="text-xs text-white/35">{item.lastError ?? (item.lastSuccessAt ? `Last sync ${new Date(item.lastSuccessAt).toLocaleString()}` : 'Waiting for first sync')}</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-white/45">
              {demo ? 'demo' : item.ok ? 'live' : item.stale ? 'stale' : 'down'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
