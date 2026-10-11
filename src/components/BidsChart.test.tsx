/* @vitest-environment jsdom */
import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BidInfo, TeamInfo } from '../logic/elimination';
import { buildBidChartData, formatBidTimestamp } from './bidChartData';
import { BidsChart, BidTooltip } from './BidsChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: ({ ticks }: { ticks: number[] }) => <div data-testid="x-axis" data-ticks={ticks.join(',')} />,
  YAxis: () => null,
  ZAxis: () => null,
  ReferenceLine: () => <div data-testid="zero-reference-line" />,
  Tooltip: () => null,
  Scatter: ({ data, shape }: {
    data: Array<Record<string, unknown>>;
    shape: ReactElement<Record<string, unknown>>;
  }) => (
    <svg>
      {data.map((point, index) => cloneElement(shape, {
        key: index,
        cx: 10 + index,
        cy: 20 + index,
        payload: point,
      }))}
    </svg>
  ),
}));

const teams = new Map<number, TeamInfo>([
  [1, {
    rosterId: 1,
    userId: 'user-1',
    displayName: 'Rain City Axes With A Deliberately Long Team Name',
    eliminatedWeek: null,
    isChampion: false,
    isRunnerUp: false,
  }],
]);

const exactCreatedAt = Date.UTC(2026, 8, 17, 14, 23, 45, 678);

function bid(overrides: Partial<BidInfo> = {}): BidInfo {
  return {
    week: 1,
    rosterId: 1,
    playerId: 'player-1',
    playerName: 'A Player With A Deliberately Long Full Name',
    position: 'WR',
    amount: 25,
    status: 'complete',
    createdAt: exactCreatedAt,
    ...overrides,
  };
}

describe('BidsChart', () => {
  it('shows every supplied week, preserves a genuine $0 win, and exposes exact time accessibly', () => {
    render(
      <BidsChart
        bids={[
          bid({ amount: 0 }),
          bid({ week: 3, playerId: 'player-2', playerName: 'Short Name', position: 'RB', amount: 125 }),
        ]}
        weeks={[1, 2, 3]}
        teams={teams}
      />,
    );

    expect(screen.getByTestId('x-axis').getAttribute('data-ticks')).toBe('1,2,3');
    expect(screen.getByLabelText(/Week 2: 0 observed wins/)).toBeTruthy();
    const zeroBid = screen.getByLabelText(/A Player With A Deliberately Long Full Name.*winning bid \$0/);
    expect(zeroBid.getAttribute('aria-label')).toContain(`transaction time ${formatBidTimestamp(exactCreatedAt)}`);
    expect(screen.getByText('Outlined dots are genuine $0 wins.', { exact: false })).toBeTruthy();
    expect(screen.getByTestId('zero-reference-line')).toBeTruthy();
    expect(screen.getByText('W2').parentElement?.textContent).toContain('0');
  });

  it('filters chart data and summaries to a selected week, then restores all weeks on rerender', () => {
    const bids = [
      bid({ week: 1, playerId: 'wr', playerName: 'Wide Receiver', position: 'WR' }),
      bid({ week: 2, playerId: 'qb', playerName: 'Quarterback', position: 'QB' }),
    ];
    const { rerender } = render(
      <BidsChart bids={bids} weeks={[2]} teams={teams} />,
    );

    expect(screen.queryByLabelText(/Wide Receiver.*Week 1/)).toBeNull();
    expect(screen.getByLabelText(/Quarterback.*Week 2/)).toBeTruthy();
    expect(screen.getByTestId('x-axis').getAttribute('data-ticks')).toBe('2');
    expect(screen.getByLabelText(/all positions in Week 2.*Week 2: 1 observed win/)).toBeTruthy();

    rerender(<BidsChart bids={bids} weeks={[1, 2]} teams={teams} />);

    expect(screen.getByLabelText(/Wide Receiver.*Week 1/)).toBeTruthy();
    expect(screen.getByLabelText(/Quarterback.*Week 2/)).toBeTruthy();
    expect(screen.getByTestId('x-axis').getAttribute('data-ticks')).toBe('1,2');
    expect(screen.getByLabelText(/Week 1: 1 observed win; Week 2: 1 observed win/)).toBeTruthy();
  });

  it('keeps every same-week observation in exactly one week-centered x bucket', () => {
    const denseBids = Array.from({ length: 40 }, (_, index) => bid({
      playerId: `player-${index}`,
      playerName: `Player ${index}`,
      amount: index,
      createdAt: exactCreatedAt + index,
    }));
    const { points, summary } = buildBidChartData(denseBids, [1, 2], teams);

    expect(points).toHaveLength(40);
    expect(new Set(points.map((point) => point.plotWeek))).toEqual(new Set([1]));
    expect(points.every((point) => point.plotWeek === point.week)).toBe(true);
    expect(summary).toEqual([{ week: 1, count: 40 }, { week: 2, count: 0 }]);
  });

  it('intersects the selected week with FLEX positions without including QB', () => {
    const bids = [
      bid({ week: 1, playerId: 'wr', position: 'WR' }),
      bid({ week: 2, playerId: 'rb', position: 'RB' }),
      bid({ week: 2, playerId: 'qb', position: 'QB' }),
      bid({ week: 3, playerId: 'te', position: 'TE' }),
    ];
    const flexPositions = ['RB', 'WR', 'TE'];
    const weekTwo = buildBidChartData(bids, [2], teams, flexPositions);

    expect(weekTwo.points.map((point) => point.playerId)).toEqual(['rb']);
    expect(weekTwo.points[0].plotWeek).toBe(2);
    expect(weekTwo.summary).toEqual([{ week: 2, count: 1 }]);

    const weekThree = buildBidChartData(bids, [3], teams, flexPositions);
    expect(weekThree.points.map((point) => point.playerId)).toEqual(['te']);
    expect(weekThree.summary).toEqual([{ week: 3, count: 1 }]);
  });

  it('summarizes partial weeks without fabricating bid points', () => {
    const observed = bid({ week: 2, amount: 0 });
    const { points, summary } = buildBidChartData([observed], [1, 2, 3], teams);

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ amount: 0, plotWeek: 2, createdAt: exactCreatedAt });
    expect(summary).toEqual([
      { week: 1, count: 0 },
      { week: 2, count: 1 },
      { week: 3, count: 0 },
    ]);
  });

  it('renders a week-aware empty state while retaining zero-count summaries', () => {
    render(<BidsChart bids={[]} weeks={[2]} teams={teams} positions={['TE']} />);

    expect(screen.getByText('No completed winning waiver bids found for TE in Week 2.')).toBeTruthy();
    expect(screen.getByText('W2').parentElement?.textContent).toContain('0');
    expect(screen.queryByTestId('zero-reference-line')).toBeNull();
  });

  it('keeps the exact timestamp as point metadata and renders it in tooltip detail', () => {
    const { points } = buildBidChartData([bid()], [1], teams);

    expect(points[0].createdAt).toBe(exactCreatedAt);
    expect(points[0].plotWeek).toBe(1);
    render(<BidTooltip point={points[0]} />);
    expect(screen.getByText(`Transaction time: ${formatBidTimestamp(exactCreatedAt)}`)).toBeTruthy();
  });
});
