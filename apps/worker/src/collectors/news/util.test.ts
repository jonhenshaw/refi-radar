import { describe, expect, it } from 'vitest';
import { decodeEntities, parseRssItems, rssItemsToNewsItems } from './util';

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed</title>
    <link>https://example.com</link>
    <description>Channel description that should not become an item</description>
    <item>
      <title><![CDATA[Fed holds rates steady &amp; signals patience]]></title>
      <link>https://example.com/a</link>
      <pubDate>Wed, 06 May 2026 18:00:00 GMT</pubDate>
      <description><![CDATA[<p>Markets reacted <strong>positively</strong>.</p>]]></description>
    </item>
    <item>
      <title>10-year yield slips to 4.10%</title>
      <link>https://example.com/b</link>
      <pubDate>Wed, 06 May 2026 14:30:00 GMT</pubDate>
      <description>Treasury yields eased after softer CPI data.</description>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Atom</title>
  <entry>
    <title>Treasury announces 10-year reopening</title>
    <link href="https://example.com/atom-a"/>
    <published>2026-05-06T12:00:00Z</published>
    <summary>Auction details below.</summary>
  </entry>
</feed>`;

describe('news/util parseRssItems', () => {
  it('extracts items from RSS 2.0, decoding CDATA + entities and stripping HTML in summaries', () => {
    const items = parseRssItems(RSS_FIXTURE);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: 'Fed holds rates steady & signals patience',
      link: 'https://example.com/a',
      summary: 'Markets reacted positively.',
    });
    expect(items[0].publishedAt).toMatch(/2026-05-06T18:00:00/);
  });

  it('extracts items from Atom using <link href> and <published>', () => {
    const items = parseRssItems(ATOM_FIXTURE);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Treasury announces 10-year reopening',
      link: 'https://example.com/atom-a',
      summary: 'Auction details below.',
    });
    expect(items[0].publishedAt).toMatch(/2026-05-06T12:00:00/);
  });

  it('does not pick up channel-level title as an item', () => {
    const items = parseRssItems(RSS_FIXTURE);
    expect(items.find((i) => i.title === 'Sample Feed')).toBeUndefined();
  });

  it('decodes named and numeric entities', () => {
    expect(decodeEntities('AT&amp;T &mdash; 10y at 4&#37;')).toBe('AT&T — 10y at 4%');
  });
});

describe('news/util rssItemsToNewsItems', () => {
  it('maps to NewsItemInput tagged with the configured source + category', () => {
    const fetchedAt = '2026-05-06T18:30:00.000Z';
    const items = rssItemsToNewsItems(
      parseRssItems(RSS_FIXTURE),
      {
        source: { id: 'fed_press', name: 'Fed', kind: 'news_feed' },
        category: 'fed',
        feedUrl: 'https://example.com/feed.xml',
      },
      fetchedAt,
    );
    expect(items[0]).toMatchObject({
      sourceId: 'fed_press',
      category: 'fed',
      fetchedAt,
      url: 'https://example.com/a',
    });
  });
});
