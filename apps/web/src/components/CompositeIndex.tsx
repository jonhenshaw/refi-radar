import { useMemo } from 'react';

import type { RateSeries } from '../lib/api';
import { compositeAsSeriesPoints, computeCompositeIndex } from '../lib/composite';
import { Sparkline } from './chart/Sparkline';

interface Props {
  series: RateSeries[];
  loading: boolean;
}

const ACCENT = '#4D9FFF';

export function CompositeIndex({ series, loading }: Props) {
  const composite = useMemo(() => computeCompositeIndex(series), [series]);
  const sparkPoints = useMemo(() => compositeAsSeriesPoints(composite), [composite]);

  const current = composite.length ? composite[composite.length - 1].value : undefined;
  const start = composite.length ? composite[0].value : undefined;
  const delta =
    typeof current === 'number' && typeof start === 'number' ? current - start : undefined;

  const deltaTone =
    typeof delta === 'number' ? (delta < 0 ? 'tone-good' : delta > 0 ? 'tone-bad' : 'tone-flat') : 'tone-unknown';

  const sources = composite.length;
  const headlineValue = typeof current === 'number' ? current.toFixed(0) : '—';
  const deltaText =
    typeof delta === 'number' ? `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} pts` : '—';

  return (
    <section
      aria-label="Cross-source rate environment index"
      className="mt-4 flex flex-col gap-3 border border-line rounded-md bg-surface-1/40 p-3 sm:p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Cross-source composite</p>
          <h2 className="text-base font-semibold tracking-tight text-fg">Rate environment index</h2>
        </div>
        <div className="flex items-baseline gap-3 font-mono-tnum">
          <span className="text-2xl text-fg">{headlineValue}</span>
          <span className={`text-[11px] ${deltaTone}`}>{deltaText}</span>
        </div>
      </header>

      <div className="h-32 w-full">
        {loading ? (
          <div className="chart-skeleton h-full w-full" />
        ) : sparkPoints.length < 2 ? (
          <div className="chart-empty h-full">No composite data</div>
        ) : (
          <Sparkline points={sparkPoints} color={ACCENT} strokeWidth={1.6} showFill />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-fg-faint">
        <span>
          Each source min-max normalized over the visible window, then averaged. Lower = closer to
          the window's low across all sources (favorable for refinancing).
        </span>
        <span className="font-mono-tnum">{sources} pts</span>
      </div>
    </section>
  );
}
