import type { NewsItemInput } from '../../db/queries';
import { decodeEntities, fetchFeedText, parseRssItems, rssItemsToNewsItems, stripTags, type RssCollectorConfig } from './util';

const FEED_URL = 'https://home.treasury.gov/news/press-releases?field_press_release_type_target_id=446';
const HOME_TREASURY_BASE_URL = 'https://home.treasury.gov';

export const treasuryAuctionsConfig: RssCollectorConfig = {
  source: {
    id: 'treasury_auctions',
    name: 'Treasury Auction/Refunding Announcements',
    kind: 'news_feed',
    url: FEED_URL,
    cadenceMinutes: 240,
  },
  category: 'auctions',
  feedUrl: FEED_URL,
};

interface FiscalDataAuctionResponse {
  data?: FiscalDataAuctionRow[];
}

interface FiscalDataAuctionRow {
  cusip?: string | null;
  security_type?: string | null;
  security_term?: string | null;
  announcemt_date?: string | null;
  auction_date?: string | null;
  issue_date?: string | null;
  maturity_date?: string | null;
  offering_amt?: string | null;
  auction_format?: string | null;
}

export async function fetchTreasuryAuctions(): Promise<string> {
  return fetchFeedText(treasuryAuctionsConfig.feedUrl, 20_000);
}

export function parseTreasuryAuctions(payload: string, fetchedAt = new Date().toISOString()): NewsItemInput[] {
  const trimmed = payload.trim();
  if (trimmed.startsWith('{')) {
    return fiscalDataAuctionsToNewsItems(parseFiscalDataAuctions(trimmed), fetchedAt);
  }

  if (/<!doctype html|<html\b/i.test(trimmed)) {
    return treasuryPressReleaseLinksToNewsItems(trimmed, fetchedAt);
  }

  return rssItemsToNewsItems(parseRssItems(payload), treasuryAuctionsConfig, fetchedAt);
}

export function parseFiscalDataAuctions(json: string): FiscalDataAuctionRow[] {
  const parsed = JSON.parse(json) as FiscalDataAuctionResponse;
  return Array.isArray(parsed.data) ? parsed.data : [];
}

export function treasuryPressReleaseLinksToNewsItems(html: string, fetchedAt: string): NewsItemInput[] {
  const items: NewsItemInput[] = [];
  const releaseRe = /<time\s+datetime=["']([^"']+)["'][^>]*>[\s\S]*?<a\s+href=["']([^"']*\/news\/press-releases\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = releaseRe.exec(html)) && items.length < 30) {
    const headline = decodeEntities(stripTags(match[3])).replace(/\s+/g, ' ').trim();
    if (!isAuctionRelatedTreasuryRelease(headline)) continue;

    const href = decodeEntities(match[2]);
    const url = href.startsWith('http') ? href : `${HOME_TREASURY_BASE_URL}${href}`;
    items.push({
      sourceId: treasuryAuctionsConfig.source.id,
      headline,
      summary: 'Treasury financing, borrowing, quarterly refunding, or auction-related press release.',
      url,
      publishedAt: normalizeDate(match[1]),
      fetchedAt,
      category: treasuryAuctionsConfig.category,
      raw: { feedUrl: treasuryAuctionsConfig.feedUrl },
    });
  }
  return items;
}

function isAuctionRelatedTreasuryRelease(headline: string): boolean {
  return /quarterly refunding|borrowing|treasury borrowing advisory committee|marketable borrowing|auction/i.test(headline);
}

function fiscalDataAuctionsToNewsItems(rows: FiscalDataAuctionRow[], fetchedAt: string): NewsItemInput[] {
  return rows.flatMap((row) => {
    const cusip = clean(row.cusip);
    const securityType = clean(row.security_type);
    const securityTerm = clean(row.security_term);
    const auctionDate = clean(row.auction_date);
    const announcementDate = clean(row.announcemt_date);
    if (!cusip || !securityType || !securityTerm || !auctionDate) return [];

    const offering = formatOfferingAmount(clean(row.offering_amt));
    const issueDate = clean(row.issue_date);
    const maturityDate = clean(row.maturity_date);
    const details = [
      offering ? `${offering} offering` : undefined,
      issueDate ? `issues ${issueDate}` : undefined,
      maturityDate ? `matures ${maturityDate}` : undefined,
      clean(row.auction_format) ? `${clean(row.auction_format)} auction` : undefined,
    ].filter(Boolean);

    return [{
      sourceId: treasuryAuctionsConfig.source.id,
      headline: `Treasury announces ${securityTerm} ${securityType} auction for ${auctionDate}`,
      summary: details.length > 0 ? details.join('; ') : undefined,
      url: `${HOME_TREASURY_BASE_URL}/news/press-releases#${encodeURIComponent(cusip)}`,
      publishedAt: normalizeDate(announcementDate ?? auctionDate),
      fetchedAt,
      category: treasuryAuctionsConfig.category,
      raw: { feedUrl: treasuryAuctionsConfig.feedUrl, cusip },
    } satisfies NewsItemInput];
  });
}

function clean(value: string | null | undefined): string | undefined {
  if (!value || value === 'null') return undefined;
  return value;
}

function normalizeDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatOfferingAmount(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return undefined;
  if (amount >= 1_000_000_000) return `$${Math.round(amount / 1_000_000_000)}B`;
  if (amount >= 1_000_000) return `$${Math.round(amount / 1_000_000)}M`;
  return `$${amount.toLocaleString('en-US')}`;
}
