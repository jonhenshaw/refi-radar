import type { NewsItemInput } from '../../db/queries';
import { fetchFeedText, parseRssItems, rssItemsToNewsItems, type RssCollectorConfig } from './util';

const FEED_URL = 'https://www.mortgagenewsdaily.com/rss/news.xml';

export const mndCommentaryConfig: RssCollectorConfig = {
  source: {
    id: 'mnd_commentary',
    name: 'Mortgage News Daily',
    kind: 'news_feed',
    url: FEED_URL,
    cadenceMinutes: 30,
  },
  category: 'mortgage',
  feedUrl: FEED_URL,
};

export async function fetchMndCommentary(): Promise<string> {
  return fetchFeedText(mndCommentaryConfig.feedUrl);
}

export function parseMndCommentary(xml: string, fetchedAt = new Date().toISOString()): NewsItemInput[] {
  return rssItemsToNewsItems(parseRssItems(xml), mndCommentaryConfig, fetchedAt);
}
