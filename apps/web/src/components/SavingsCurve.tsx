import { monthlyPayment, monthlySavings } from '@refi-radar/shared';

import { useResizeObserver } from './chart/hooks/useResizeObserver';
import { pathFor } from './chart/scales';

interface Props {
  balance: number;
  currentRate: number;
  termYears: number;
  newRate: number;
  height?: number;
}

const POINTS = 60;

export function SavingsCurve({
  balance,
  currentRate,
  termYears,
  newRate,
  height = 80,
}: Props) {
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const width = size.width;

  if (
    width <= 0 ||
    !Number.isFinite(balance) ||
    balance <= 0 ||
    !Number.isFinite(currentRate) ||
    !Number.isFinite(termYears) ||
    termYears <= 0
  ) {
    return <div ref={ref} style={{ height }} />;
  }

  const months = termYears * 12;
  const currentPay = monthlyPayment(balance, currentRate, months);
  const minRate = Math.max(0.5, currentRate - 2);
  const maxRate = currentRate + 0.5;
  const span = maxRate - minRate;

  const samples = Array.from({ length: POINTS }, (_, i) => {
    const r = minRate + (span * i) / (POINTS - 1);
    const newPay = monthlyPayment(balance, r, months);
    const savings = monthlySavings(currentPay, newPay);
    return { r, savings };
  });

  const maxSavings = Math.max(...samples.map((s) => s.savings), 1);
  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = samples.map((s) => ({
    x: padX + ((s.r - minRate) / span) * innerW,
    y: padY + (1 - s.savings / maxSavings) * innerH,
  }));

  const fillD =
    coords.length > 1
      ? `${pathFor(coords)} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - 0.5).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - 0.5).toFixed(1)} Z`
      : '';

  const newRateClamped = Math.min(maxRate, Math.max(minRate, newRate));
  const markerX = padX + ((newRateClamped - minRate) / span) * innerW;
  const markerSavings = monthlySavings(currentPay, monthlyPayment(balance, newRateClamped, months));
  const markerY = padY + (1 - markerSavings / maxSavings) * innerH;

  return (
    <div ref={ref} style={{ height }} className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <path d={fillD} fill="var(--color-good)" fillOpacity="0.08" />
        <path
          d={pathFor(coords)}
          fill="none"
          stroke="var(--color-good)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={markerX}
          x2={markerX}
          y1={padY}
          y2={height - padY}
          stroke="var(--color-fg-dim)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <circle cx={markerX} cy={markerY} r={3} fill="var(--color-good)" stroke="black" strokeWidth={1} />
      </svg>
      <div className="absolute inset-x-1 bottom-0 flex justify-between text-[10px] text-fg-faint font-mono-tnum">
        <span>{minRate.toFixed(2)}%</span>
        <span className="text-fg-dim">savings @ rate sweep</span>
        <span>{maxRate.toFixed(2)}%</span>
      </div>
    </div>
  );
}
