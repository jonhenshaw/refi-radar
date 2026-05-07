import type { RateSeries } from '../lib/api';
import { avgSpreadBps, lastSpreadBps, pctRank } from '../lib/derive';

interface Props {
  series: RateSeries[];
}

export function SpreadTracker({ series }: Props) {
  const mnd = series.find((s) => s.sourceId === 'mnd_30y_fixed');
  const treasury = series.find((s) => s.sourceId === 'fred_dgs10');

  const current = lastSpreadBps(mnd, treasury);
  const avg30 = avgSpreadBps(mnd, treasury, 30);
  const deviation =
    typeof current === 'number' && typeof avg30 === 'number' ? current - avg30 : undefined;

  // Build a synthetic spread series for percentile ranking
  const spreadSeries = (() => {
    if (!mnd?.points.length || !treasury?.points.length) return [];
    const tByDate = new Map(treasury.points.map((p) => [p.date, p.rate]));
    return mnd.points
      .filter((p) => tByDate.has(p.date))
      .map((p) => ({ date: p.date, rate: p.rate - (tByDate.get(p.date) as number) }));
  })();
  const pct =
    typeof current === 'number' && spreadSeries.length
      ? pctRank(spreadSeries, current / 100)
      : undefined;

  const cells = [
    { label: 'Current', value: typeof current === 'number' ? `${current} bps` : '—', sub: 'MND – 10Y' },
    { label: '30d avg', value: typeof avg30 === 'number' ? `${avg30} bps` : '—', sub: 'rolling' },
    {
      label: 'Δ vs avg',
      value: typeof deviation === 'number' ? `${deviation > 0 ? '+' : ''}${deviation} bps` : '—',
      sub: deviation && deviation > 0 ? 'wider' : deviation && deviation < 0 ? 'tighter' : 'flat',
    },
    {
      label: 'Pct rank',
      value: typeof pct === 'number' ? `${pct}%` : '—',
      sub: 'history',
    },
  ];

  return (
    <section
      aria-label="Spread tracker"
      className="border border-line rounded-md bg-surface-1/40"
    >
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Spread tracker</p>
        <p className="text-[10px] uppercase tracking-wider text-fg-faint">tightens before cuts</p>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {cells.map((c, i) => (
          <article
            key={c.label}
            className={`flex flex-col gap-1 px-3 py-2.5 ${
              i < cells.length - 1 ? 'sm:border-r border-line' : ''
            } ${i < 2 ? 'border-b sm:border-b-0 border-line' : ''}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-fg-dim">{c.label}</p>
            <p className="font-mono-tnum text-base text-fg">{c.value}</p>
            <p className="text-[10px] text-fg-faint">{c.sub}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
