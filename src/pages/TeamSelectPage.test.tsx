/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Roster, SleeperUser } from '../api/types';
import { useAppStore } from '../store';

const mockUseLeagueUsers = vi.fn();
const mockUseRosters = vi.fn();

vi.mock('../api', () => ({
  useLeagueUsers: (leagueId: string | null) => mockUseLeagueUsers(leagueId),
  useRosters: (leagueId: string | null) => mockUseRosters(leagueId),
}));

import { TeamSelectPage } from './TeamSelectPage';

const LEAGUE_ID = '6100000000000000001';

function roster(rosterId: number, ownerId: string): Roster {
  return {
    roster_id: rosterId,
    owner_id: ownerId,
    players: [],
    starters: [],
    settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
  };
}

function user(userId: string, displayName: string): SleeperUser {
  return {
    user_id: userId,
    username: displayName.toLowerCase().replaceAll(' ', '-'),
    display_name: displayName,
    avatar: null,
  };
}

function renderSelector(entry = '/team-select?from=hub') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/team-select" element={<TeamSelectPage />} />
        <Route path="/hub" element={<h1>League hub</h1>} />
        <Route path="/" element={<h1>Home</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeamSelectPage team changes', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().reset();
    useAppStore.getState().setLeague(LEAGUE_ID, 'Synthetic League', '2026');
    useAppStore.getState().setTeam(2, 'Old Team');
    mockUseLeagueUsers.mockReset();
    mockUseRosters.mockReset();
    mockUseLeagueUsers.mockReturnValue({
      data: [user('owner-two', 'Old Team'), user('owner-five', 'New Team')],
      isLoading: false,
    });
    mockUseRosters.mockReturnValue({
      data: [roster(2, 'owner-two'), roster(5, 'owner-five')],
      isLoading: false,
    });
  });

  it('changes teams from the Hub path, persists that league choice, and returns to the Hub', async () => {
    renderSelector();

    expect(screen.getByRole('heading', { name: 'Change Team' })).toBeTruthy();
    const newTeam = screen.getByRole('button', { name: 'New Team' });
    fireEvent.keyDown(newTeam, { key: 'Enter' });
    fireEvent.click(newTeam);

    expect(await screen.findByRole('heading', { name: 'League hub' })).toBeTruthy();
    expect(useAppStore.getState()).toMatchObject({ rosterId: 5, teamName: 'New Team' });
    expect(useAppStore.getState().recentLeagues).toEqual([{
      leagueId: LEAGUE_ID,
      name: 'Synthetic League',
      season: '2026',
      rememberedTeam: { rosterId: 5, name: 'New Team' },
    }]);
  });

  it('returns to the Hub without clearing the current team when the change is cancelled', async () => {
    renderSelector();

    fireEvent.click(screen.getByRole('button', { name: 'Back to hub' }));

    expect(await screen.findByRole('heading', { name: 'League hub' })).toBeTruthy();
    expect(useAppStore.getState()).toMatchObject({ rosterId: 2, teamName: 'Old Team' });
  });
});
