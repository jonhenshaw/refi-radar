interface Props {
  rate: number | undefined;
  targetRate: number;
}

const LEVELS = [5.5, 5.75, 6.0, 6.25, 6.5, 6.75, 7.0, 7.25];

export function KeyLevels({ rate, targetRate }: Props) {
  const sorted = [...LEVELS, targetRate].sort((a, b) => a - b);
  const above = typeof rate === 'number' ? sorted.find((l) => l > rate) : undefined;
  const below = typeof rate === 'number' ? [...sorted].reverse().find((l) => l < rate) : undefined;

  return (
    <section
      aria-label="Key rate levels"
      className="flex flex-col gap-3 border border-line rounded-md bg-surface-1/40 p-4"
    >
      <header className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Key levels</p>
        <p className="text-[10px] uppercase tracking-wider text-fg-faint">round numbers · psychological</p>
      </header>

      <ul className="grid gap-px bg-line">
        {sorted.map((level) => {
          const isTarget = level === targetRate;
          const isCurrent = typeof rate === 'number' && Math.abs(rate - level) < 0.005;
          const isAbove = above === level;
          const isBelow = below === level;
          const distanceBps =
            typeof rate === 'number' ? Math.round((level - rate) * 100) : undefined;

          return (
            <li
              key={`${level}-${isTarget}`}
              className={`flex items-center gap-3 px-3 py-1.5 ${
                isAbove || isBelow ? 'bg-surface-2' : 'bg-surface-1'
              }`}
            >
              <span
                className={`font-mono-tnum text-sm ${
                  isTarget
                    ? 'text-accent font-semibold'
                    : isCurrent
                      ? 'text-fg font-semibold'
                      : 'text-fg-muted'
                }`}
              >
                {level.toFixed(2)}%
              </span>
              {isTarget ? (
                <span className="rounded-xs border border-accent/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                  target
                </span>
              ) : null}
              {isCurrent ? (
                <span className="rounded-xs border border-line-strong px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg">
                  current
                </span>
              ) : null}
              <span className="ml-auto font-mono-tnum text-[11px] text-fg-dim">
                {typeof distanceBps === 'number'
                  ? distanceBps === 0
                    ? '—'
                    : `${distanceBps > 0 ? '+' : ''}${distanceBps} bps`
                  : '—'}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] leading-relaxed text-fg-muted">
        Refis usually pencil out when your quoted rate is 50–75 bps below your note rate
        <span className="text-fg-dim"> and</span> closing costs break even inside your hold horizon.
      </p>
    </section>
  );
}
