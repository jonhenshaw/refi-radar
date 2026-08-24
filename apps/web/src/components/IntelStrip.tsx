import type { IntelField, RateIntel } from '@refi-radar/shared';

import { CONFIDENCE_LABELS, SOURCE_LABELS } from '../lib/sourceTheme';
import {
  buildIntelCells,
  formatIntelAsOf,
  formatIntelValue,
  type IntelCellConfig,
} from './intelStripModel';

interface Props {
  intel: RateIntel | undefined;
  derivedOnClient?: boolean;
  usingDemo?: boolean;
  loading?: boolean;
  hasSources?: boolean;
}

function sourceLine(field: IntelField): string {
  if (field.derivation === 'direct' && field.sourceId) {
    return SOURCE_LABELS[field.sourceId];
  }
  if (field.sourceIds?.length) {
    return field.sourceIds.map((id) => SOURCE_LABELS[id]).join(' − ');
  }
  return 'Derived';
}

function metaLine(field: IntelField, usingDemo: boolean): string {
  if (usingDemo) return 'Sample data';
  if (field.unavailableReason) return field.unavailableReason;
  const parts: string[] = [];
  if (field.confidence) parts.push(CONFIDENCE_LABELS[field.confidence]);
  const asOf = formatIntelAsOf(field);
  if (asOf) parts.push(`as of ${asOf}`);
  if (field.stale) parts.push('stale');
  return parts.join(' · ') || sourceLine(field);
}

function IntelRow({ cell, usingDemo }: { cell: IntelCellConfig; usingDemo: boolean }) {
  const unavailable = cell.field.value === undefined;
  const toneClass = unavailable ? 'text-fg-faint' : 'text-fg';
  const meta = metaLine(cell.field, usingDemo);

  return (
    <article className="min-w-0 border-b border-line px-3 py-3 last:border-b-0 lg:border-b-0 lg:px-3 lg:py-2.5">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <p className="min-w-0 flex-1 text-[10px] uppercase tracking-wider text-fg-dim leading-snug">
          {cell.field.label}
        </p>
        <p className={`shrink-0 font-mono-tnum text-base font-medium ${toneClass}`}>{formatIntelValue(cell.field)}</p>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-fg-faint break-words" title={meta}>
        {cell.sub ? `${cell.sub} · ` : ''}
        {meta}
      </p>
    </article>
  );
}

function headerCaption(derivedOnClient: boolean, usingDemo: boolean): string {
  if (usingDemo) return 'Sample data';
  if (derivedOnClient) return 'Client-computed · live sources';
  return 'Labeled · no invented rates';
}

function headerCaptionLong(derivedOnClient: boolean, usingDemo: boolean): string {
  if (usingDemo) return 'Sample data';
  if (derivedOnClient) return 'Computed in browser from live sources + history';
  return 'Labeled sources · no invented rates';
}

export function IntelStrip({
  intel,
  derivedOnClient = false,
  usingDemo = false,
  loading = false,
  hasSources = false,
}: Props) {
  if (!intel) {
    return (
      <section
        aria-label="Rate intelligence"
        className="border border-line rounded-md bg-surface-1/40 px-3 py-3 text-[12px] text-fg-muted"
      >
        {loading
          ? 'Loading rate intelligence…'
          : hasSources
            ? 'Rate intelligence unavailable — history still loading.'
            : 'Rate intelligence unavailable — waiting for source observations.'}
      </section>
    );
  }

  const cells = buildIntelCells(intel);
  const caption = headerCaption(derivedOnClient, usingDemo);
  const captionLong = headerCaptionLong(derivedOnClient, usingDemo);

  return (
    <section aria-label="Rate intelligence" className="overflow-hidden border border-line rounded-md bg-surface-1/40">
      <header className="flex flex-col gap-1 border-b border-line px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Rate intel</p>
        <p className="text-[10px] uppercase tracking-wider text-fg-faint lg:hidden">{caption}</p>
        <p className="hidden text-[10px] uppercase tracking-wider text-fg-faint lg:block" title={captionLong}>
          {captionLong}
        </p>
      </header>

      {/* Mobile (~390px): stacked sections, no horizontal grid */}
      <div className="lg:hidden" data-testid="intel-strip-mobile">
        <div>
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.18em] text-fg-faint">Spot rates</p>
          {cells
            .filter((cell) => cell.mobileSection === 'spot')
            .map((cell) => (
              <IntelRow key={cell.key} cell={cell} usingDemo={usingDemo} />
            ))}
        </div>
        <div className="border-t border-line">
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.18em] text-fg-faint">Spread context</p>
          {cells
            .filter((cell) => cell.mobileSection === 'spread')
            .map((cell) => (
              <IntelRow key={cell.key} cell={cell} usingDemo={usingDemo} />
            ))}
        </div>
      </div>

      {/* Desktop: second pass — wide grid */}
      <div className="hidden divide-x divide-line lg:grid lg:grid-cols-4 xl:grid-cols-8">
        {cells.map((cell) => {
          const unavailable = cell.field.value === undefined;
          const toneClass = unavailable ? 'text-fg-faint' : 'text-fg';
          const meta = metaLine(cell.field, usingDemo);
          return (
            <article key={cell.key} className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-fg-dim">{cell.field.label}</p>
              <p className={`font-mono-tnum text-base font-medium ${toneClass}`}>{formatIntelValue(cell.field)}</p>
              <p className="truncate text-[10px] text-fg-faint" title={meta}>
                {cell.sub ? `${cell.sub} · ` : ''}
                {meta}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
