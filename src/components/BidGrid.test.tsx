/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BidInfo, TeamInfo } from '../logic/elimination';
import { BidGrid } from './BidGrid';

const teams = new Map<number, TeamInfo>([
  [1, {
    rosterId: 1,
    userId: 'user-1',
    displayName: 'Rain City Axes',
    eliminatedWeek: null,
    isChampion: false,
    isRunnerUp: false,
  }],
]);

const bids: BidInfo[] = [
  { week: 1, rosterId: 1, playerId: 'wr-1', playerName: 'Jordan Addison', position: 'WR', amount: 50, status: 'complete' },
  { week: 1, rosterId: 1, playerId: 'te-1', playerName: 'Tucker Kraft', position: 'TE', amount: 90, status: 'complete' },
];

function renderGrid(positions?: string[]) {
  return render(
    <BidGrid
      bids={bids}
      weeks={[1]}
      teams={teams}
      totalBudget={1000}
      selectedWeek={null}
      positions={positions}
    />,
  );
}

describe('BidGrid mobile horizontal behavior', () => {
  it('resets stale horizontal scroll when a position filter changes', () => {
    const { rerender } = renderGrid();
    const scroller = screen.getByTestId('bid-grid-scroll-container');
    scroller.scrollLeft = 287;

    rerender(
      <BidGrid
        bids={bids}
        weeks={[1]}
        teams={teams}
        totalBudget={1000}
        selectedWeek={null}
        positions={['WR']}
      />,
    );

    expect(scroller.scrollLeft).toBe(0);
    expect(screen.getByTitle('Jordan Addison')).toBeTruthy();
    expect(screen.getByText('$50')).toBeTruthy();
    expect(screen.queryByText('Tucker Kraft')).toBeNull();
    expect(scroller.querySelector('table')?.className).toContain('min-w-[260px]');
  });

  it('keeps the WK column opaque, fixed at 52px, left zero, layered, and separated', () => {
    renderGrid();
    const header = screen.getByTestId('bid-grid-week-header');
    const cell = screen.getByTestId('bid-grid-week-cell');

    for (const element of [header, cell]) {
      expect(element.className).toContain('sticky');
      expect(element.className).toContain('left-0');
      expect(element.className).toContain('w-[52px]');
      expect(element.className).toContain('min-w-[52px]');
      expect(element.className).toContain('max-w-[52px]');
      expect(element.className).toContain('border-r');
      expect((element as HTMLElement).style.left).toBe('0px');
    }
    expect(header.className).toContain('z-30');
    expect(header.className).toContain('bg-[#0a0d1a]');
    expect(cell.className).toContain('z-20');
    expect(cell.className).toContain('bg-[#0e1025]');
  });
});
