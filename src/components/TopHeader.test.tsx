/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { TopHeader } from './TopHeader';

const LEAGUE_ID = '5100000000000000001';

describe('TopHeader league navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().reset();
    useAppStore.getState().setLeague(LEAGUE_ID, 'Synthetic Header League', '2026');
    useAppStore.getState().setTeam(2, 'Synthetic Team');
  });

  it('keeps the league name as the single home affordance and removes the redundant switch arrow', () => {
    render(
      <MemoryRouter initialEntries={['/hub']}>
        <TopHeader />
        <Routes>
          <Route path="/" element={<h1>Home route</h1>} />
          <Route path="/hub" element={<h1>Hub route</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Switch league' })).toBeNull();
    const homeButton = screen.getByRole('button', { name: 'Go to home' });
    expect(homeButton.textContent).toContain('Synthetic Header League');
    expect(homeButton.textContent).toContain('2026');

    fireEvent.keyDown(homeButton, { key: 'Enter' });
    fireEvent.click(homeButton);
    expect(screen.getByRole('heading', { name: 'Home route' })).toBeTruthy();
    expect(useAppStore.getState().leagueId).toBeNull();
    expect(useAppStore.getState().recentLeagues).toEqual([{
      leagueId: LEAGUE_ID,
      name: 'Synthetic Header League',
      season: '2026',
      rememberedTeam: { rosterId: 2, name: 'Synthetic Team' },
    }]);
  });
});
