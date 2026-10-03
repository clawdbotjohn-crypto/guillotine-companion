/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserLeague } from '../api/types';
import { LeagueChoiceButton } from './LeagueChoiceButton';

const league: UserLeague = {
  league_id: 'accessible-league',
  name: 'Accessible Guillotine',
  sport: 'nfl',
  total_rosters: 18,
  settings: { type: 3 },
  season: '2026',
  status: 'in_season',
  roster_positions: [],
  previous_league_id: null,
  draft_id: 'draft',
  avatar: null,
};

afterEach(cleanup);

describe('LeagueChoiceButton', () => {
  it('exposes a real named button and selects from keyboard activation', () => {
    const onSelect = vi.fn();
    render(<LeagueChoiceButton league={league} selecting={false} onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Select Accessible Guillotine, 18 teams, 2026/i });
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(onSelect).toHaveBeenCalledWith(league);
  });

  it('disables repeated selection while loading', () => {
    render(<LeagueChoiceButton league={league} selecting onSelect={vi.fn()} />);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
});
