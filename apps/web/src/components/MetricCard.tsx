import type { ReactNode } from 'react';

import { clsx } from 'clsx';

export interface MetricCardProps {
  label: string;
  value?: number;
  changeBps?: number;
  meta?: string;
  icon?: ReactNode;
  demo?: boolean;
  onSelect?: () => void;
}

export function formatRate(value?: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '—';
}

export function formatBps(value?: number): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${value > 0 ? '+' : ''}${Math.round(value)} bps`;
}

export function MetricCard({ label, value, changeBps, meta, icon, demo = false, onSelect }: MetricCardProps) {
  const change = formatBps(changeBps);
  const isHigher = typeof changeBps === 'number' && changeBps > 0;
  const isLower = typeof changeBps === 'number' && changeBps < 0;

  const Wrapper = onSelect ? 'button' : 'article';

  return (
    <Wrapper
      type={onSelect ? 'button' : undefined}
      aria-label={onSelect ? `View ${label} history` : undefined}
      onClick={onSelect}
      className={clsx(
        'metric-card panel group w-full overflow-hidden p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#101720]',
        onSelect && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D9BF0]/60',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">{label}</p>
          {meta ? <p className="mt-2 text-xs text-white/35">{meta}</p> : null}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-[#1D9BF0]">{icon}</div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <p className="font-mono text-4xl font-semibold tracking-[-0.05em] text-white">{formatRate(value)}</p>
        {change ? (
          <span
            className={clsx(
              'rounded-full border px-2.5 py-1 font-mono text-xs font-semibold',
              isHigher && 'border-red-400/20 bg-red-400/10 text-red-300',
              isLower && 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
              !isHigher && !isLower && 'border-white/10 bg-white/[0.03] text-white/55',
            )}
          >
            {change}
          </span>
        ) : null}
      </div>

      {demo ? <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[#1D9BF0]">Sample data</p> : null}
      {onSelect ? <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-white/35 transition group-hover:text-[#8ED0FF]">Click to zoom history</p> : null}
    </Wrapper>
  );
}
