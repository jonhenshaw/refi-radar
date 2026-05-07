import type { ScrubInfo } from './hooks/usePointerScrub';
import type { ChartScales } from './scales';

interface Props {
  scrub: ScrubInfo;
  scales: ChartScales;
}

export function Crosshair({ scrub, scales }: Props) {
  return (
    <g pointerEvents="none">
      <line
        x1={scrub.pxX}
        x2={scrub.pxX}
        y1={scales.yRange[0]}
        y2={scales.yRange[1]}
        stroke="rgba(255,255,255,0.32)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {scrub.rows.map((row) => (
        <g key={row.sourceId}>
          <circle
            cx={scrub.pxX}
            cy={row.pxY}
            r={5.5}
            fill={row.color}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={1}
          />
          <circle
            cx={scrub.pxX}
            cy={row.pxY}
            r={9}
            fill={row.color}
            opacity={0.18}
          />
        </g>
      ))}
    </g>
  );
}
