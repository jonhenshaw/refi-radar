import type { IntelField, RateIntel } from '@refi-radar/shared';

export interface IntelCellConfig {
  key: string;
  field: IntelField;
  sub?: string;
  /** Shown only on mobile to separate spot rates from spread context. */
  mobileSection?: 'spot' | 'spread';
}

export function buildIntelCells(intel: RateIntel): IntelCellConfig[] {
  return [
    { key: 'mnd', field: intel.mnd30y, sub: 'MND', mobileSection: 'spot' },
    { key: 'fred30', field: intel.fred30y, sub: 'PMMS', mobileSection: 'spot' },
    { key: 't10', field: intel.treasury10y, sub: 'DGS10', mobileSection: 'spot' },
    { key: 'spread', field: intel.spreadBps, sub: 'MND − 10Y', mobileSection: 'spread' },
    {
      key: 'spreadPct',
      field: intel.spreadPercentile1Y ?? { ...intel.spreadBps, value: undefined, label: 'Spread 1Y percentile' },
      sub: '1Y history',
      mobileSection: 'spread',
    },
    {
      key: 'vsHigh',
      field: intel.spreadVs52WeekHighBps ?? { ...intel.spreadBps, value: undefined, label: 'Spread vs 52w high' },
      sub: '52w high',
      mobileSection: 'spread',
    },
    {
      key: 'vsLow',
      field: intel.spreadVs52WeekLowBps ?? { ...intel.spreadBps, value: undefined, label: 'Spread vs 52w low' },
      sub: '52w low',
      mobileSection: 'spread',
    },
    {
      key: 'mndPct',
      field:
        intel.mortgage30yPercentile1Y ??
        { ...intel.mnd30y, value: undefined, label: '30Y 1Y percentile', unit: 'pct_rank', derivation: 'derived' },
      sub: 'MND 1Y',
      mobileSection: 'spread',
    },
  ];
}

export function formatIntelValue(field: IntelField): string {
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

export function formatIntelAsOf(field: IntelField): string | undefined {
  const iso = field.observedAt ?? field.fetchedAt;
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
