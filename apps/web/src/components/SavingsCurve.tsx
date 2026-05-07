import { monthlyPayment, monthlySavings } from '@refi-radar/shared';

import { pathFor } from './chart/scales';

interface Props {
  balance: number;
  currentRate: number;
  termYears: number;
  newRate: number;
  height?: number;
}

const POINTS = 60;
const VB_W = 200;
const VB_H = 60;
const PAD_X = 4;
const PAD_Y = 6;

export function SavingsCurve({
  balance,
  currentRate,
  termYears,
  newRate,
  height = 80,
}: Props) {
  if (
    !Number.isFinite(balance) ||
    balance <= 0 ||
    !Number.isFinite(currentRate) ||
    !Number.isFinite(termYears) ||
    termYears <= 0
  ) {
    return <div style={{ height }} />;
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
  const innerW = VB_W - PAD_X * 2;
  const innerH = VB_H - PAD_Y * 2;

  const coords = samples.map((s) => ({
    x: PAD_X + ((s.r - minRate) / span) * innerW,
    y: PAD_Y + (1 - s.savings / maxSavings) * innerH,
  }));

  const fillD =
    coords.length > 1
      ? `${pathFor(coords)} L ${coords[coords.length - 1].x.toFixed(2)} ${VB_H} L ${coords[0].x.toFixed(2)} ${VB_H} Z`
      : '';

  const newRateClamped = Math.min(maxRate, Math.max(minRate, newRate));
  const markerX = PAD_X + ((newRateClamped - minRate) / span) * innerW;
  const markerSavings = monthlySavings(currentPay, monthlyPayment(balance, newRateClamped, months));
  const markerY = PAD_Y + (1 - markerSavings / maxSavings) * innerH;

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="block h-full w-full"
        style={{ overflow: 'hidden' }}
        aria-hidden="true"
      >
        <path d={fillD} fill="var(--color-good)" fillOpacity="0.08" />
        <path
          d={pathFor(coords)}
          fill="none"
          stroke="var(--color-good)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={markerX}
          x2={markerX}
          y1={PAD_Y}
          y2={VB_H - PAD_Y}
          stroke="var(--color-fg-dim)"
          strokeWidth={1}
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={markerX}
          cy={markerY}
          r={1.2}
          fill="var(--color-good)"
          stroke="black"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-x-1 bottom-0 flex justify-between text-[10px] text-fg-faint font-mono-tnum pointer-events-none">
        <span>{minRate.toFixed(2)}%</span>
        <span className="text-fg-dim">savings @ rate sweep</span>
        <span>{maxRate.toFixed(2)}%</span>
      </div>
    </div>
  );
}
