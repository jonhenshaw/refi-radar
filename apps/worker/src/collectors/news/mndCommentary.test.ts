import { describe, expect, it } from 'vitest';
import { mndCommentaryConfig } from './mndCommentary';

describe('mndCommentary collector', () => {
  it('uses the current Mortgage News Daily RSS URL', () => {
    expect(mndCommentaryConfig.feedUrl).toBe('https://www.mortgagenewsdaily.com/rss/news');
  });
});
