import type { IntelField, RateIntel } from '@refi-radar/shared';

import { CONFIDENCE_LABELS, SOURCE_LABELS } from '../lib/sourceTheme';

interface Props {
  intel: RateIntel | undefined;
  derivedOnClient?: boolean;
  usingDemo?: boolean;
  loading?: boolean;
  hasSources?: boolean;
}

function formatValue(field: IntelField): string {
  if (field.value === undefined || !Number.isFinite(field.value)) return '—';
  if (field.unit === 'percent') return `${field.value.toFixed(2)}%`;
  if (field.unit === 'pct_rank') return `${field.value}th`;
  if (field.unit === 'bps') {
    if (field.label.includes('vs')) {
      const sign = field.value > 0 ? '+' : field.value < 0 ? '−' : '';
      return `${sign}${Math.abs(field.value)} bps`;
    }
    return `${field.value} bps`;
  }
  return String(field.value);
}

function formatAsOf(field: IntelField): string | undefined {
  const iso = field.observedAt ?? field.fetchedAt;
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function sourceLine(field: IntelField): string {
  if (field.derivation === 'direct' && field.sourceId) {
    return SOURCE_LABELS[field.sourceId];
  }
  if (field.sourceIds?.length) {
    return field.sourceIds.map((id) => SOURCE_LABELS[id]).join(' − ');
  }
  return 'Derived';
}

function metaLine(field: IntelField, usingDemo: boolean): string {
  if (usingDemo) return 'Sample data';
  if (field.unavailableReason) return field.unavailableReason;
  const parts: string[] = [];
  if (field.confidence) parts.push(CONFIDENCE_LABELS[field.confidence]);
  const asOf = formatAsOf(field);
  if (asOf) parts.push(`as of ${asOf}`);
  if (field.stale) parts.push('stale');
  return parts.join(' · ') || sourceLine(field);
}

interface CellConfig {
  key: string;
  field: IntelField;
  sub?: string;
}

export function IntelStrip({
  intel,
  derivedOnClient = false,
  usingDemo = false,
  loading = false,
  hasSources = false,
}: Props) {
  if (!intel) {
    return (
      <section
        aria-label="Rate intelligence"
        className="border border-line rounded-md bg-surface-1/40 px-3 py-3 text-[12px] text-fg-muted"
      >
        {loading
          ? 'Loading rate intelligence…'
          : hasSources
            ? 'Rate intelligence unavailable — history still loading.'
            : 'Rate intelligence unavailable — waiting for source observations.'}
      </section>
    );
  }

  const resolvedCells: CellConfig[] = [
    { key: 'mnd', field: intel.mnd30y, sub: 'MND' },
    { key: 'fred30', field: intel.fred30y, sub: 'PMMS' },
    { key: 't10', field: intel.treasury10y, sub: 'DGS10' },
    { key: 'spread', field: intel.spreadBps, sub: 'MND − 10Y' },
    { key: 'spreadPct', field: intel.spreadPercentile1Y ?? { ...intel.spreadBps, value: undefined }, sub: '1Y history' },
    { key: 'vsHigh', field: intel.spreadVs52WeekHighBps ?? { ...intel.spreadBps, value: undefined, label: 'Spread vs 52w high' }, sub: '52w high' },
    { key: 'vsLow', field: intel.spreadVs52WeekLowBps ?? { ...intel.spreadBps, value: undefined, label: 'Spread vs 52w low' }, sub: '52w low' },
    {
      key: 'mndPct',
      field: intel.mortgage30yPercentile1Y ?? { ...intel.mnd30y, value: undefined, label: '30Y 1Y percentile', unit: 'pct_rank', derivation: 'derived' },
      sub: 'MND 1Y',
    },
  ];

  return (
    <section aria-label="Rate intelligence" className="border border-line rounded-md bg-surface-1/40">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Rate intel</p>
        <p className="text-[10px] uppercase tracking-wider text-fg-faint">
          {usingDemo
            ? 'Sample data'
            : derivedOnClient
              ? 'Computed in browser from live sources + history'
              : 'Labeled sources · no invented rates'}
        </p>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-line">
        {resolvedCells.map((cell) => {
          const unavailable = cell.field.value === undefined;
          const toneClass = unavailable ? 'text-fg-faint' : 'text-fg';
          return (
            <article key={cell.key} className="flex flex-col gap-1 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-fg-dim">{cell.field.label}</p>
              <p className={`font-mono-tnum text-base font-medium ${toneClass}`}>{formatValue(cell.field)}</p>
              <p className="text-[10px] text-fg-faint truncate" title={metaLine(cell.field, usingDemo)}>
                {cell.sub ? `${cell.sub} · ` : ''}
                {metaLine(cell.field, usingDemo)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
