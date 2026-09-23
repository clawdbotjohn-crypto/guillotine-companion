/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Roster, SleeperUser } from '../api/types';
import { rankActiveTeams, type TeamProjection } from '../logic/analytics';
import type { TeamInfo } from '../logic/elimination';
import { FaabTracker } from './FaabTracker';
import {
  formatFaabCurrency,
  getFaabTeamStatus,
  summarizeRemainingFaab,
} from '../logic/faabDisplay';

describe('remaining FAAB summary', () => {
  it('handles empty, single, and multiple displayed pools', () => {
    expect(summarizeRemainingFaab([])).toEqual({ min: null, avg: null, max: null });
    expect(summarizeRemainingFaab([{ remaining: 75 }])).toEqual({ min: 75, avg: 75, max: 75 });
    expect(summarizeRemainingFaab([
      { remaining: 20 },
      { remaining: 60 },
      { remaining: 100 },
    ])).toEqual({ min: 20, avg: 60, max: 100 });
    expect(formatFaabCurrency(null)).toBe('—');
    expect(formatFaabCurrency(1234)).toBe('$1,234');
    expect(formatFaabCurrency(12.5)).toBe('$13');
  });
});

describe('shared projected status in FAAB rows', () => {
  it('uses the exact active-only projection risk and keeps eliminated teams outside it', () => {
    const standings = rankActiveTeams([
      { rosterId: 1, value: 30, eliminated: false },
      { rosterId: 2, value: 10, eliminated: false },
      { rosterId: 3, value: 999, eliminated: true },
    ], 1);
    const projection = (rosterId: number): TeamProjection => ({
      rosterId,
      displayName: `Team ${rosterId}`,
      projPoints: rosterId === 1 ? 30 : 10,
      eliminated: false,
      projRank: standings.get(rosterId)!.rank,
      projOutOf: standings.get(rosterId)!.outOf,
      risk: standings.get(rosterId)!.risk,
      starters: [],
    });
    const active: TeamInfo = { rosterId: 2, userId: 'u2', displayName: 'Team 2', eliminatedWeek: null, isChampion: false, isRunnerUp: false };
    const eliminated: TeamInfo = { rosterId: 3, userId: 'u3', displayName: 'Team 3', eliminatedWeek: 1, isChampion: false, isRunnerUp: false };

    expect(getFaabTeamStatus(active, projection(2))).toBe(projection(2).risk);
    expect(getFaabTeamStatus(eliminated, undefined)).toBe('eliminated');
    expect(standings.has(3)).toBe(false);
  });

  it('labels the displayed pool, shows min/avg/max, and exposes shared rank/status', () => {
    const rosters: Roster[] = [
      { roster_id: 1, owner_id: 'u1', players: [], starters: [], settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 } },
      { roster_id: 2, owner_id: 'u2', players: [], starters: [], settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 40 } },
      { roster_id: 3, owner_id: 'u3', players: [], starters: [], settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 100 } },
    ];
    const users: SleeperUser[] = [1, 2, 3].map((id) => ({
      user_id: `u${id}`,
      display_name: `Team ${id}`,
      username: `team${id}`,
      avatar: null,
    }));
    const teams = new Map<number, TeamInfo>([
      [1, { rosterId: 1, userId: 'u1', displayName: 'Team 1', eliminatedWeek: null, isChampion: false, isRunnerUp: false }],
      [2, { rosterId: 2, userId: 'u2', displayName: 'Team 2', eliminatedWeek: null, isChampion: false, isRunnerUp: false }],
      [3, { rosterId: 3, userId: 'u3', displayName: 'Team 3', eliminatedWeek: 1, isChampion: false, isRunnerUp: false }],
    ]);
    const projections: TeamProjection[] = [
      { rosterId: 1, displayName: 'Team 1', projPoints: 120, eliminated: false, projRank: 1, projOutOf: 2, risk: 'safe', starters: [] },
      { rosterId: 2, displayName: 'Team 2', projPoints: 80, eliminated: false, projRank: 2, projOutOf: 2, risk: 'at-risk', starters: [] },
      { rosterId: 3, displayName: 'Team 3', projPoints: null, eliminated: true, projRank: 0, projOutOf: 0, risk: 'warning', starters: [] },
    ];

    render(
      <FaabTracker
        rosters={rosters}
        users={users}
        teams={teams}
        projections={projections}
        totalBudget={100}
        bids={[]}
      />,
    );

    expect(screen.getByLabelText('FAAB summary pool: Active teams · 2 displayed')).toBeTruthy();
    expect(screen.getByText('Proj 1/2')).toBeTruthy();
    expect(screen.getByText('Proj 2/2')).toBeTruthy();
    expect(screen.getByText('Safe')).toBeTruthy();
    expect(screen.getByText('At Risk')).toBeTruthy();
    expect(screen.queryByText('Eliminated')).toBeNull();
    expect(screen.getAllByText('$60').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$80').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$100').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Show eliminated/ }));
    expect(screen.getByLabelText('FAAB summary pool: All teams · 3 displayed')).toBeTruthy();
    expect(screen.getByText('Eliminated')).toBeTruthy();
    expect(screen.getByText('$53')).toBeTruthy();
  });
});
