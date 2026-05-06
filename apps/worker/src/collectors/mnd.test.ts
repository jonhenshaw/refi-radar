import { describe, expect, it, vi } from 'vitest';
import { fetchMndThirtyYearFixed, parseMndThirtyYearFixed } from './mnd';

describe('MND collector', () => {
  it('parses the header 30YR fixed rate, change, and last updated timestamp', () => {
    const html = `
      <meta property="og:last_updated" content="2026-05-05T17:28:45.4990000Z" />
      <div class="product">30YR Fixed Rate</div>
      <div class="price">6.54%</div>
      <div class="rate rate-down">-0.02%</div>
    `;

    expect(parseMndThirtyYearFixed(html)).toMatchObject({
      sourceId: 'mnd_30y_fixed',
      observedAt: '2026-05-05T17:28:45.499Z',
      rate: 6.54,
      changeBps: -2,
      confidence: 'market_estimate',
    });
  });

  it('parses the body rate card as fallback', () => {
    const html = `
      <div class="rate-product-name"><a>30 Yr. Fixed</a></div>
      <div class="rate">6.61%</div>
      <div class="rate-daily-chg change rate-down">-0.01</div>
    `;

    expect(parseMndThirtyYearFixed(html)).toMatchObject({ rate: 6.61 });
  });

  it('fetches and parses the live HTML response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(`
      <meta property="og:last_updated" content="2026-05-05T17:28:45.4990000Z" />
      <div class="product">30YR Fixed Rate</div><div class="price">6.54%</div>
    `));

    await expect(fetchMndThirtyYearFixed()).resolves.toMatchObject({ sourceId: 'mnd_30y_fixed', rate: 6.54 });
    expect(fetchMock).toHaveBeenCalledWith('https://www.mortgagenewsdaily.com/mortgage-rates', expect.objectContaining({ headers: expect.objectContaining({ accept: 'text/html,application/xhtml+xml' }) }));
    fetchMock.mockRestore();
  });
});
