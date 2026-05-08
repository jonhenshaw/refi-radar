import { ExternalLink } from 'lucide-react';
import type { NewsItem } from '@refi-radar/shared';

import { relativeTime } from '../../lib/relativeTime';
import { NEWS_SOURCE_ABBREV, NEWS_SOURCE_TONE } from '../../lib/sourceTheme';

interface Props {
  item: NewsItem;
}

const TONE_CLASSES: Record<'info' | 'good' | 'warn' | 'accent' | 'bad', string> = {
  info: 'text-info border-info/30 bg-info/5',
  good: 'text-good border-good/30 bg-good/5',
  warn: 'text-warn border-warn/30 bg-warn/5',
  accent: 'text-accent border-accent/30 bg-accent/5',
  bad: 'text-bad border-bad/30 bg-bad/5',
};

export function NewsRow({ item }: Props) {
  const tone = NEWS_SOURCE_TONE[item.sourceId];
  const abbrev = NEWS_SOURCE_ABBREV[item.sourceId];

  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto] items-baseline gap-3 px-1 py-1.5 text-[12px]">
      <span
        className={`inline-flex h-4 min-w-[28px] items-center justify-center rounded-sm border px-1 font-mono-tnum text-[9px] uppercase tracking-wider ${TONE_CLASSES[tone]}`}
        aria-label={`${item.sourceId} source`}
      >
        {abbrev}
      </span>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="truncate text-fg hover:text-accent hover:underline underline-offset-2"
        title={item.summary ?? item.headline}
      >
        {item.headline}
      </a>
      <span className="hidden text-fg-faint sm:inline">
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </span>
      <span className="font-mono-tnum text-[10px] text-fg-dim whitespace-nowrap">
        {relativeTime(item.publishedAt)}
      </span>
    </li>
  );
}
