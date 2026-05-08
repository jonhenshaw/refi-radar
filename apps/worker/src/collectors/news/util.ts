import type { NewsCategory, NewsSourceId } from '@refi-radar/shared';
import type { NewsItemInput, SourceInput } from '../../db/queries';

export interface RssCollectorConfig {
  source: SourceInput & { id: NewsSourceId };
  category: NewsCategory;
  feedUrl: string;
}

export interface ParsedRssItem {
  title: string;
  link: string;
  publishedAt: string;
  summary?: string;
}

const USER_AGENT = 'RefiRadar/0.1 personal mortgage-rate monitor (+https://refi-radar.pages.dev)';

export async function fetchFeedText(url: string, timeoutMs = 8_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept:
          'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.5',
      },
    });
    if (!response.ok) {
      throw new Error(`Feed ${url} failed: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

const ENTITY_MAP: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

export function decodeEntities(value: string): string {
  return value
    .replace(/&(?:lt|gt|amp|quot|apos|nbsp|mdash|ndash|hellip|rsquo|lsquo|ldquo|rdquo);/g, (match) => ENTITY_MAP[match] ?? match)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

export function extractTag(itemXml: string, tag: string): string | undefined {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const match = itemXml.match(re);
  if (!match) return undefined;
  return decodeEntities(stripCdata(match[1])).trim();
}

function extractAtomLink(itemXml: string): string | undefined {
  const match = itemXml.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i);
  return match ? decodeEntities(match[1]) : undefined;
}

function normalizeDate(input: string | undefined): string {
  if (!input) return new Date().toISOString();
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

export function parseRssItems(xml: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  for (const block of blocks) {
    const title = extractTag(block, 'title');
    if (!title) continue;

    let link = extractTag(block, 'link');
    if (!link || !/^https?:\/\//i.test(link)) {
      const atomLink = extractAtomLink(block);
      if (atomLink) link = atomLink;
    }
    if (!link) continue;

    const dateRaw =
      extractTag(block, 'pubDate') ??
      extractTag(block, 'published') ??
      extractTag(block, 'updated') ??
      extractTag(block, 'dc:date');
    const publishedAt = normalizeDate(dateRaw);

    const summaryRaw =
      extractTag(block, 'description') ??
      extractTag(block, 'summary') ??
      extractTag(block, 'content:encoded') ??
      extractTag(block, 'content');
    const summary = summaryRaw ? stripTags(summaryRaw).replace(/\s+/g, ' ').trim() : undefined;

    items.push({ title, link, publishedAt, summary });
  }
  return items;
}

export function rssItemsToNewsItems(
  items: ParsedRssItem[],
  config: RssCollectorConfig,
  fetchedAt: string,
  maxItems = 30,
): NewsItemInput[] {
  return items.slice(0, maxItems).map((item) => ({
    sourceId: config.source.id,
    headline: item.title,
    summary: item.summary,
    url: item.link,
    publishedAt: item.publishedAt,
    fetchedAt,
    category: config.category,
    raw: { feedUrl: config.feedUrl },
  }));
}
