import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bell, Loader2, RadioTower } from 'lucide-react';

import type {
  AlertEvent,
  LatestSnapshot,
  LocalAlertRule,
  RateObservation,
  RefiResult,
  SourceHealth as SourceHealthType,
  SourceId,
} from '@refi-radar/shared';

import { AlertRulesDialog } from './components/alerts/AlertRulesDialog';
import { AlertsFeed } from './components/alerts/AlertsFeed';
import { ChartDialog } from './components/chart/ChartDialog';
import { RangeTabs } from './components/RangeTabs';
import { RateChart } from './components/chart/RateChart';
import { RefiCalculator } from './components/RefiCalculator';
import { SourceHealth } from './components/SourceHealth';
import { ToastProvider, useToast } from './components/toast/ToastProvider';
import { useAlertEvaluator } from './hooks/useAlertEvaluator';
import { useAlertEvents } from './hooks/useAlertEvents';
import { useAlertRules } from './hooks/useAlertRules';
import { getCompareSeries, getLatest, type RangeKey, type RateSeries } from './lib/api';

const TARGET_RATE = 6.25;

const sourceLabels: Record<SourceId, string> = {
  mnd_30y_fixed: 'MND 30Y Fixed',
  fred_mortgage30us: 'FRED Survey',
  fred_dgs10: '10Y Treasury',
};

const sourceMeta: Record<SourceId, string> = {
  mnd_30y_fixed: 'daily market feed',
  fred_mortgage30us: 'weekly official avg',
  fred_dgs10: 'market proxy',
};

const now = new Date().toISOString();

const demoSources: RateObservation[] = [
  { sourceId: 'mnd_30y_fixed', observedAt: now, fetchedAt: now, rate: 6.72, changeBps: -7, confidence: 'market_estimate' },
  { sourceId: 'fred_mortgage30us', observedAt: now, fetchedAt: now, rate: 6.88, changeBps: 2, confidence: 'weekly_survey' },
  { sourceId: 'fred_dgs10', observedAt: now, fetchedAt: now, rate: 4.14, changeBps: -3, confidence: 'proxy' },
];

const demoHealth: SourceHealthType[] = demoSources.map((source) => ({
  sourceId: source.sourceId,
  ok: true,
  stale: false,
  lastSuccessAt: source.fetchedAt,
}));

const demoLatest: LatestSnapshot = {
  primary: demoSources[0],
  sources: demoSources,
  health: demoHealth,
};

const dayMs = 24 * 60 * 60 * 1000;

const demoShape: Record<RangeKey, { count: number; strideMs: number }> = {
  '1D': { count: 2, strideMs: dayMs },
  '5D': { count: 6, strideMs: dayMs },
  '1M': { count: 31, strideMs: dayMs },
  '3M': { count: 92, strideMs: dayMs },
  '1Y': { count: 365, strideMs: dayMs },
  '5Y': { count: 261, strideMs: 7 * dayMs },
  MAX: { count: 521, strideMs: 7 * dayMs },
};

function makeDemoSeries(range: RangeKey): RateSeries[] {
  const { count, strideMs } = demoShape[range];
  const configs = [
    { sourceId: 'mnd_30y_fixed' as const, label: 'MND 30Y Fixed', base: 6.72, color: '#1D9BF0', wave: 0.08, drift: -0.0008 },
    { sourceId: 'fred_mortgage30us' as const, label: 'FRED Mortgage30US', base: 6.88, color: '#2ED47A', wave: 0.06, drift: -0.0006 },
    { sourceId: 'fred_dgs10' as const, label: '10Y Treasury', base: 4.14, color: '#A78BFA', wave: 0.05, drift: -0.0004 },
  ];

  return configs.map((config) => ({
    sourceId: config.sourceId,
    label: config.label,
    color: config.color,
    points: Array.from({ length: count }, (_, index) => {
      const fromEnd = count - index - 1;
      const driftAmount = fromEnd * config.drift * (strideMs / dayMs);
      const rate = config.base + driftAmount + Math.sin(index / 6) * config.wave + Math.sin(index / 23) * config.wave * 0.4;
      const date = new Date(Date.now() - fromEnd * strideMs).toISOString().slice(0, 10);
      return { date, rate: Number(rate.toFixed(3)) };
    }),
  }));
}

