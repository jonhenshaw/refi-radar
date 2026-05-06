import type { ObservationInput } from '../db/queries';

const MND_URL = 'https://www.mortgagenewsdaily.com/mortgage-rates';

export function parseMndThirtyYearFixed(html: string): ObservationInput {
  const observedAt = extractLastUpdated(html) ?? new Date().toISOString();
  const headerRate = matchRateNearProduct(html, /30YR\s+Fixed\s+Rate/i);
  const bodyRate = matchRateNearProduct(html, /30\s*Yr\.\s*Fixed/i);
  const rate = headerRate ?? bodyRate;
  const changeBps = extractChangeBps(html, rate);

  if (rate === undefined) {
    throw new Error('Unable to parse MND 30Y fixed rate');
  }

  return {
    sourceId: 'mnd_30y_fixed',
    observedAt,
    fetchedAt: new Date().toISOString(),
    rate,
    changeBps,
    confidence: 'market_estimate',
    raw: { sourceUrl: MND_URL },
  };
}

export async function fetchMndThirtyYearFixed(timeoutMs = 10_000): Promise<ObservationInput> {
  const controller = new AbortController();
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error(`MND request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  const request = (async () => {
    const response = await fetch(MND_URL, {
      signal: controller.signal,
      headers: {
        'user-agent': 'RefiRadar/0.1 personal mortgage-rate monitor (+https://refi-radar.pages.dev)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      throw new Error(`MND request failed: ${response.status}`);
    }
    return parseMndThirtyYearFixed(await response.text());
  })();

  return Promise.race([request, timeout]);
}

export const mndSource = {
  id: 'mnd_30y_fixed',
  name: 'Mortgage News Daily 30Y Fixed',
  kind: 'market_estimate',
  url: MND_URL,
  cadenceMinutes: 15,
};

function extractLastUpdated(html: string): string | undefined {
  const match = html.match(/<meta\s+property=["']og:last_updated["']\s+content=["']([^"']+)["']/i);
  if (!match) return undefined;
  const normalized = match[1].replace(/(\.\d{3})\d+Z$/, '$1Z');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function matchRateNearProduct(html: string, product: RegExp): number | undefined {
  const productMatch = product.exec(html);
  if (!productMatch?.index) return undefined;
  const window = html.slice(productMatch.index, productMatch.index + 2_500);
  const priceMatch = window.match(/<(?:div|span)[^>]*class=["'][^"']*(?:price|rate)[^"']*["'][^>]*>\s*([0-9]+(?:\.[0-9]+)?)\s*%/i);
  if (!priceMatch) return undefined;
  const rate = Number(priceMatch[1]);
  return Number.isFinite(rate) ? rate : undefined;
}

function extractChangeBps(html: string, parsedRate?: number): number | undefined {
  const marker = html.search(/30YR\s+Fixed\s+Rate/i);
  if (marker < 0) return undefined;
  const window = html.slice(marker, marker + 1_000);
  const regex = /<div[^>]*class=["'][^"']*rate[^"']*["'][^>]*>\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*%?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(window))) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value !== parsedRate) {
      return Math.round(value * 100);
    }
  }
  return undefined;
}
