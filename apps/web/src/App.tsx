import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bell, LineChart, RadioTower } from 'lucide-react';

import type { LatestSnapshot, RateObservation, SourceHealth as SourceHealthType, SourceId } from '@refi-radar/shared';

import { MetricCard } from './components/MetricCard';
import { RangeTabs } from './components/RangeTabs';
import { RateChart } from './components/RateChart';
import { RateDetailPanel } from './components/RateDetailPanel';
import { RefiCalculator } from './components/RefiCalculator';
import { SourceHealth } from './components/SourceHealth';
import { getCompareSeries, getLatest, type RangeKey, type RateSeries } from './lib/api';

const sourceLabels: Record<string, string> = {
  mnd_30y_fixed: 'MND 30Y Fixed',
  fred_mortgage30us: 'FRED Survey',
  fred_dgs10: '10Y Treasury',
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

function makeDemoSeries(range: RangeKey): RateSeries[] {
  const countByRange = { '5D': 6, '1M': 31, '3M': 46, '1Y': 53 } satisfies Record<RangeKey, number>;
  const count = countByRange[range];
  const configs = [
    { sourceId: 'mnd_30y_fixed' as const, label: 'MND 30Y Fixed', base: 6.72, color: '#1D9BF0', wave: 0.08 },
    { sourceId: 'fred_mortgage30us' as const, label: 'FRED Mortgage30US', base: 6.88, color: '#2ED47A', wave: 0.06 },
    { sourceId: 'fred_dgs10' as const, label: '10Y Treasury', base: 4.14, color: '#A78BFA', wave: 0.05 },
  ];

  return configs.map((config) => ({
    sourceId: config.sourceId,
    label: config.label,
    color: config.color,
    points: Array.from({ length: count }, (_, index) => {
      const drift = (index - count) * -0.008;
      const rate = config.base + drift + Math.sin(index / 4) * config.wave;
      const date = new Date(Date.now() - (count - index - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return { date, rate: Number(rate.toFixed(3)) };
    }),
  }));
}

function freshness(snapshot?: LatestSnapshot): string {
  const fetchedAt = snapshot?.primary?.fetchedAt ?? snapshot?.sources[0]?.fetchedAt;
  if (!fetchedAt) return 'Waiting for market data';
  return `Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function App() {
  const [latest, setLatest] = useState<LatestSnapshot | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
  const [range, setRange] = useState<RangeKey>('1M');
  const [series, setSeries] = useState<RateSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<SourceId | null>(null);

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
    } catch (error) {
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
        if (!cancelled) {
          const hasPoints = items.some((item) => item.points.length > 0);
          setSeries(hasPoints ? items : makeDemoSeries(range));
        }
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
  const selectedSource = selectedSourceId ? sources.find((source) => source.sourceId === selectedSourceId) : undefined;
  const selectedSeries = selectedSourceId ? series.find((item) => item.sourceId === selectedSourceId) : undefined;
  const primaryRate = latest?.primary?.rate ?? sources[0]?.rate;
  const avgChange = useMemo(() => {
    const changes = sources.map((source) => source.changeBps).filter((value): value is number => typeof value === 'number');
    return changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : undefined;
  }, [sources]);

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="hero flex flex-col gap-6 border-b border-white/8 pb-8 pt-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1D9BF0]/20 bg-[#1D9BF0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ED0FF]">
            <RadioTower className="h-3.5 w-3.5" /> Live mortgage intelligence
          </div>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.07em] text-white sm:text-6xl">Refi Radar</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/55">A dark, data-dense command center for tracking refinance windows across market estimates, surveys, and treasury proxies.</p>
        </div>
        <div className="panel flex items-center gap-3 px-4 py-3 text-sm text-white/55">
          <Activity className="h-4 w-4 text-[#1D9BF0]" />
          <span>{latestLoading ? 'Loading latest rates…' : freshness(latest ?? undefined)}</span>
        </div>
      </header>

      {latestError ? (
        <div className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Frontend-only fallback enabled</p>
            <p className="mt-1 text-amber-100/70">{latestError} The dashboard is clearly marked where sample/demo data is used.</p>
          </div>
        </div>
      ) : null}

      <section className="metrics-grid mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {latestLoading
          ? Array.from({ length: 4 }, (_, index) => <div key={index} className="panel h-40 animate-pulse" />)
          : sources.length
            ? sources.map((source) => (
                <MetricCard
                  key={source.sourceId}
                  label={sourceLabels[source.sourceId] ?? source.sourceId}
                  value={source.rate}
                  changeBps={source.changeBps}
                  meta={source.confidence.replace('_', ' ')}
                  icon={<LineChart className="h-5 w-5" />}
                  demo={usingDemo}
                  onSelect={() => setSelectedSourceId(source.sourceId)}
                />
              ))
            : <MetricCard label="No observations" value={undefined} meta="Waiting for API data" icon={<LineChart className="h-5 w-5" />} />}
        <MetricCard label="Avg move" value={avgChange === undefined ? undefined : avgChange / 100} changeBps={avgChange} meta="Across tracked feeds" icon={<Activity className="h-5 w-5" />} demo={usingDemo} />
      </section>

      <section className="dashboard-grid mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="panel p-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9BF0]">Rate history</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Multi-source trend</h2>
            </div>
            <RangeTabs value={range} onChange={setRange} />
          </div>
          <RateChart series={series} loading={seriesLoading} demo={usingDemo} />
        </div>

        <div className="right-rail space-y-6">
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9BF0]">Source health</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Ingestion status</h2>
              </div>
              <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">{usingDemo ? 'demo' : 'live'}</span>
            </div>
            <SourceHealth items={latest?.health ?? []} demo={usingDemo} />
          </section>

          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-[#1D9BF0]"><Bell className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9BF0]">Alerts</p>
                <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">Watchlist skeleton</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {['Notify when 30Y drops below 6.25%', 'Flag 20 bps intraday moves', 'Weekly survey spread widening'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-[#111822] p-3 text-sm text-white/60">{item}</div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="lower-grid mt-6 grid gap-6 lg:grid-cols-[0.95fr_1fr]">
        <RefiCalculator suggestedRate={primaryRate} />
        <section className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9BF0]">Market notes</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Refi signal readout</h2>
          <div className="mt-6 grid gap-3">
            <div className="subpanel p-4">
              <p className="text-sm text-white/55">Primary mortgage rate</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-white">{primaryRate?.toFixed(2) ?? '—'}%</p>
            </div>
            <div className="subpanel p-4">
              <p className="text-sm text-white/55">Rule of thumb</p>
              <p className="mt-2 text-sm leading-6 text-white/65">A refinance starts to look interesting when your quoted rate is 50–75 bps below your current note rate and closing costs break even inside your hold period.</p>
            </div>
          </div>
        </section>
      </section>

      {selectedSourceId ? (
        <RateDetailPanel
          label={sourceLabels[selectedSourceId] ?? selectedSourceId}
          sourceId={selectedSourceId}
          series={selectedSeries}
          latest={selectedSource}
          onClose={() => setSelectedSourceId(null)}
        />
      ) : null}
    </main>
  );
}
