import { describe, expect, it } from 'vitest';
import { parseFiscalDataAuctions, parseTreasuryAuctions, treasuryAuctionsConfig, treasuryPressReleaseLinksToNewsItems } from './treasuryAuctions';

const FISCAL_DATA_FIXTURE = JSON.stringify({
  data: [
    {
      cusip: '912797TE7',
      security_type: 'Bill',
      security_term: '6-Week',
      announcemt_date: '2026-05-07',
      auction_date: '2026-05-12',
      issue_date: '2026-05-14',
      maturity_date: '2026-06-25',
      offering_amt: '80000000000',
      auction_format: 'Single-Price',
    },
  ],
});

describe('treasuryAuctions collector', () => {
  it('uses the Treasury press releases page instead of TLS-problematic TreasuryDirect/FiscalData API endpoints', () => {
    expect(treasuryAuctionsConfig.feedUrl).toBe('https://home.treasury.gov/news/press-releases?field_press_release_type_target_id=446');
  });

  it('parses Fiscal Data auction rows into news items', () => {
    const fetchedAt = '2026-05-09T16:00:00.000Z';
    const items = parseTreasuryAuctions(FISCAL_DATA_FIXTURE, fetchedAt);

    expect(parseFiscalDataAuctions(FISCAL_DATA_FIXTURE)).toHaveLength(1);
    expect(items).toEqual([
      expect.objectContaining({
        sourceId: 'treasury_auctions',
        category: 'auctions',
        fetchedAt,
        headline: 'Treasury announces 6-Week Bill auction for 2026-05-12',
        publishedAt: '2026-05-07T00:00:00.000Z',
        summary: '$80B offering; issues 2026-05-14; matures 2026-06-25; Single-Price auction',
      }),
    ]);
  });

  it('parses Treasury press release HTML into auction/refunding news items', () => {
    const fetchedAt = '2026-05-09T16:00:00.000Z';
    const html = `<!doctype html><html><body>
      <time datetime="2026-05-06T13:00:00Z">May 6, 2026</time>
      <h3><a href="/news/press-releases/sb0489">Quarterly Refunding Statement of Deputy Assistant Secretary for Federal Finance Brian Smith</a></h3>
      <time datetime="2026-05-07T14:30:00Z">May 7, 2026</time>
      <h3><a href="/news/press-releases/sb0492">Unrelated sanctions headline</a></h3>
    </body></html>`;

    expect(treasuryPressReleaseLinksToNewsItems(html, fetchedAt)).toEqual([
      expect.objectContaining({
        sourceId: 'treasury_auctions',
        category: 'auctions',
        fetchedAt,
        headline: 'Quarterly Refunding Statement of Deputy Assistant Secretary for Federal Finance Brian Smith',
        url: 'https://home.treasury.gov/news/press-releases/sb0489',
        publishedAt: '2026-05-06T13:00:00.000Z',
      }),
    ]);
  });
});
