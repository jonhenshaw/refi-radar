import type { LatestSnapshot, RateObservation, RateSourceId } from '@refi-radar/shared';

import { bpsTone, fmtBps } from '../lib/derive';
import { SOURCE_COLORS, SOURCE_LABELS, TICKER_ORDER } from '../lib/sourceTheme';

interface Props {
  snapshot: LatestSnapshot | null;
}

interface TickerCellData {
  sourceId: RateSourceId;
  label: string;
  color: string;
  display: string;
  changeBps: number | undefined;
  ariaText: string;
}

function formatRate(sourceId: RateSourceId, rate: number): string {
  if (sourceId === 'fred_t10y2y') {
    const bps = Math.round(rate * 100);
    if (bps === 0) return '0 bps';
    return `${bps > 0 ? '+' : '−'}${Math.abs(bps)} bps`;
  }
  return `${rate.toFixed(2)}%`;
}

function buildCells(snapshot: LatestSnapshot | null): TickerCellData[] {
  const bySource = new Map<RateSourceId, RateObservation>(
    (snapshot?.sources ?? []).map((source) => [source.sourceId, source]),
  );
  return TICKER_ORDER.map((sourceId) => {
    const obs = bySource.get(sourceId);
    const display = obs ? formatRate(sourceId, obs.rate) : '—';
    const ariaText = obs
      ? `${SOURCE_LABELS[sourceId]} ${display} ${fmtBps(obs.changeBps)}`
      : `${SOURCE_LABELS[sourceId]} no data`;
    return {
      sourceId,
      label: SOURCE_LABELS[sourceId],
      color: SOURCE_COLORS[sourceId],
      display,
      changeBps: obs?.changeBps,
      ariaText,
    };
  });
}

function TickerCell({ data }: { data: TickerCellData }) {
  const tone = bpsTone(data.changeBps);
  const toneClass =
    tone === 'good' ? 'tone-good' : tone === 'bad' ? 'tone-bad' : tone === 'flat' ? 'tone-flat' : 'tone-unknown';
  return (
    <span className="flex shrink-0 items-baseline gap-2 px-4 py-1.5 text-[11px]">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: data.color }}
        aria-hidden="true"
      />
      <span className="uppercase tracking-[0.16em] text-fg-dim">{data.label}</span>
      <span className="font-mono-tnum text-fg">{data.display}</span>
      <span className={`font-mono-tnum text-[10px] ${toneClass}`}>{fmtBps(data.changeBps)}</span>
    </span>
  );
}

export function TickerBar({ snapshot }: Props) {
  const cells = buildCells(snapshot);

  return (
    <div
      className="ticker-bar relative w-full overflow-hidden border-b border-line bg-surface-1/60"
      role="region"
      aria-label="Live rates ticker"
    >
      <div
        className="ticker-track flex w-max"
        aria-hidden="true"
        tabIndex={0}
      >
        {cells.map((cell) => (
          <TickerCell key={`a-${cell.sourceId}`} data={cell} />
        ))}
        {cells.map((cell) => (
          <TickerCell key={`b-${cell.sourceId}`} data={cell} />
        ))}
      </div>
      <dl className="sr-only">
        {cells.map((cell) => (
          <div key={cell.sourceId}>
            <dt>{cell.label}</dt>
            <dd>{cell.ariaText}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
