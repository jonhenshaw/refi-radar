import type { NewsItemInput } from '../../db/queries';
import { fetchFeedText, parseRssItems, rssItemsToNewsItems, type RssCollectorConfig } from './util';

export const fedPressConfig: RssCollectorConfig = {
  source: {
    id: 'fed_press',
    name: 'Federal Reserve Press Releases',
    kind: 'news_feed',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    cadenceMinutes: 60,
  },
  category: 'fed',
  feedUrl: 'https://www.federalreserve.gov/feeds/press_all.xml',
};

export async function fetchFedPress(): Promise<string> {
  return fetchFeedText(fedPressConfig.feedUrl);
}

export function parseFedPress(xml: string, fetchedAt = new Date().toISOString()): NewsItemInput[] {
  return rssItemsToNewsItems(parseRssItems(xml), fedPressConfig, fetchedAt);
}
