import type { LatestSnapshot, SourceId } from '@refi-radar/shared';

import type { RangeKey, RateSeries } from '../lib/api';
import { RateChart } from './RateChart';

const sourceLabels: Record<string, string> = {
  mnd_30y_fixed: 'MND 30Y Fixed',
  fred_mortgage30us: 'Freddie Survey',
  fred_dgs10: '10Y Treasury',
};

const targetRate = 6.25;
const ranges: RangeKey[] = ['5D', '1M', '3M', '1Y', '5Y', 'MAX'];
const trendLabels: Record<RangeKey, string> = {
  '1D': '1-day trend',
  '5D': '5-day trend',
  '1M': '1-month trend',
  '3M': '3-month trend',
  '1Y': '12-month trend',
  '5Y': '5-year trend',
  MAX: 'Full history',
};

function formatChangeBps(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${Math.round(value)} bps`;
}

function formatObserved(source: { observedAt: string; confidence?: string }): string {
  if (source.confidence === 'weekly_survey') return 'weekly official avg';
  if (source.confidence === 'proxy') return 'market proxy';
  return 'daily market feed';
}

function latestSync(snapshot?: LatestSnapshot | null): string {
  const fetchedAt = snapshot?.primary?.fetchedAt ?? snapshot?.sources[0]?.fetchedAt;
  if (!fetchedAt) return 'waiting for sync';
  const date = new Date(fetchedAt);
  if (Number.isNaN(date.getTime())) return 'recently synced';
  return `last sync ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function rateParts(value?: number): { integer: string; symbol: string } {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { integer: '—', symbol: '' };
  return { integer: value.toFixed(2), symbol: '%' };
}

function minRate(series: RateSeries[], sourceId: SourceId): number | undefined {
  const points = series.find((item) => item.sourceId === sourceId)?.points ?? [];
  const values = points.map((point) => point.rate).filter((value) => Number.isFinite(value));
  return values.length ? Math.min(...values) : undefined;
}

function sourceChangeClass(changeBps?: number): string {
  if (typeof changeBps !== 'number') return 'mobile-muted';
  if (changeBps < 0) return 'mobile-green';
  if (changeBps > 0) return 'mobile-red';
  return 'mobile-muted';
}

interface MobileDashboardProps {
  latest: LatestSnapshot | null;
  series: RateSeries[];
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  onSelectSource: (sourceId: SourceId) => void;
  onInspectChart: () => void;
  usingDemo: boolean;
  loading: boolean;
}

export function MobileDashboard({ latest, series, range, onRangeChange, onSelectSource, onInspectChart, usingDemo, loading }: MobileDashboardProps) {
  const primary = latest?.primary ?? latest?.sources[0];
  const primaryParts = rateParts(primary?.rate);
  const targetGap = typeof primary?.rate === 'number' ? Math.max(0, Math.round((primary.rate - targetRate) * 100)) : undefined;
  const twelveMonthLow = minRate(series, 'mnd_30y_fixed') ?? primary?.rate;
  const lowParts = rateParts(twelveMonthLow);
  const liveCount = latest?.health.filter((item) => item.ok && !item.stale).length ?? 0;

  return (
    <section className="mobile-dashboard" aria-label="Mobile rate dashboard">
      <div className="mobile-topbar">
        <div>
          <p className="mobile-eyebrow">Refi Radar</p>
          <h1>Today</h1>
        </div>
        <div className="mobile-live">● {usingDemo ? 'demo' : `${liveCount || latest?.sources.length || 0} sources live`}</div>
      </div>

      <section className="mobile-hero">
        <div>
          <p className="mobile-label">{sourceLabels[primary?.sourceId ?? ''] ?? 'MND 30Y Fixed'}</p>
          <p className="mobile-rate" aria-label={primary?.rate ? `${primary.rate.toFixed(2)} percent` : 'No primary rate'}>
            <span className="mobile-rate-number">{primaryParts.integer}</span>
            {primaryParts.symbol ? <span className="mobile-rate-symbol">{primaryParts.symbol}</span> : null}
          </p>
        </div>
        <div className="mobile-hero-meta">
          <p className={sourceChangeClass(primary?.changeBps)}>{formatChangeBps(primary?.changeBps)}</p>
          <p>{loading ? 'loading…' : latestSync(latest)}</p>
        </div>
      </section>

      <section className="mobile-stat-strip" aria-label="Refinance context">
        <div className="mobile-micro-card">
          <span>Target gap</span>
          <strong>
            {targetGap ?? '—'}{typeof targetGap === 'number' ? <small>bps</small> : null}
          </strong>
        </div>
        <div className="mobile-micro-card">
          <span>12M low</span>
          <strong>
            {lowParts.integer}{lowParts.symbol ? <small>{lowParts.symbol}</small> : null}
          </strong>
        </div>
        <div className="mobile-micro-card">
          <span>Signal</span>
          <strong className="mobile-blue">Watch</strong>
        </div>
      </section>

      <section className="mobile-panel mobile-chart-panel">
        <div className="mobile-chart-head">
          <div>
            <h2>{trendLabels[range]}</h2>
            <p>MND vs Freddie vs 10Y</p>
          </div>
          <div className="mobile-range-tabs" aria-label="History range">
            {ranges.map((item) => (
              <button
                key={item}
                type="button"
                aria-label={`Show ${item} history`}
                className={item === range ? 'active' : undefined}
                onClick={() => onRangeChange(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <RateChart series={series} loading={loading} demo={usingDemo} onInspect={onInspectChart} />
      </section>

      <p className="mobile-section-title">Rates</p>
      <section className="mobile-panel mobile-source-list" aria-label="Rate sources">
        {(latest?.sources ?? []).map((source) => {
          const parts = rateParts(source.rate);
          return (
            <button key={source.sourceId} type="button" onClick={() => onSelectSource(source.sourceId)} aria-label={`View ${sourceLabels[source.sourceId] ?? source.sourceId} details`}>
              <span>
                <strong>{sourceLabels[source.sourceId] ?? source.sourceId}</strong>
                <small>{formatObserved(source)}</small>
              </span>
              <span className="mobile-source-value">
                <strong>
                  {parts.integer}{parts.symbol ? <small>{parts.symbol}</small> : null}
                </strong>
                <em className={sourceChangeClass(source.changeBps)}>{source.changeBps === undefined ? source.observedAt.slice(0, 10) : formatChangeBps(source.changeBps)}</em>
              </span>
              <span className="mobile-chevron">›</span>
            </button>
          );
        })}
      </section>

      <section className="mobile-panel mobile-signal-card">
        <div>
          <p className="mobile-section-title">Refi Signal</p>
          <h2>Keep watching</h2>
          <p>Rates are {targetGap ?? '—'} bps above your 6.25% target.</p>
        </div>
        <button type="button">Alert on</button>
      </section>

      <div className="mobile-data-health">
        <span>Data health</span>
        <strong>{usingDemo ? 'sample data' : `all sources live · ${latestSync(latest)}`}</strong>
      </div>
    </section>
  );
}
