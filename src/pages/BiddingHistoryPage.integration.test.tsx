/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { League, Matchup, NflState, Roster, SleeperUser, Transaction } from '../api/types';

type QueryLike<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
};

let leagueQuery: QueryLike<League>;
let usersQuery: QueryLike<SleeperUser[]>;
let rostersQuery: QueryLike<Roster[]>;
let playersQuery: QueryLike<Map<string, any>>;
let nflStateQuery: QueryLike<NflState>;
let matchupsQuery: QueryLike<Map<number, Matchup[]>>;
let transactionsQuery: QueryLike<Map<number, Transaction[]>>;

function query<T>(overrides: Partial<QueryLike<T>> = {}): QueryLike<T> {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

vi.mock('../store', () => ({
  useAppStore: () => ({ leagueId: 'league-1', leagueName: 'League One' }),
  usePlayers: () => playersQuery,
}));

vi.mock('../api', () => ({
  useLeague: () => leagueQuery,
  useLeagueUsers: () => usersQuery,
  useRosters: () => rostersQuery,
  useNflState: () => nflStateQuery,
  useAllMatchups: () => matchupsQuery,
  useAllTransactions: () => transactionsQuery,
}));

import { BiddingHistoryPage } from './BiddingHistoryPage';

beforeEach(() => {
  leagueQuery = query<League>({
    data: {
      league_id: 'league-1',
      name: 'League One',
      sport: 'nfl',
      total_rosters: 18,
      settings: { type: 3, waiver_budget: 1000, last_scored_leg: 1 },
      scoring_settings: { rec: 1 },
      season: '2026',
      season_type: 'regular',
      status: 'in_season',
      draft_id: 'draft-1',
      previous_league_id: null,
      roster_positions: ['QB'],
    },
  });
  usersQuery = query<SleeperUser[]>({ data: [] });
  rostersQuery = query<Roster[]>({ data: [] });
  playersQuery = query<Map<string, any>>({ data: new Map() });
  nflStateQuery = query<NflState>({
    data: {
      week: 2,
      display_week: 2,
      season: '2026',
      season_type: 'regular',
      leg: 1,
      league_season: '2026',
      season_start_date: '2026-09-01',
      season_has_scores: true,
    },
  });
  matchupsQuery = query<Map<number, Matchup[]>>({ data: new Map() });
  transactionsQuery = query<Map<number, Transaction[]>>({ data: new Map() });
});

afterEach(() => cleanup());

describe('BiddingHistoryPage integration', () => {
  it('reports required data source failures and retries each failed query', () => {
    leagueQuery = query<League>({ isError: true, error: new Error('league') });
    usersQuery = query<SleeperUser[]>({ isError: true, error: new Error('users') });
    rostersQuery = query<Roster[]>({ data: [] });
    playersQuery = query<Map<string, any>>({ isError: true, error: new Error('players') });
    transactionsQuery = query<Map<number, Transaction[]>>({ isError: true, error: new Error('tx') });

    render(<BiddingHistoryPage />);

    expect(screen.getByText(/Required Sleeper data could not be loaded:/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed data' }));

    expect(leagueQuery.refetch).toHaveBeenCalledOnce();
    expect(usersQuery.refetch).toHaveBeenCalledOnce();
    expect(playersQuery.refetch).toHaveBeenCalledOnce();
    expect(transactionsQuery.refetch).toHaveBeenCalledOnce();
    expect(rostersQuery.refetch).not.toHaveBeenCalled();
  });

  it('surfaces elimination-status unavailable when NFL state fails while bid evidence remains visible', () => {
    nflStateQuery = query<NflState>({ isError: true, error: new Error('nfl') });

    render(<BiddingHistoryPage />);

    expect(screen.getByText(/Current elimination status is unavailable/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry status' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Week 2', pressed: true })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No completed auctions yet' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry status' }));
    expect(nflStateQuery.refetch).toHaveBeenCalledOnce();
  });
});