function freshnessText(snapshot?: LatestSnapshot): string {
  const fetchedAt = snapshot?.primary?.fetchedAt ?? snapshot?.sources[0]?.fetchedAt;
  if (!fetchedAt) return 'Waiting for market data';
  return `Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function formatChangeBps(value?: number): { text: string; tone: 'good' | 'bad' | 'flat' | 'unknown' } {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { text: '—', tone: 'unknown' };
  const sign = value > 0 ? '+' : '';
  const tone = value < 0 ? 'good' : value > 0 ? 'bad' : 'flat';
  return { text: `${sign}${Math.round(value)} bps`, tone };
}

function lowestRate(series: RateSeries[], sourceId: SourceId): number | undefined {
  const points = series.find((s) => s.sourceId === sourceId)?.points ?? [];
  const values = points.map((p) => p.rate).filter((v) => Number.isFinite(v));
  return values.length ? Math.min(...values) : undefined;
}

function rangeLowLabel(range: RangeKey): string {
  switch (range) {
    case '5D':
      return '5D low';
    case '1M':
      return '1M low';
    case '3M':
      return '3M low';
    case '1Y':
      return '12M low';
    case '5Y':
      return '5Y low';
    case 'MAX':
      return 'All-time low';
    default:
      return 'Recent low';
  }
}

function liveCountText(snapshot: LatestSnapshot | null, usingDemo: boolean): string {
  if (usingDemo) return 'demo data';
  const liveCount = snapshot?.health.filter((h) => h.ok && !h.stale).length ?? 0;
  const total = snapshot?.health.length ?? 0;
  if (!total) return 'syncing…';
  return liveCount === total ? `${liveCount} sources live` : `${liveCount}/${total} sources live`;
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [latest, setLatest] = useState<LatestSnapshot | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
  const [range, setRange] = useState<RangeKey>('1M');
  const [series, setSeries] = useState<RateSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<SourceId | null>(null);
  const [chartInspectOpen, setChartInspectOpen] = useState(false);
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
  const [refiResult, setRefiResult] = useState<RefiResult | null>(null);

  const { rules, addRule, toggleRule, deleteRule, replaceRules } = useAlertRules();
  const { events, appendEvents } = useAlertEvents();
  const { pushToast } = useToast();

  const loadLatest = useCallback(async () => {
    try {
      const snapshot = await getLatest();
      if (!snapshot.primary && snapshot.sources.length === 0) {
        setLatest(demoLatest);
        setUsingDemo(true);
        setLatestError('API returned no observations; displaying sample data.');
      } else {
        setLatest(snapshot);
        setUsingDemo(false);
        setLatestError(null);
      }
    } catch {
      setLatest(demoLatest);
      setUsingDemo(true);
      setLatestError('Live API unavailable in this environment; displaying sample data.');
    } finally {
      setLatestLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLatest();
    const timer = window.setInterval(() => void loadLatest(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadLatest]);

  useEffect(() => {
    let cancelled = false;
    setSeriesLoading(true);
    getCompareSeries(range)
      .then((items) => {
        if (cancelled) return;
        const hasPoints = items.some((item) => item.points.length > 0);
        setSeries(hasPoints ? items : makeDemoSeries(range));
      })
      .catch(() => {
        if (!cancelled) setSeries(makeDemoSeries(range));
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const sources = latest?.sources ?? [];
  const primary = latest?.primary ?? sources[0];
  const primaryRate = primary?.rate;
  const primaryChange = formatChangeBps(primary?.changeBps);
  const targetGapBps = typeof primaryRate === 'number' ? Math.max(0, Math.round((primaryRate - TARGET_RATE) * 100)) : undefined;
  const lowAtRange = lowestRate(series, 'mnd_30y_fixed') ?? primaryRate;
  const avgMoveBps = useMemo(() => {
    const changes = sources.map((source) => source.changeBps).filter((value): value is number => typeof value === 'number');
    return changes.length ? Math.round(changes.reduce((sum, value) => sum + value, 0) / changes.length) : undefined;
  }, [sources]);

  const dialogOpen = chartInspectOpen || selectedSourceId !== null;

  const handleAlertFire = useCallback(
    (fired: AlertEvent[], updatedRules: LocalAlertRule[]) => {
      appendEvents(fired);
      replaceRules(updatedRules);
      for (const event of fired) {
        pushToast({ title: 'Alert triggered', body: event.message, tone: 'alert' });
      }
    },
    [appendEvents, replaceRules, pushToast],
  );

  useAlertEvaluator({
    rules,
    snapshot: latest,
    series,
    refiBreakEvenMonths:
      refiResult?.breakEvenMonths !== null && refiResult?.breakEvenMonths !== undefined && Number.isFinite(refiResult.breakEvenMonths)
        ? refiResult.breakEvenMonths
        : undefined,
    enabled: !usingDemo,
    onFire: handleAlertFire,
  });

  const enabledRulesCount = rules.filter((r) => r.enabled).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <RadioTower className="topbar-brand-icon" aria-hidden="true" />
          <span>Refi Radar</span>
        </div>
        <div className="topbar-status" aria-live="polite">
          <span className={`live-dot ${usingDemo ? 'live-dot-demo' : 'live-dot-on'}`} aria-hidden="true" />
          <span>{liveCountText(latest, usingDemo)}</span>
        </div>
      </header>

      {latestError ? (
        <div className="banner banner-warn" role="status">
          <AlertTriangle aria-hidden="true" />
          <div>
            <p className="banner-title">Sample data is showing</p>
            <p className="banner-body">{latestError}</p>
          </div>
        </div>
      ) : null}

      <section className="hero">
        <div className="hero-main">
          <p className="hero-eyebrow">{sourceLabels[primary?.sourceId ?? 'mnd_30y_fixed']}</p>
          <p className="hero-rate" aria-label={primaryRate ? `${primaryRate.toFixed(2)} percent` : 'No primary rate'}>
            <span className="hero-rate-num">{primaryRate?.toFixed(2) ?? '—'}</span>
            <span className="hero-rate-suffix">%</span>
          </p>
        </div>
        <div className="hero-side">
          <p className={`hero-move tone-${primaryChange.tone}`}>{primaryChange.text}</p>
          <p className="hero-meta">
            {latestLoading ? (
              <>
                <Loader2 className="spin" aria-hidden="true" /> Loading latest rates…
              </>
            ) : (
              <>
                <Activity aria-hidden="true" /> {freshnessText(latest ?? undefined)}
              </>
            )}
          </p>
        </div>
      </section>

      <section className="micro-strip" aria-label="Refinance context">
        <article className="micro-card">
          <p className="micro-label">Target gap</p>
          <p className="micro-value">
            {targetGapBps ?? '—'}
            {typeof targetGapBps === 'number' ? <span className="micro-unit">bps</span> : null}
          </p>
          <p className="micro-sub">to {TARGET_RATE.toFixed(2)}%</p>
        </article>
        <article className="micro-card">
          <p className="micro-label">{rangeLowLabel(range)}</p>
          <p className="micro-value">
            {typeof lowAtRange === 'number' ? lowAtRange.toFixed(2) : '—'}
            {typeof lowAtRange === 'number' ? <span className="micro-unit">%</span> : null}
          </p>
          <p className="micro-sub">in selected range</p>
        </article>
        <article className="micro-card">
          <p className="micro-label">Avg move</p>
          <p className={`micro-value tone-${formatChangeBps(avgMoveBps).tone}`}>{formatChangeBps(avgMoveBps).text}</p>
          <p className="micro-sub">across feeds</p>
        </article>
        <article className="micro-card micro-signal">
          <p className="micro-label">Signal</p>
          <p className="micro-value tone-accent">{typeof targetGapBps === 'number' && targetGapBps <= 0 ? 'Refi window' : 'Watch'}</p>
          <p className="micro-sub">{typeof targetGapBps === 'number' ? `${targetGapBps} bps to target` : 'awaiting data'}</p>
        </article>
      </section>

      <section className="chart-card panel" aria-label="Multi-source rate trend">
        <header className="chart-card-head">
          <div>
            <p className="chart-card-eyebrow">Rate history</p>
            <h2 className="chart-card-title">Multi-source trend</h2>
          </div>
          <div className="chart-card-controls">
            <RangeTabs value={range} onChange={setRange} />
            <button
              type="button"
              className="chart-expand-button"
              aria-label="Open expanded chart view"
              onClick={() => setChartInspectOpen(true)}
            >
              Expand
            </button>
          </div>
        </header>
        <RateChart series={series} loading={seriesLoading} demo={usingDemo} />
      </section>

      <div className="layout-split">
        <section className="panel sources-card" aria-label="Rate sources">
          <header className="card-head">
            <div>
              <p className="card-eyebrow">Sources</p>
              <h2 className="card-title">Live feeds</h2>
            </div>
            <span className={`pill ${usingDemo ? 'pill-warn' : 'pill-good'}`}>{usingDemo ? 'demo' : 'live'}</span>
          </header>
          {latestLoading ? (
            <ul className="sources-skeleton" aria-hidden="true">
              <li />
              <li />
              <li />
            </ul>
          ) : sources.length ? (
            <ul className="sources-list">
              {sources.map((source) => {
                const change = formatChangeBps(source.changeBps);
                return (
                  <li key={source.sourceId}>
                    <button
                      type="button"
                      className="source-row"
                      aria-label={`View ${sourceLabels[source.sourceId] ?? source.sourceId} details`}
                      onClick={() => setSelectedSourceId(source.sourceId)}
                    >
                      <span className="source-row-main">
                        <strong>{sourceLabels[source.sourceId] ?? source.sourceId}</strong>
                        <small>{sourceMeta[source.sourceId] ?? source.confidence.replace('_', ' ')}</small>
                      </span>
                      <span className="source-row-rate">
                        <strong>
                          {source.rate.toFixed(2)}
                          <span className="source-row-unit">%</span>
                        </strong>
                        <em className={`tone-${change.tone}`}>{change.text}</em>
                      </span>
                      <span className="source-row-chev" aria-hidden="true">›</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">Waiting for API data.</p>
          )}
          <SourceHealth items={latest?.health ?? []} demo={usingDemo} />
        </section>

        <section className="panel signal-card">
          <header className="card-head">
            <div className="card-head-icon-row">
              <div className="card-icon"><Bell aria-hidden="true" /></div>
              <div>
                <p className="card-eyebrow">Refi signal</p>
                <h2 className="card-title">{typeof targetGapBps === 'number' && targetGapBps <= 0 ? 'Refi window open' : 'Keep watching'}</h2>
              </div>
            </div>
            <button
              type="button"
              className="alert-toggle"
              aria-pressed={enabledRulesCount > 0}
              onClick={() => setAlertsDialogOpen(true)}
            >
              {enabledRulesCount > 0 ? `Alerts · ${enabledRulesCount}` : 'Set alert'}
            </button>
          </header>
          <p className="signal-body">
            {typeof targetGapBps === 'number'
              ? `Rates are ${targetGapBps} bps above your ${TARGET_RATE.toFixed(2)}% target.`
              : 'Set a target rate to start tracking your refi window.'}
          </p>
          <AlertsFeed rules={rules} events={events} onManage={() => setAlertsDialogOpen(true)} />
        </section>
      </div>

      <div className="layout-split">
        <RefiCalculator suggestedRate={primaryRate} onResult={setRefiResult} />
        <section className="panel notes-card">
          <p className="card-eyebrow">Market notes</p>
          <h2 className="card-title">Refi rule of thumb</h2>
          <p className="notes-body">
            A refinance starts to look interesting when your quoted rate is 50–75 bps below your current note rate and closing
            costs break even inside your hold period.
          </p>
          {typeof primaryRate === 'number' ? (
            <p className="notes-stat">
              <span>Today's primary</span>
              <strong>{primaryRate.toFixed(2)}%</strong>
            </p>
          ) : null}
        </section>
      </div>

      <footer className="data-health" role="contentinfo">
        <span>Data health</span>
        <strong>{usingDemo ? 'Sample data' : `${liveCountText(latest, usingDemo)} · ${freshnessText(latest ?? undefined).toLowerCase()}`}</strong>
      </footer>

      <ChartDialog
        open={dialogOpen}
        onClose={() => {
          setChartInspectOpen(false);
          setSelectedSourceId(null);
        }}
        title={selectedSourceId ? sourceLabels[selectedSourceId] ?? selectedSourceId : 'Multi-source trend'}
        subtitle={`${range} · ${selectedSourceId ? 'focused source' : 'all feeds'}`}
      >
        <RateChart
          series={series}
          loading={seriesLoading}
          demo={usingDemo}
          expanded
          primarySourceId={selectedSourceId ?? 'mnd_30y_fixed'}
          ariaLabel="Mortgage rate history chart"
        />
      </ChartDialog>

      <AlertRulesDialog
        open={alertsDialogOpen}
        onClose={() => setAlertsDialogOpen(false)}
        rules={rules}
        onAdd={(input) => {
          const created = addRule(input);
          pushToast({
            title: 'Alert saved',
            body: `Watching ${created.sourceId} · ${created.type.replace(/_/g, ' ')}`,
            tone: 'success',
          });
        }}
        onToggle={toggleRule}
        onDelete={deleteRule}
      />
    </main>
  );
}
