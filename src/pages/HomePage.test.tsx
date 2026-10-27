/* @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { League, Roster, SleeperUser } from '../api/types';
import { useAppStore } from '../store';
import { getCurrentNflSeason } from '../logic/season';

const mockUseSleeperUser = vi.fn();
const mockGetLeague = vi.fn();
const mockGetLeagueRosters = vi.fn();
const mockGetLeagueUsers = vi.fn();

vi.mock('../api', () => ({
  useSleeperUser: (username: string | null) => mockUseSleeperUser(username),
}));

vi.mock('../api/client', () => ({
  getLeague: (leagueId: string) => mockGetLeague(leagueId),
  getLeagueRosters: (leagueId: string) => mockGetLeagueRosters(leagueId),
  getLeagueUsers: (leagueId: string) => mockGetLeagueUsers(leagueId),
}));

import { HomePage } from './HomePage';

const LEAGUE_ID = '1234567890123456789';
const OTHER_LEAGUE_ID = '2234567890123456789';

function league(overrides: Partial<League> = {}): League {
  return {
    league_id: LEAGUE_ID,
    sport: 'nfl',
    name: 'Synthetic Guillotine',
    total_rosters: 18,
    settings: { type: 3 },
    scoring_settings: {},
    season: getCurrentNflSeason(),
    season_type: 'regular',
    status: 'in_season',
    draft_id: 'synthetic-draft',
    previous_league_id: null,
    roster_positions: ['QB', 'RB', 'WR', 'FLEX'],
    ...overrides,
  };
}

function roster(rosterId: number, ownerId = 'synthetic-owner'): Roster {
  return {
    roster_id: rosterId,
    owner_id: ownerId,
    players: [],
    starters: [],
    settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
  };
}

function user(userId = 'synthetic-owner', displayName = 'Synthetic Manager'): SleeperUser {
  return {
    user_id: userId,
    username: 'synthetic-manager',
    display_name: displayName,
    avatar: null,
  };
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/team-select" element={<h1>Team selection</h1>} />
        <Route path="/leagues" element={<h1>League picker</h1>} />
        <Route path="/hub" element={<h1>League hub</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function openLeagueIdForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Paste a league ID directly' }));
}

describe('HomePage league discovery', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().reset();
    mockGetLeague.mockReset();
    mockGetLeagueRosters.mockReset();
    mockGetLeagueUsers.mockReset();
    mockUseSleeperUser.mockReset();
    mockUseSleeperUser.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  });

  it('trims, fetches, validates, saves, and routes a direct league ID to team selection', async () => {
    mockGetLeague.mockResolvedValue(league());
    useAppStore.setState({
      username: 'stale-user',
      userId: 'stale-user-id',
      leagueId: OTHER_LEAGUE_ID,
      leagueName: 'Stale League',
      leagueSeason: '2025',
      rootLeagueId: OTHER_LEAGUE_ID,
      rosterId: 4,
      teamName: 'Stale Team',
    });
    renderHome();

    openLeagueIdForm();
    fireEvent.change(screen.getByLabelText('Sleeper league ID'), { target: { value: `  ${LEAGUE_ID}  ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(await screen.findByRole('heading', { name: 'Team selection' })).toBeTruthy();
    expect(mockGetLeague).toHaveBeenCalledWith(LEAGUE_ID);
    expect(useAppStore.getState()).toMatchObject({
      username: '',
      userId: null,
      leagueId: LEAGUE_ID,
      leagueName: 'Synthetic Guillotine',
      leagueSeason: getCurrentNflSeason(),
      rootLeagueId: LEAGUE_ID,
      rosterId: null,
      teamName: null,
      recentLeagues: [{
        leagueId: LEAGUE_ID,
        name: 'Synthetic Guillotine',
        season: getCurrentNflSeason(),
      }],
    });
  });

  it('rejects malformed IDs without a fetch and clears stale selection state', async () => {
    useAppStore.setState({
      leagueId: OTHER_LEAGUE_ID,
      leagueName: 'Stale League',
      leagueSeason: '2025',
      rootLeagueId: OTHER_LEAGUE_ID,
      rosterId: 7,
      teamName: 'Stale Team',
    });
    renderHome();

    openLeagueIdForm();
    fireEvent.change(screen.getByLabelText('Sleeper league ID'), { target: { value: 'not-an-id' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect((await screen.findByRole('alert')).textContent).toContain('valid numeric Sleeper league ID');
    expect(mockGetLeague).not.toHaveBeenCalled();
    expect(useAppStore.getState()).toMatchObject({
      leagueId: null,
      rootLeagueId: null,
      rosterId: null,
      teamName: null,
    });
    expect(screen.queryByRole('heading', { name: 'Team selection' })).toBeNull();
  });

  it('shows useful errors for missing, non-native, and wrong-season leagues without navigating', async () => {
    renderHome();
    openLeagueIdForm();
    const input = screen.getByLabelText('Sleeper league ID');

    mockGetLeague.mockRejectedValueOnce(new Error('not found'));
    fireEvent.change(input, { target: { value: LEAGUE_ID } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect((await screen.findByRole('alert')).textContent).toContain('League not found');

    mockGetLeague.mockResolvedValueOnce(league({ settings: { type: 0 } }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('not a native Sleeper Guillotine league'));

    mockGetLeague.mockResolvedValueOnce(league({ season: String(Number(getCurrentNflSeason()) - 1) }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Choose a'));

    expect(screen.queryByRole('heading', { name: 'Team selection' })).toBeNull();
    expect(useAppStore.getState().leagueId).toBeNull();
  });

  it('preserves username discovery and isolates it from stale direct-league state', async () => {
    const sleeperUser: SleeperUser = {
      user_id: 'synthetic-user-id',
      username: 'synthetic-user',
      display_name: 'Synthetic User',
      avatar: null,
    };
    mockUseSleeperUser.mockImplementation((username: string | null) => ({
      data: username === 'synthetic-user' ? sleeperUser : undefined,
      isLoading: false,
      isError: false,
    }));
    useAppStore.setState({
      leagueId: LEAGUE_ID,
      leagueName: 'Stale League',
      leagueSeason: getCurrentNflSeason(),
      rootLeagueId: LEAGUE_ID,
      rosterId: 3,
      teamName: 'Stale Team',
    });
    renderHome();

    fireEvent.change(screen.getByLabelText('Sleeper username'), { target: { value: '  synthetic-user  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find My Leagues' }));

    expect(await screen.findByRole('heading', { name: 'League picker' })).toBeTruthy();
    expect(useAppStore.getState()).toMatchObject({
      username: 'synthetic-user',
      userId: 'synthetic-user-id',
      leagueId: null,
      rootLeagueId: null,
      rosterId: null,
      teamName: null,
    });
    expect(mockGetLeague).not.toHaveBeenCalled();
  });

  it('ignores a late direct-ID response after the user switches to username discovery', async () => {
    let resolveLeague!: (value: League) => void;
    mockGetLeague.mockReturnValue(new Promise<League>((resolve) => { resolveLeague = resolve; }));
    const sleeperUser: SleeperUser = {
      user_id: 'race-user-id',
      username: 'race-user',
      display_name: 'Race User',
      avatar: null,
    };
    mockUseSleeperUser.mockImplementation((username: string | null) => ({
      data: username === 'race-user' ? sleeperUser : undefined,
      isLoading: false,
      isError: false,
    }));
    renderHome();

    openLeagueIdForm();
    fireEvent.change(screen.getByLabelText('Sleeper league ID'), { target: { value: LEAGUE_ID } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    fireEvent.change(screen.getByLabelText('Sleeper username'), { target: { value: 'race-user' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find My Leagues' }));

    expect(await screen.findByRole('heading', { name: 'League picker' })).toBeTruthy();
    await act(async () => {
      resolveLeague(league());
      await Promise.resolve();
    });
    expect(useAppStore.getState()).toMatchObject({
      userId: 'race-user-id',
      leagueId: null,
      rootLeagueId: null,
      rosterId: null,
    });
  });

  it('revalidates a saved league, refreshes renamed metadata, and routes to team selection', async () => {
    useAppStore.getState().setLeague(LEAGUE_ID, 'Old Synthetic Name', getCurrentNflSeason());
    useAppStore.getState().clearSelection();
    mockGetLeague.mockResolvedValue(league({ name: 'Renamed Synthetic League' }));
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: `Open Old Synthetic Name, ${getCurrentNflSeason()}` }));

    expect(await screen.findByRole('heading', { name: 'Team selection' })).toBeTruthy();
    expect(mockGetLeague).toHaveBeenCalledWith(LEAGUE_ID);
    expect(useAppStore.getState().recentLeagues).toEqual([{
      leagueId: LEAGUE_ID,
      name: 'Renamed Synthetic League',
      season: getCurrentNflSeason(),
    }]);
  });

  it('revalidates and restores a remembered saved-league team before opening the hub', async () => {
    useAppStore.getState().setLeague(LEAGUE_ID, 'Saved Synthetic League', getCurrentNflSeason());
    useAppStore.getState().setTeam(6, 'Remembered Manager');
    useAppStore.getState().clearSelection();
    mockGetLeague.mockResolvedValue(league({ name: 'Renamed Synthetic League' }));
    mockGetLeagueRosters.mockResolvedValue([roster(6)]);
    mockGetLeagueUsers.mockResolvedValue([user('synthetic-owner', 'Refreshed Manager')]);
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: `Open Saved Synthetic League, ${getCurrentNflSeason()}` }));

    expect(await screen.findByRole('heading', { name: 'League hub' })).toBeTruthy();
    expect(mockGetLeagueRosters).toHaveBeenCalledWith(LEAGUE_ID);
    expect(mockGetLeagueUsers).toHaveBeenCalledWith(LEAGUE_ID);
    expect(useAppStore.getState()).toMatchObject({
      leagueId: LEAGUE_ID,
      rosterId: 6,
      teamName: 'Refreshed Manager',
      recentLeagues: [{
        leagueId: LEAGUE_ID,
        name: 'Renamed Synthetic League',
        season: getCurrentNflSeason(),
        rememberedTeam: { rosterId: 6, name: 'Refreshed Manager' },
      }],
    });
  });

  it('falls back to team selection and clears stale remembered metadata when the roster is missing', async () => {
    useAppStore.getState().setLeague(LEAGUE_ID, 'Saved Synthetic League', getCurrentNflSeason());
    useAppStore.getState().setTeam(6, 'Stale Manager');
    useAppStore.getState().clearSelection();
    mockGetLeague.mockResolvedValue(league());
    mockGetLeagueRosters.mockResolvedValue([roster(7, 'other-owner')]);
    mockGetLeagueUsers.mockResolvedValue([user('other-owner', 'Other Manager')]);
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: `Open Saved Synthetic League, ${getCurrentNflSeason()}` }));

    expect(await screen.findByRole('heading', { name: 'Team selection' })).toBeTruthy();
    expect(useAppStore.getState()).toMatchObject({ rosterId: null, teamName: null });
    expect(useAppStore.getState().recentLeagues[0].rememberedTeam).toBeUndefined();
  });

  it('deletes a saved league locally and offers an accessible undo without provider calls', async () => {
    useAppStore.getState().setLeague(LEAGUE_ID, 'Synthetic Guillotine', getCurrentNflSeason());
    useAppStore.getState().clearSelection();
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Synthetic Guillotine from saved leagues' }));
    expect(screen.queryByRole('button', { name: new RegExp('Open Synthetic Guillotine') })).toBeNull();
    expect(screen.getByText('Removed Synthetic Guillotine')).toBeTruthy();
    expect(mockGetLeague).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp('Open Synthetic Guillotine') })).toBeTruthy());
    expect(mockGetLeague).not.toHaveBeenCalled();
  });
});
