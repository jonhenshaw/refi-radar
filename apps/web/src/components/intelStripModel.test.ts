import { describe, expect, it } from 'vitest';

import { buildRateIntel } from '@refi-radar/shared';

import { buildIntelCells, formatIntelValue } from './intelStripModel';

describe('intelStripModel', () => {
  it('groups spot rates before spread context cells', () => {
    const intel = buildRateIntel({
      sources: [
        {
          sourceId: 'mnd_30y_fixed',
          observedAt: '2026-05-08',
          fetchedAt: '2026-05-08T12:00:00.000Z',
          rate: 6.77,
          confidence: 'market_estimate',
        },
        {
          sourceId: 'fred_dgs10',
          observedAt: '2026-05-08',
          fetchedAt: '2026-05-08T12:00:00.000Z',
          rate: 4.69,
          confidence: 'proxy',
        },
      ],
      health: [],
    });
    const cells = buildIntelCells(intel);
    expect(cells.slice(0, 3).every((cell) => cell.mobileSection === 'spot')).toBe(true);
    expect(cells.slice(3).every((cell) => cell.mobileSection === 'spread')).toBe(true);
  });

  it('formats basis-point values with units', () => {
    expect(formatIntelValue({ label: 'Mortgage − 10Y spread', unit: 'bps', derivation: 'derived', value: 208 })).toBe(
      '208 bps',
    );
  });
});
