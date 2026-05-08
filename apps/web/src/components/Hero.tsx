import type { RateObservation } from '@refi-radar/shared';

import type { RateSeries } from '../lib/api';
import { bpsTone, deltaBpsAgo, downsample, fmtBps } from '../lib/derive';
import { SOURCE_COLORS, SOURCE_LABELS } from '../lib/sourceTheme';
import { Sparkline } from './chart/Sparkline';

interface Props {
  primary: RateObservation | undefined;
  primarySeries: RateSeries | undefined;
  treasurySeries: RateSeries | undefined;
  freshnessText: string;
  loading: boolean;
}

export function Hero({ primary, primarySeries, treasurySeries, freshnessText, loading }: Props) {
  const rate = primary?.rate;
  const seriesChange = primarySeries ? deltaBpsAgo(primarySeries.points, 1) : undefined;
  const change = typeof primary?.changeBps === 'number' ? primary.changeBps : seriesChange;
  const tone = bpsTone(change);
  const sourceLabel = primary ? SOURCE_LABELS[primary.sourceId] : SOURCE_LABELS.mnd_30y_fixed;
  const sparkPoints = primarySeries ? downsample(primarySeries.points, 80) : [];
  const sparkColor = primary ? SOURCE_COLORS[primary.sourceId] : SOURCE_COLORS.mnd_30y_fixed;

  const treasuryRate = treasurySeries?.points.at(-1)?.rate;
  const spreadBps =
    typeof rate === 'number' && typeof treasuryRate === 'number'
      ? Math.round((rate - treasuryRate) * 100)
      : undefined;

  return (
    <section className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-fg-dim">{sourceLabel} · 30Y fixed</p>
        <div className="flex items-baseline gap-3 min-w-0">
          <span
            className="font-mono-tnum font-semibold text-fg leading-none tracking-tight"
            style={{ fontSize: 'var(--text-hero)' }}
            aria-label={typeof rate === 'number' ? `${rate.toFixed(2)} percent` : 'rate unavailable'}
          >
            {typeof rate === 'number' ? rate.toFixed(2) : '—'}
            <span className="text-fg-muted text-[0.5em] align-baseline pl-1">%</span>
          </span>
          {sparkPoints.length > 1 ? (
            <div className="hidden sm:block h-8 w-32 shrink-0 self-end">
              <Sparkline points={sparkPoints} color={sparkColor} strokeWidth={1.5} showFill />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-1 self-end sm:grid-cols-1 sm:text-right">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-fg-dim">1d</span>
          <span className={`font-mono-tnum text-base tone-${tone}`}>{fmtBps(change)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-fg-dim">vs 10Y</span>
          <span className="font-mono-tnum text-base text-fg">
            {typeof spreadBps === 'number' ? `${spreadBps} bps` : '—'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-fg-dim">Source</span>
          <span className="text-xs text-fg-muted truncate">{loading ? 'Updating…' : freshnessText}</span>
        </div>
      </div>
    </section>
  );
}
