import type { NewsItemInput } from '../../db/queries';
import { fetchFeedText, parseRssItems, rssItemsToNewsItems, type RssCollectorConfig } from './util';

const FEED_URL = 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse';

export const marketwatchBondsConfig: RssCollectorConfig = {
  source: {
    id: 'marketwatch_bonds',
    name: 'MarketWatch Market Pulse',
    kind: 'news_feed',
    url: FEED_URL,
    cadenceMinutes: 30,
  },
  category: 'markets',
  feedUrl: FEED_URL,
};

export async function fetchMarketwatchBonds(): Promise<string> {
  return fetchFeedText(marketwatchBondsConfig.feedUrl);
}

export function parseMarketwatchBonds(xml: string, fetchedAt = new Date().toISOString()): NewsItemInput[] {
  return rssItemsToNewsItems(parseRssItems(xml), marketwatchBondsConfig, fetchedAt);
}
