import type { RateSourceId } from '@refi-radar/shared';

import type { RateSeries } from '../../lib/api';
import { bpsTone, deltaBpsAgo, downsample, fmtBps } from '../../lib/derive';
import { Sparkline } from './Sparkline';

interface Props {
  series: RateSeries[];
  height: number;
  onSelect?: (sourceId: RateSourceId) => void;
}

export function StackedSparklines({ series, height, onSelect }: Props) {
  const rowCount = Math.max(series.length, 1);
  const rowHeight = Math.max(56, Math.floor(height / rowCount));
  const sparkHeight = Math.max(20, rowHeight - 24);

  return (
    <div className="grid divide-y divide-line border border-line rounded-md bg-surface-1/40 overflow-hidden">
      {series.map((s) => {
        const last = s.points.at(-1);
        const oneDay = deltaBpsAgo(s.points, 1);
        const tone = bpsTone(oneDay);
        const sparkPoints = downsample(s.points, 80);

        const RowEl = onSelect ? 'button' : 'div';
        const rowProps = onSelect
          ? {
              type: 'button' as const,
              onClick: () => onSelect(s.sourceId),
              'aria-label': `Open ${s.label} chart`,
            }
          : {};

        return (
          <RowEl
            key={s.sourceId}
            {...rowProps}
            className={`grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-3 px-3 text-left ${
              onSelect ? 'hover:bg-surface-2/60 cursor-pointer' : ''
            }`}
            style={{ height: rowHeight, alignItems: 'center' }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[11px] font-medium text-fg-muted uppercase tracking-wide truncate">
                  {s.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-tnum text-base text-fg">
                  {last ? `${last.rate.toFixed(2)}%` : '—'}
                </span>
                <span className={`font-mono-tnum text-[11px] tone-${tone}`}>
                  {fmtBps(oneDay)}
                </span>
              </div>
            </div>
            <div className="min-w-0 overflow-hidden" style={{ height: sparkHeight }}>
              <Sparkline
                points={sparkPoints}
                color={s.color}
                strokeWidth={1.5}
                showFill
              />
            </div>
          </RowEl>
        );
      })}
    </div>
  );
}
