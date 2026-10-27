/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Roster, SleeperUser, UserLeague } from '../api/types';
import { useAppStore } from '../store';
import { getCurrentNflSeason } from '../logic/season';

const mockUseUserLeagues = vi.fn();
const mockGetLeagueRosters = vi.fn();
const mockGetLeagueUsers = vi.fn();

vi.mock('../api', () => ({
  useUserLeagues: (userId: string | null, season: string) => mockUseUserLeagues(userId, season),
}));

vi.mock('../api/client', () => ({
  getLeagueRosters: (leagueId: string) => mockGetLeagueRosters(leagueId),
  getLeagueUsers: (leagueId: string) => mockGetLeagueUsers(leagueId),
}));

import { LeaguePickerPage } from './LeaguePickerPage';

const LEAGUE_ID = '3234567890123456789';

function renderPicker() {
  render(
    <MemoryRouter initialEntries={['/leagues']}>
      <Routes>
        <Route path="/leagues" element={<LeaguePickerPage />} />
        <Route path="/hub" element={<h1>League hub</h1>} />
        <Route path="/team-select" element={<h1>Team selection</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LeaguePickerPage username discovery', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().reset();
    useAppStore.getState().setUser('synthetic-user', 'synthetic-user-id');
    mockUseUserLeagues.mockReset();
    mockGetLeagueRosters.mockReset();
    mockGetLeagueUsers.mockReset();
  });

  it('keeps username lookup, saves the selected league, and auto-matches the user roster', async () => {
    const selectedLeague: UserLeague = {
      league_id: LEAGUE_ID,
      sport: 'nfl',
      name: 'Synthetic Picker League',
      total_rosters: 18,
      settings: { type: 3 },
      season: getCurrentNflSeason(),
      status: 'in_season',
      roster_positions: ['QB', 'RB', 'WR'],
      previous_league_id: null,
      draft_id: 'synthetic-draft',
      avatar: null,
    };
    const roster = {
      roster_id: 5,
      owner_id: 'synthetic-user-id',
      players: [],
      starters: [],
      settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 0 },
    } satisfies Roster;
    const user = {
      user_id: 'synthetic-user-id',
      username: 'synthetic-user',
      display_name: 'Synthetic Manager',
      avatar: null,
    } satisfies SleeperUser;
    mockUseUserLeagues.mockReturnValue({ data: [selectedLeague], isLoading: false, isError: false });
    mockGetLeagueRosters.mockResolvedValue([roster]);
    mockGetLeagueUsers.mockResolvedValue([user]);
    renderPicker();

    expect(mockUseUserLeagues).toHaveBeenCalledWith('synthetic-user-id', getCurrentNflSeason());
    fireEvent.click(screen.getByText('Synthetic Picker League'));

    expect(await screen.findByRole('heading', { name: 'League hub' })).toBeTruthy();
    expect(useAppStore.getState()).toMatchObject({
      username: 'synthetic-user',
      userId: 'synthetic-user-id',
      leagueId: LEAGUE_ID,
      rosterId: 5,
      teamName: 'Synthetic Manager',
      recentLeagues: [{
        leagueId: LEAGUE_ID,
        name: 'Synthetic Picker League',
        season: getCurrentNflSeason(),
        rememberedTeam: { rosterId: 5, name: 'Synthetic Manager' },
      }],
    });
  });
});
