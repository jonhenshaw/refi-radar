import type { RateObservation } from '@refi-radar/shared';

import type { RangeKey, RateSeries } from '../lib/api';
import {
  bpsTone,
  daysSinceAtOrBelow,
  deltaBpsAgo,
  extremes,
  fmtBps,
  fmtPct,
  lastSpreadBps,
  trendSlope,
  volatilityBps,
  windowExtremes,
} from '../lib/derive';

interface Props {
  primary: RateObservation | undefined;
  series: RateSeries[];
  range: RangeKey;
  targetRate: number;
}

interface Cell {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'bad' | 'flat' | 'unknown' | 'accent';
  hideOnPhone?: boolean;
}

export function KeyStatsGrid({ primary, series, targetRate }: Props) {
  const mnd = series.find((s) => s.sourceId === 'mnd_30y_fixed');
  const treasury = series.find((s) => s.sourceId === 'fred_dgs10');
  const rate = primary?.rate;

  const mndPoints = mnd?.points ?? [];
  const targetGapBps = typeof rate === 'number' ? Math.round((rate - targetRate) * 100) : undefined;
  const spreadBps = lastSpreadBps(mnd, treasury);

  const avgChange = (() => {
    const changes = series
      .map((s) => deltaBpsAgo(s.points, 1))
      .filter((v): v is number => typeof v === 'number');
    if (!changes.length) return undefined;
    return Math.round(changes.reduce((a, b) => a + b, 0) / changes.length);
  })();

  const todayRange = windowExtremes(mndPoints, 1);
  const w7 = deltaBpsAgo(mndPoints, 7);
  const w30 = deltaBpsAgo(mndPoints, 30);
  const ytdStart = (() => {
    if (!mndPoints.length) return undefined;
    const last = mndPoints[mndPoints.length - 1];
    const year = Number(last.date.slice(0, 4));
    const startStr = `${year}-01-01`;
    const startPoint = mndPoints.find((p) => p.date >= startStr);
    if (!startPoint) return undefined;
    return Math.round((last.rate - startPoint.rate) * 100);
  })();
  const allTime = extremes(mndPoints);
  const fromLowBps =
    allTime && typeof rate === 'number' ? Math.round((rate - allTime.lo) * 100) : undefined;
  const vol30 = volatilityBps(mndPoints, 30);
  const daysToTarget = typeof rate === 'number' ? daysSinceAtOrBelow(mndPoints, targetRate) : undefined;
  const trend30 = trendSlope(mndPoints, 30);
  const trendValue = (() => {
    if (!trend30) return '—';
    if (trend30.direction === 'flat') return 'Flat';
    const sign = trend30.bpsPerDay > 0 ? '+' : '−';
    return `${sign}${Math.abs(trend30.bpsPerDay).toFixed(2)}/day`;
  })();
  const trendTone: Cell['tone'] =
    trend30?.direction === 'down' ? 'good' : trend30?.direction === 'up' ? 'bad' : trend30 ? 'flat' : 'unknown';

  const t10y2y = series.find((s) => s.sourceId === 'fred_t10y2y');
  const t10y2yLast = t10y2y?.points.length ? t10y2y.points[t10y2y.points.length - 1].rate : undefined;
  const t10y2yBps = typeof t10y2yLast === 'number' ? Math.round(t10y2yLast * 100) : undefined;
  const dff = series.find((s) => s.sourceId === 'fred_dff');
  const dffLast = dff?.points.length ? dff.points[dff.points.length - 1].rate : undefined;

  const cells: Cell[] = [
    {
      label: 'Target gap',
      value:
        typeof targetGapBps === 'number'
          ? targetGapBps <= 0
            ? '✓ Met'
            : `+${targetGapBps} bps`
          : '—',
      sub: `to ${targetRate.toFixed(2)}%`,
      tone:
        typeof targetGapBps === 'number'
          ? targetGapBps <= 0
            ? 'accent'
            : 'flat'
          : 'unknown',
    },
    {
      label: 'vs 10Y',
      value: typeof spreadBps === 'number' ? `${spreadBps} bps` : '—',
      sub: 'MBS-Treasury',
      tone: 'flat',
    },
    {
      label: 'Avg 1d',
      value: fmtBps(avgChange),
      sub: 'across feeds',
      tone: bpsTone(avgChange),
    },
    {
      label: 'Today range',
      value: todayRange ? `${todayRange.lo.toFixed(2)}–${todayRange.hi.toFixed(2)}` : '—',
      sub: 'low / high',
      tone: 'flat',
    },
    {
      label: '7d Δ',
      value: fmtBps(w7),
      sub: 'MND',
      tone: bpsTone(w7),
      hideOnPhone: true,
    },
    {
      label: '30d Δ',
      value: fmtBps(w30),
      sub: 'MND',
      tone: bpsTone(w30),
      hideOnPhone: true,
    },
    {
      label: 'YTD Δ',
      value: fmtBps(ytdStart),
      sub: 'MND',
      tone: bpsTone(ytdStart),
      hideOnPhone: true,
    },
    {
      label: 'From low',
      value: typeof fromLowBps === 'number' ? `+${fromLowBps} bps` : '—',
      sub: allTime ? `low ${fmtPct(allTime.lo)}` : '—',
      tone: 'flat',
      hideOnPhone: true,
    },
    {
      label: '30d vol',
      value: typeof vol30 === 'number' ? `${vol30} bps` : '—',
      sub: 'σ daily Δ',
      tone: 'flat',
      hideOnPhone: true,
    },
    {
      label: 'Days at target',
      value:
        typeof daysToTarget === 'number'
          ? daysToTarget === 0
            ? 'Now'
            : `${daysToTarget}d ago`
          : 'Never',
      sub: `≤ ${targetRate.toFixed(2)}%`,
      tone: typeof daysToTarget === 'number' && daysToTarget === 0 ? 'good' : 'flat',
      hideOnPhone: true,
    },
    {
      label: 'Trend 30d',
      value: trendValue,
      sub: trend30 ? `${trend30.direction}` : 'MND',
      tone: trendTone,
      hideOnPhone: true,
    },
    {
      label: '10Y-2Y',
      value:
        typeof t10y2yBps === 'number'
          ? `${t10y2yBps > 0 ? '+' : t10y2yBps < 0 ? '−' : ''}${Math.abs(t10y2yBps)} bps`
          : '—',
      sub: typeof t10y2yBps === 'number' && t10y2yBps < 0 ? 'inverted' : 'spread',
      tone:
        typeof t10y2yBps === 'number' ? (t10y2yBps < 0 ? 'bad' : t10y2yBps > 0 ? 'good' : 'flat') : 'unknown',
      hideOnPhone: true,
    },
    {
      label: 'Fed funds',
      value: fmtPct(dffLast),
      sub: 'DFF',
      tone: 'flat',
      hideOnPhone: true,
    },
  ];

  return (
    <section
      aria-label="Key statistics"
      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 border-t border-l border-line bg-surface-1/40"
    >
      {cells.map((cell, i) => (
        <article
          key={cell.label}
          className={`flex flex-col gap-1 border-r border-b border-line px-3 py-2.5 ${
            cell.hideOnPhone ? 'hidden sm:flex' : 'flex'
          } ${i % 2 === 1 ? 'sm:bg-transparent' : ''}`}
        >
          <p className="text-[10px] uppercase tracking-wider text-fg-dim">{cell.label}</p>
          <p className={`font-mono-tnum text-base font-medium tone-${cell.tone ?? 'flat'}`}>
            {cell.value}
          </p>
          {cell.sub ? <p className="text-[10px] text-fg-faint">{cell.sub}</p> : null}
        </article>
      ))}
    </section>
  );
}
