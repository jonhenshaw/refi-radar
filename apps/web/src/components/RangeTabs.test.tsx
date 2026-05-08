import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RangeTabs } from './RangeTabs';

describe('RangeTabs', () => {
  it('exposes the one-day chart filter', () => {
    render(<RangeTabs value="5D" onChange={vi.fn()} />);

    expect(screen.getByRole('tab', { name: '1D' })).toBeInTheDocument();
  });
});
