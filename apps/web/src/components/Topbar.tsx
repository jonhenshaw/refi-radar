import { useEffect, useState } from 'react';
import { RadioTower } from 'lucide-react';

interface Props {
  liveCount: number;
  totalCount: number;
  usingDemo: boolean;
  freshnessText: string;
  targetRate: number;
  onTargetRateChange: (rate: number) => void;
}

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function Topbar({
  liveCount,
  totalCount,
  usingDemo,
  freshnessText,
  targetRate,
  onTargetRateChange,
}: Props) {
  const clock = useClock();
  const statusText = usingDemo
    ? 'demo data'
    : totalCount === 0
      ? 'syncing'
      : liveCount === totalCount
        ? `${liveCount} live`
        : `${liveCount}/${totalCount} live`;
  const tone = usingDemo ? 'warn' : liveCount === totalCount && totalCount > 0 ? 'good' : 'flat';

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3">
      <div className="flex items-center gap-2">
        <RadioTower className="h-4 w-4 text-fg" aria-hidden="true" />
        <span className="font-semibold tracking-tight text-fg">Refi Radar</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-[11px]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : 'bg-fg-dim'
          }`}
          aria-hidden="true"
        />
        <span className="font-mono-tnum uppercase tracking-wider text-fg-muted">{statusText}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-fg-dim">
          <span className="uppercase tracking-wider">Target</span>
          <span className="flex items-center rounded-sm border border-line px-1.5 focus-within:border-line-strong">
            <input
              type="number"
              step="0.05"
              min="0"
              max="20"
              value={targetRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onTargetRateChange(v);
              }}
              aria-label="Target rate"
              className="w-12 bg-transparent font-mono-tnum text-fg text-right outline-none"
            />
            <span className="font-mono-tnum text-fg-muted">%</span>
          </span>
        </label>
        <span className="hidden sm:inline-flex items-baseline gap-1 text-[11px] text-fg-dim">
          <span className="uppercase tracking-wider">UTC</span>
          <span className="font-mono-tnum text-fg-muted">{clock}</span>
        </span>
        <span className="hidden md:inline-flex text-[11px] text-fg-dim">{freshnessText}</span>
      </div>
    </header>
  );
}
