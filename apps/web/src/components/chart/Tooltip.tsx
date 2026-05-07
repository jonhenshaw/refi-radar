import type { ScrubInfo } from './hooks/usePointerScrub';

interface Props {
  scrub: ScrubInfo;
  containerWidth: number;
}

const TOOLTIP_WIDTH = 188;
const EDGE_PAD = 12;

function formatTooltipDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function Tooltip({ scrub, containerWidth }: Props) {
  const flipLeft = scrub.pxX + TOOLTIP_WIDTH + EDGE_PAD > containerWidth;
  const left = flipLeft ? scrub.pxX - TOOLTIP_WIDTH - EDGE_PAD : scrub.pxX + EDGE_PAD;
  return (
    <div
      role="status"
      aria-live="polite"
      className="chart-tooltip"
      style={{
        position: 'absolute',
        left: Math.max(EDGE_PAD, Math.min(left, containerWidth - TOOLTIP_WIDTH - EDGE_PAD)),
        top: 12,
        width: TOOLTIP_WIDTH,
        pointerEvents: 'none',
      }}
    >
      <div className="chart-tooltip-date">{formatTooltipDate(scrub.primaryDateMs)}</div>
      <ul className="chart-tooltip-list">
        {scrub.rows.map((row) => (
          <li key={row.sourceId}>
            <span className="chart-tooltip-swatch" style={{ backgroundColor: row.color }} />
            <span className="chart-tooltip-label">{row.label}</span>
            <span className="chart-tooltip-value">{row.rate.toFixed(2)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
