import type { ScrubInfo } from './hooks/usePointerScrub';

interface Props {
  scrub: ScrubInfo;
  containerWidth: number;
}

const TOOLTIP_WIDTH = 200;
const COMPACT_THRESHOLD = 380;
const EDGE_PAD = 10;

function formatTooltipDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function relativeFromToday(ms: number): string {
  const today = Date.now();
  const days = Math.round((today - ms) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.round(days / 365);
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}

export function Tooltip({ scrub, containerWidth }: Props) {
  const compact = containerWidth < COMPACT_THRESHOLD;

  if (compact) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="chart-tooltip absolute left-2 right-2 top-2 z-10 pointer-events-none rounded-sm border border-line-strong bg-surface-1/95 px-2.5 py-2 text-xs"
      >
        <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5 mb-1.5">
          <span className="font-mono-tnum text-fg">{formatTooltipDate(scrub.primaryDateMs)}</span>
          <span className="text-fg-dim text-[10px] uppercase tracking-wide">{relativeFromToday(scrub.primaryDateMs)}</span>
        </div>
        <ul className="grid gap-1">
          {scrub.rows.map((row) => (
            <li key={row.sourceId} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.color }} />
                {row.label}
              </span>
              <span className="font-mono-tnum text-fg">{row.rate.toFixed(2)}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const flipLeft = scrub.pxX + TOOLTIP_WIDTH + EDGE_PAD > containerWidth;
  const left = flipLeft ? scrub.pxX - TOOLTIP_WIDTH - EDGE_PAD : scrub.pxX + EDGE_PAD;

  return (
    <div
      role="status"
      aria-live="polite"
      className="chart-tooltip absolute z-10 pointer-events-none rounded-sm border border-line-strong bg-surface-1/95 px-2.5 py-2 text-xs"
      style={{
        left: Math.max(EDGE_PAD, Math.min(left, containerWidth - TOOLTIP_WIDTH - EDGE_PAD)),
        top: 8,
        width: TOOLTIP_WIDTH,
      }}
    >
      <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5 mb-1.5">
        <span className="font-mono-tnum text-fg">{formatTooltipDate(scrub.primaryDateMs)}</span>
        <span className="text-fg-dim text-[10px] uppercase tracking-wide">{relativeFromToday(scrub.primaryDateMs)}</span>
      </div>
      <ul className="grid gap-1">
        {scrub.rows.map((row) => (
          <li key={row.sourceId} className="grid grid-cols-[10px_1fr_auto] items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="text-fg-muted truncate">{row.label}</span>
            <span className="font-mono-tnum text-fg">{row.rate.toFixed(2)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
