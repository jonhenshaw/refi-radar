import type { LatestSnapshot, Range, RefiInput, RefiResult, SourceId } from '@refi-radar/shared';

import { SOURCE_COLORS, SOURCE_LABELS_LONG, SOURCE_ORDER } from './sourceTheme';

export type RangeKey = Range;

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

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
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
  return {
    sourceId,
    label: SOURCE_LABELS_LONG[sourceId],
    color: SOURCE_COLORS[sourceId],
    points: response.points.map((point) => ({ date: point.time.slice(0, 10), rate: point.value })),
  };
}

export async function getCompareSeries(range: RangeKey = '1M'): Promise<RateSeries[]> {
  const sources = SOURCE_ORDER.join(',');
  const response = await request<ApiCompareResponse>(`/api/series/compare?sources=${encodeURIComponent(sources)}&range=${range}`);
  return SOURCE_ORDER.map((sourceId) => ({
    sourceId,
    label: SOURCE_LABELS_LONG[sourceId],
    color: SOURCE_COLORS[sourceId],
    points: (response.series[sourceId] ?? []).map((point) => ({ date: point.time.slice(0, 10), rate: point.value })),
  }));
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
