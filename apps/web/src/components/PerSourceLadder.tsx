import type { RateObservation, SourceHealth, SourceId } from '@refi-radar/shared';

import type { RateSeries } from '../lib/api';
import {
  bpsTone,
  deltaBpsAgo,
  downsample,
  extremes,
  fmtBps,
  fmtPct,
} from '../lib/derive';
import { SOURCE_LABELS, SOURCE_META, SOURCE_ORDER } from '../lib/sourceTheme';
import { Sparkline } from './chart/Sparkline';

interface Props {
  observations: RateObservation[];
  health: SourceHealth[];
  series: RateSeries[];
  loading: boolean;
  usingDemo: boolean;
  onSelectSource: (id: SourceId) => void;
}

function statusOf(health: SourceHealth | undefined, demo: boolean): 'demo' | 'live' | 'stale' | 'down' {
  if (demo) return 'demo';
  if (!health) return 'stale';
  if (health.ok) return 'live';
  if (health.stale) return 'stale';
  return 'down';
}

function statusTone(s: 'demo' | 'live' | 'stale' | 'down'): 'good' | 'warn' | 'bad' | 'flat' {
  if (s === 'live') return 'good';
  if (s === 'stale') return 'warn';
  if (s === 'down') return 'bad';
  return 'flat';
}

export function PerSourceLadder({
  observations,
  health,
  series,
  loading,
  usingDemo,
  onSelectSource,
}: Props) {
  return (
    <section
      aria-label="Live feeds"
      className="border border-line rounded-md bg-surface-1/40"
    >
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Live feeds</p>
        <p className="text-[10px] uppercase tracking-wider text-fg-faint">tap row → expand chart</p>
      </header>

      {loading ? (
        <ul aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="border-b border-line last:border-b-0 px-3 py-3 chart-skeleton"
              style={{ height: 56 }}
            />
          ))}
        </ul>
      ) : (
        <ul>
          {SOURCE_ORDER.map((sourceId) => {
            const obs = observations.find((o) => o.sourceId === sourceId);
            const sr = series.find((s) => s.sourceId === sourceId);
            const points = sr?.points ?? [];
            const ext = extremes(points);
            const d1 = deltaBpsAgo(points, 1);
            const d7 = deltaBpsAgo(points, 7);
            const d30 = deltaBpsAgo(points, 30);
            const sparkPoints = downsample(points, 60);
            const status = statusOf(
              health.find((h) => h.sourceId === sourceId),
              usingDemo,
            );
            const tone = statusTone(status);

            return (
              <li key={sourceId} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelectSource(sourceId)}
                  aria-label={`View ${SOURCE_LABELS[sourceId]} expanded`}
                  className="grid w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2/50 grid-cols-[minmax(0,140px)_minmax(0,90px)_1fr] sm:grid-cols-[minmax(0,160px)_minmax(0,80px)_minmax(0,160px)_1fr_minmax(0,150px)_minmax(0,80px)]"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="flex items-center gap-1.5 text-fg">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: sr?.color ?? 'currentColor' }}
                      />
                      <span className="text-[12px] font-medium truncate">{SOURCE_LABELS[sourceId]}</span>
                    </span>
                    <span className="text-[10px] text-fg-dim truncate ml-3">{SOURCE_META[sourceId]}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-mono-tnum text-base text-fg">
                      {obs ? `${obs.rate.toFixed(2)}%` : '—'}
                    </span>
                    <span className={`font-mono-tnum text-[10px] tone-${bpsTone(d1)}`}>
                      {fmtBps(d1)}
                    </span>
                  </div>

                  <div className="hidden sm:flex flex-col text-[10px] text-fg-dim font-mono-tnum">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-fg-faint">7d</span>
                      <span className={`tone-${bpsTone(d7)}`}>{fmtBps(d7)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-fg-faint">30d</span>
                      <span className={`tone-${bpsTone(d30)}`}>{fmtBps(d30)}</span>
                    </span>
                  </div>

                  <div className="h-7 min-w-0 sm:h-8">
                    {sparkPoints.length > 1 ? (
                      <Sparkline
                        points={sparkPoints}
                        color={sr?.color ?? '#4D9FFF'}
                        strokeWidth={1.4}
                      />
                    ) : (
                      <span className="text-[10px] text-fg-faint">no data</span>
                    )}
                  </div>

                  <div className="hidden sm:flex flex-col text-[10px] text-fg-dim font-mono-tnum">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-fg-faint">hi</span>
                      <span className="text-fg-muted">{fmtPct(ext?.hi)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-fg-faint">lo</span>
                      <span className="text-fg-muted">{fmtPct(ext?.lo)}</span>
                    </span>
                  </div>

                  <div className="hidden sm:flex justify-end">
                    <span
                      className={`flex items-center gap-1.5 rounded-xs border px-1.5 py-0.5 text-[10px] uppercase tracking-wider tone-${tone}`}
                      style={{ borderColor: 'var(--color-line)' }}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : tone === 'bad' ? 'bg-bad' : 'bg-fg-dim'
                        }`}
                      />
                      {status}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
