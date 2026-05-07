import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import type {
  AlertEvent,
  LocalAlertRule,
  RefiResult,
  SourceId,
} from '@refi-radar/shared';

import { AlertRulesDialog } from './components/alerts/AlertRulesDialog';
import { ChartDialog } from './components/chart/ChartDialog';
import { Hero } from './components/Hero';
import { KeyLevels } from './components/KeyLevels';
import { KeyStatsGrid } from './components/KeyStatsGrid';
import { PerSourceLadder } from './components/PerSourceLadder';
import { RangeTabs } from './components/RangeTabs';
import { RateChart } from './components/chart/RateChart';
import { RateLadder } from './components/RateLadder';
import { RefiCalculator } from './components/RefiCalculator';
import { RefiSignal } from './components/RefiSignal';
import { SpreadTracker } from './components/SpreadTracker';
import { Topbar } from './components/Topbar';
import { ToastProvider, useToast } from './components/toast/ToastProvider';
import { useAlertEvaluator } from './hooks/useAlertEvaluator';
import { useAlertEvents } from './hooks/useAlertEvents';
import { useAlertRules } from './hooks/useAlertRules';
import {
  getCompareSeries,
  getLatest,
  type RangeKey,
  type RateSeries,
} from './lib/api';
import { demoLatest, makeDemoSeries } from './lib/demoData';
import { SOURCE_LABELS } from './lib/sourceTheme';
import type { LatestSnapshot } from '@refi-radar/shared';

const DEFAULT_TARGET_RATE = 6.25;

function freshnessText(snapshot?: LatestSnapshot): string {
  const fetchedAt = snapshot?.primary?.fetchedAt ?? snapshot?.sources[0]?.fetchedAt;
  if (!fetchedAt) return 'Waiting for market data';
  return `Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
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
  const [targetRate, setTargetRate] = useState<number>(DEFAULT_TARGET_RATE);

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
  const primarySeries = useMemo(
    () => series.find((s) => s.sourceId === 'mnd_30y_fixed'),
    [series],
  );
  const treasurySeries = useMemo(
    () => series.find((s) => s.sourceId === 'fred_dgs10'),
    [series],
  );

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

  const liveCount = latest?.health.filter((h) => h.ok && !h.stale).length ?? 0;
  const totalCount = latest?.health.length ?? 0;
  const fresh = freshnessText(latest ?? undefined);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-3 sm:px-6 pb-12">
      <Topbar
        liveCount={liveCount}
        totalCount={totalCount}
        usingDemo={usingDemo}
        freshnessText={fresh}
        targetRate={targetRate}
        onTargetRateChange={setTargetRate}
      />

      {latestError ? (
        <div
          role="status"
          className="mt-3 flex items-start gap-2 rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] text-warn"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-fg">Sample data is showing</p>
            <p className="text-fg-muted text-[11px]">{latestError}</p>
          </div>
        </div>
      ) : null}

      <Hero
        primary={primary}
        primarySeries={primarySeries}
        treasurySeries={treasurySeries}
        freshnessText={fresh}
        loading={latestLoading}
      />

      <KeyStatsGrid
        primary={primary}
        series={series}
        range={range}
        targetRate={targetRate}
      />

      <section
        aria-label="Multi-source rate trend"
        className="mt-4 flex flex-col gap-3 border border-line rounded-md bg-surface-1/40 p-3 sm:p-4"
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Rate history</p>
            <h2 className="text-base font-semibold tracking-tight text-fg">Multi-source trend</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RangeTabs value={range} onChange={setRange} />
            <button
              type="button"
              onClick={() => setChartInspectOpen(true)}
              aria-label="Open expanded chart view"
              className="rounded-sm border border-line px-2.5 py-1 text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg hover:border-line-strong"
            >
              Expand
            </button>
          </div>
        </header>
        <RateChart
          series={series}
          loading={seriesLoading}
          demo={usingDemo}
          onSelectSource={setSelectedSourceId}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PerSourceLadder
            observations={sources}
            health={latest?.health ?? []}
            series={series}
            loading={latestLoading}
            usingDemo={usingDemo}
            onSelectSource={setSelectedSourceId}
          />
        </div>
        <div className="lg:col-span-5">
          <SpreadTracker series={series} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 order-2 lg:order-1">
          <RefiSignal
            primaryRate={primaryRate}
            targetRate={targetRate}
            breakEvenMonths={refiResult?.breakEvenMonths}
            rules={rules}
            events={events}
            onManageAlerts={() => setAlertsDialogOpen(true)}
          />
        </div>
        <div className="lg:col-span-7 order-1 lg:order-2">
          <RefiCalculator suggestedRate={primaryRate} onResult={setRefiResult} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RateLadder series={series} />
        </div>
        <div className="lg:col-span-5">
          <KeyLevels rate={primaryRate} targetRate={targetRate} />
        </div>
      </div>

      <footer
        role="contentinfo"
        className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line py-4 text-[11px] text-fg-dim"
      >
        <span>
          {usingDemo
            ? 'Sample data · live API unreachable'
            : `${liveCount}/${totalCount} sources · ${fresh.toLowerCase()}`}
        </span>
        <span className="flex items-center gap-3 text-fg-faint">
          <a
            href="https://www.mortgagenewsdaily.com/mortgage-rates"
            className="hover:text-fg-muted underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            MND
          </a>
          <a
            href="https://fred.stlouisfed.org/series/MORTGAGE30US"
            className="hover:text-fg-muted underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            FRED
          </a>
          <a
            href="https://fred.stlouisfed.org/series/DGS10"
            className="hover:text-fg-muted underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            DGS10
          </a>
        </span>
      </footer>

      <ChartDialog
        open={dialogOpen}
        onClose={() => {
          setChartInspectOpen(false);
          setSelectedSourceId(null);
        }}
        title={selectedSourceId ? SOURCE_LABELS[selectedSourceId] ?? selectedSourceId : 'Multi-source trend'}
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
            body: `Watching ${SOURCE_LABELS[created.sourceId] ?? created.sourceId} · ${created.type.replace(/_/g, ' ')}`,
            tone: 'success',
          });
        }}
        onToggle={toggleRule}
        onDelete={deleteRule}
      />
    </main>
  );
}
