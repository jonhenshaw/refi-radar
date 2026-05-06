import type { LatestSnapshot, Range, RefiInput, RefiResult, SourceId } from '@refi-radar/shared';

export type RangeKey = Extract<Range, '5D' | '1M' | '3M' | '1Y'>;

export interface SeriesPoint {
  date: string;
  rate: number;
}

export interface RateSeries {
  sourceId: SourceId;
  label: string;
  color: string;
  points: SeriesPoint[];
}

interface ApiSeriesResponse {
  sourceId: SourceId;
  range: Range;
  points: Array<{ time: string; value: number }>;
}

interface ApiCompareResponse {
  range: Range;
  series: Partial<Record<SourceId, Array<{ time: string; value: number }>>>;
}

const comparedSources: SourceId[] = ['mnd_30y_fixed', 'fred_mortgage30us', 'fred_dgs10'];

const sourceMeta: Record<SourceId, { label: string; color: string }> = {
  mnd_30y_fixed: { label: 'MND 30Y Fixed', color: '#1D9BF0' },
  fred_mortgage30us: { label: 'FRED Mortgage30US', color: '#2ED47A' },
  fred_dgs10: { label: '10Y Treasury', color: '#A78BFA' },
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function getLatest(): Promise<LatestSnapshot> {
  return request<LatestSnapshot>('/api/latest');
}

export async function getSeries(sourceId: SourceId = 'mnd_30y_fixed', range: RangeKey = '1M'): Promise<RateSeries> {
  const response = await request<ApiSeriesResponse>(`/api/series?source=${encodeURIComponent(sourceId)}&range=${range}`);
  const meta = sourceMeta[sourceId];
  return {
    sourceId,
    label: meta.label,
    color: meta.color,
    points: response.points.map((point) => ({ date: point.time.slice(0, 10), rate: point.value })),
  };
}

export async function getCompareSeries(range: RangeKey = '1M'): Promise<RateSeries[]> {
  const sources = comparedSources.join(',');
  const response = await request<ApiCompareResponse>(`/api/series/compare?sources=${encodeURIComponent(sources)}&range=${range}`);
  return comparedSources.map((sourceId) => {
    const meta = sourceMeta[sourceId];
    return {
      sourceId,
      label: meta.label,
      color: meta.color,
      points: (response.series[sourceId] ?? []).map((point) => ({ date: point.time.slice(0, 10), rate: point.value })),
    };
  });
}

export function calculateRefi(input: RefiInput): Promise<RefiResult> {
  return request<RefiResult>('/api/refi/calculate', {
    method: 'POST',
    body: JSON.stringify({
      currentBalance: input.balance,
      currentRate: input.currentRate,
      remainingMonths: input.termYears * 12,
      newRate: input.newRate,
      closingCosts: input.closingCosts,
    }),
  });
}
