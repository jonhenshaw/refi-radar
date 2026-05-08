import type { NewsItemInput } from '../../db/queries';
import { fetchFeedText, parseRssItems, rssItemsToNewsItems, type RssCollectorConfig } from './util';

const FEED_URL = 'https://www.treasurydirect.gov/TA_WS/securities/announced/rss?format=rss';

export const treasuryAuctionsConfig: RssCollectorConfig = {
  source: {
    id: 'treasury_auctions',
    name: 'Treasury Direct Auctions',
    kind: 'news_feed',
    url: FEED_URL,
    cadenceMinutes: 240,
  },
  category: 'auctions',
  feedUrl: FEED_URL,
};

export async function fetchTreasuryAuctions(): Promise<string> {
  return fetchFeedText(treasuryAuctionsConfig.feedUrl);
}

export function parseTreasuryAuctions(xml: string, fetchedAt = new Date().toISOString()): NewsItemInput[] {
  return rssItemsToNewsItems(parseRssItems(xml), treasuryAuctionsConfig, fetchedAt);
}
