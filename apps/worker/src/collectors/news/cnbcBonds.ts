import type { NewsItemInput } from '../../db/queries';
import { fetchFeedText, parseRssItems, rssItemsToNewsItems, type RssCollectorConfig } from './util';

const FEED_URL = 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664';

export const cnbcBondsConfig: RssCollectorConfig = {
  source: {
    id: 'cnbc_bonds',
    name: 'CNBC Bonds',
    kind: 'news_feed',
    url: FEED_URL,
    cadenceMinutes: 30,
  },
  category: 'markets',
  feedUrl: FEED_URL,
};

export async function fetchCnbcBonds(): Promise<string> {
  return fetchFeedText(cnbcBondsConfig.feedUrl);
}

export function parseCnbcBonds(xml: string, fetchedAt = new Date().toISOString()): NewsItemInput[] {
  return rssItemsToNewsItems(parseRssItems(xml), cnbcBondsConfig, fetchedAt);
}
