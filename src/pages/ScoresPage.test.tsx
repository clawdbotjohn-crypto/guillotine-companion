/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LiveScoringModel } from '../logic';
import { ScoresBoard, ScoringWeekSelector } from './ScoresPage';

const model: LiveScoringModel = {
  activeTeamCount: 2,
  projectedCutline: 50,
  rankingsAvailable: true,
  teams: [
    {
      rosterId: 2, displayName: 'Low Active', eliminated: false,
      officialPoints: 12, projectedFinal: 40, playersRemaining: 1, playersInProgress: 0,
      startersStarted: 1, starterCount: 3, starters: [],
      standing: { rosterId: 2, rank: 2, outOf: 2, risk: 'at-risk' },
    },
    {
      rosterId: 1, displayName: 'High Active', eliminated: false,
      officialPoints: 30, projectedFinal: 60, playersRemaining: 0, playersInProgress: 0,
      startersStarted: 3, starterCount: 3, starters: [],
      standing: { rosterId: 1, rank: 1, outOf: 2, risk: 'safe' },
    },
    {
      rosterId: 3, displayName: 'Former Team', eliminated: true,
      officialPoints: 99, projectedFinal: 99, playersRemaining: 0, playersInProgress: 0,
      startersStarted: 0, starterCount: 0, starters: [], standing: null,
    },
  ],
};

describe('Scores page controls and board', () => {
  it('offers only the current and prior weeks', () => {
    const onChange = vi.fn();
    render(<ScoringWeekSelector week={4} latestWeek={6} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: 'Scoring week' });
    expect(within(select).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Week 6', 'Week 5', 'Week 4', 'Week 3', 'Week 2', 'Week 1']);
    expect(within(select).queryByText('Week 7')).toBeNull();
    fireEvent.change(select, { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows current first, projected second, Started X/Y, and active-only status', () => {
    const selectTeam = vi.fn();
    render(<ScoresBoard model={model} currentRosterId={1} onSelectTeam={selectTeam} />);
    const rows = screen.getAllByRole('button');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Open scoring for Low Active',
      'Open scoring for High Active',
      'Open scoring for Former Team',
    ]);
    expect(within(rows[0]).getByText('12.0')).toBeTruthy();
    expect(within(rows[0]).getByText('Proj. 40.0')).toBeTruthy();
    expect(within(rows[0]).getByText('1/3')).toBeTruthy();
    expect(within(rows[0]).getByText('2/2')).toBeTruthy();
    expect(within(rows[0]).getByLabelText('Status: Danger')).toBeTruthy();
    expect(within(rows[2]).getByLabelText('Status: Eliminated')).toBeTruthy();
    expect(within(rows[2]).queryByText(/\/2/)).toBeNull();
    fireEvent.click(rows[1]);
    expect(selectTeam).toHaveBeenCalledWith(model.teams[1]);
  });
});
