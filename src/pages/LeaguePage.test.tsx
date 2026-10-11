/* @vitest-environment jsdom */
import { cloneElement, isValidElement, type ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Matchup, Roster, SleeperUser, Transaction } from '../api/types';
import { LeaguePage } from './LeaguePage';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ZAxis: () => null,
  ReferenceLine: () => null,
  Tooltip: () => null,
  Cell: () => null,
  Scatter: ({
    data,
    shape,
    children,
  }: {
    data: Array<Record<string, unknown>>;
    shape?: ReactNode;
    children?: ReactNode;
  }) => isValidElement<Record<string, unknown>>(shape) ? (
    <svg>
      {data.map((point, index) => cloneElement(shape, {
        key: index,
        cx: 10 + index,
        cy: 20 + index,
        payload: point,
      }))}
    </svg>
  ) : <div>{children}</div>,
}));

vi.mock('../store', () => ({
  useAppStore: () => ({
    leagueId: 'league-1',
    leagueName: 'Native Guillotine',
    leagueSeason: '2026',
    rootLeagueId: 'league-1',
    rosterId: 1,
  }),
  usePlayers: () => ({ isLoading: false }),
}));

vi.mock('../store/players', () => ({
  getPlayerPosition: (id: string) => id === 'wr-player' ? 'WR' : 'QB',
  getPlayerName: (id: string) => id === 'wr-player' ? 'Wide Receiver' : 'Quarterback',
}));

const users: SleeperUser[] = [1, 2, 3].map((id) => ({
  user_id: `user-${id}`,
  display_name: `Team ${id}`,
  avatar: null,
  username: `team-${id}`,
}));

const rosters: Roster[] = [1, 2, 3].map((id) => ({
  roster_id: id,
  owner_id: `user-${id}`,
  players: [],
  starters: [],
  settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
}));

function matchup(rosterId: number, points: number): Matchup {
  return {
    roster_id: rosterId,
    matchup_id: 1,
    points,
    starters: [],
    starters_points: [],
    players: [],
    players_points: {},
  };
}

function transaction(playerId: string, rosterId: number, amount: number, week: number): Transaction {
  return {
    type: 'waiver',
    status: 'complete',
    transaction_id: `${playerId}-${week}`,
    roster_ids: [rosterId],
    adds: { [playerId]: rosterId },
    drops: null,
    settings: { waiver_bid: amount },
    leg: week,
    created: Date.UTC(2026, 8, 10 + week, 14, 30, 0),
  };
}

const matchups = new Map<number, Matchup[]>([
  [1, [matchup(1, 100), matchup(2, 90), matchup(3, 80)]],
  [2, [matchup(1, 100), matchup(2, 90)]],
]);
const transactions = new Map<number, Transaction[]>([
  [1, [transaction('wr-player', 1, 0, 1)]],
  // An observed current-week win must appear even before that scoring week is complete.
  [3, [transaction('qb-player', 2, 40, 3)]],
]);

vi.mock('../api', () => ({
  useLeague: () => ({ data: {
    league_id: 'league-1',
    sport: 'nfl',
    name: 'Native Guillotine',
    total_rosters: 3,
    settings: { type: 3, last_scored_leg: 2, waiver_budget: 1000 },
    scoring_settings: { rec: 1 },
    season: '2026',
    season_type: 'regular',
    status: 'in_season',
    draft_id: 'draft-1',
    previous_league_id: null,
    roster_positions: [],
  } }),
  useLeagueUsers: () => ({ data: users }),
  useRosters: () => ({ data: rosters }),
  useAllMatchups: () => ({ data: matchups, isLoading: false }),
  useAllTransactions: () => ({ data: transactions }),
  useLeagueHistory: () => ({ data: [], isLoading: false }),
  useNflState: () => ({ data: { season: '2026', week: 3 } }),
  useWeeklyProjections: () => ({ data: undefined }),
}));

vi.mock('../hooks/useSwitchSeason', () => ({
  useSwitchSeason: () => vi.fn(),
}));

describe('LeaguePage Bids by Week placement and filter wiring', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('filters the chart by week and position, restores all weeks, and includes transaction-only weeks', () => {
    render(<LeaguePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Bids' }));

    const chart = screen.getByTestId('bids-by-week-chart');
    const weekFilter = screen.getByTestId('bids-week-filter');
    const positionFilter = screen.getByTestId('bids-position-filter');
    expect(chart.compareDocumentPosition(weekFilter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(weekFilter.compareDocumentPosition(positionFilter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(weekFilter).getByRole('button', { name: '3' })).toBeTruthy();
    expect(screen.getByLabelText(/Wide Receiver.*Week 1.*\$0/)).toBeTruthy();
    expect(screen.getByLabelText(/Quarterback.*Week 3.*\$40/)).toBeTruthy();

    fireEvent.click(within(weekFilter).getByRole('button', { name: '1' }));
    expect(screen.getByLabelText(/Wide Receiver.*Week 1.*\$0/)).toBeTruthy();
    expect(screen.queryByLabelText(/Quarterback.*Week 3/)).toBeNull();
    expect(screen.getByLabelText(/all positions in Week 1.*Week 1: 1 observed win/)).toBeTruthy();

    fireEvent.click(within(positionFilter).getByRole('button', { name: 'FLEX' }));
    expect(screen.getByLabelText(/Wide Receiver.*Week 1/)).toBeTruthy();

    fireEvent.click(within(weekFilter).getByRole('button', { name: '3' }));
    expect(screen.queryByLabelText(/Wide Receiver.*Week 1/)).toBeNull();
    expect(screen.queryByLabelText(/Quarterback.*Week 3/)).toBeNull();
    expect(screen.getByText('No completed winning waiver bids found for RB/WR/TE in Week 3.')).toBeTruthy();

    fireEvent.click(within(weekFilter).getByRole('button', { name: 'All' }));
    expect(screen.getByLabelText(/Wide Receiver.*Week 1/)).toBeTruthy();
    expect(screen.queryByLabelText(/Quarterback.*Week 3/)).toBeNull();
    expect(screen.getByLabelText(/Week 1: 1 observed win; Week 2: 0 observed wins; Week 3: 0 observed wins/)).toBeTruthy();

    fireEvent.click(within(positionFilter).getByRole('button', { name: 'All' }));
    expect(screen.getByLabelText(/Wide Receiver.*Week 1.*\$0/)).toBeTruthy();
    expect(screen.getByLabelText(/Quarterback.*Week 3.*\$40/)).toBeTruthy();
    expect(screen.getByLabelText(/Week 1: 1 observed win; Week 2: 0 observed wins; Week 3: 1 observed win/)).toBeTruthy();
  });
});
