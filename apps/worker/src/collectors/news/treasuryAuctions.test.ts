import { describe, expect, it } from 'vitest';
import { parseFiscalDataAuctions, parseTreasuryAuctions, treasuryAuctionsConfig } from './treasuryAuctions';

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
  it('uses the Fiscal Data auctions API instead of the TreasuryDirect RSS endpoint', () => {
    expect(treasuryAuctionsConfig.feedUrl).toContain('api.fiscaldata.treasury.gov');
    expect(treasuryAuctionsConfig.feedUrl).toContain('/auctions_query');
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
});
