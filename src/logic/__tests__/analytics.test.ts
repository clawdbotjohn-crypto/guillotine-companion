import { describe, expect, it, vi } from 'vitest';
import type { League, Matchup, Roster, SleeperUser } from '../../api/types';
import { computePositionGroupRanks } from '../analytics';
import { computeEliminations } from '../elimination';

vi.mock('../../store/players', () => ({
  getPlayerPosition: (id: string) => id.split('-')[1] ?? '',
}));

const league: League = {
  league_id: 'realistic-guillotine',
  name: 'Four-team Guillotine',
  total_rosters: 4,
  settings: { playoff_teams: 0 },
  scoring_settings: {},
  season: '2026',
  season_type: 'regular',
  status: 'in_season',
  draft_id: 'draft',
  previous_league_id: null,
  roster_positions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
};

function roster(id: number): Roster {
  return {
    roster_id: id,
    owner_id: `user-${id}`,
    players: [],
    starters: [],
    settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
  };
}

function user(id: number): SleeperUser {
  return {
    user_id: `user-${id}`,
    display_name: `Manager ${id}`,
    avatar: null,
    username: `manager${id}`,
  };
}

function matchup(rosterId: number, points: number, starterPoints: number[]): Matchup {
  const starters = ['QB', 'RB', 'WR', 'TE', 'RB', 'K', 'DEF'].map(
    (position, index) => `${rosterId}-${position}-${index}`,
  );
  return {
    roster_id: rosterId,
    matchup_id: rosterId,
    points,
    starters,
    starters_points: starterPoints,
    players: starters,
    players_points: Object.fromEntries(starters.map((playerId, index) => [playerId, starterPoints[index]])),
  };
}

describe('computePositionGroupRanks', () => {
  it('ranks every supported position only among surviving teams with stable roster-ID ties', () => {
    const rosters = [1, 2, 3, 4].map(roster);
    const users = [1, 2, 3, 4].map(user);
    const matchups = new Map<number, Matchup[]>([
      [1, [
        matchup(1, 120, [20, 10, 30, 8, 15, 9, 12]),
        matchup(2, 110, [18, 20, 25, 10, 14, 8, 10]),
        matchup(3, 100, [20, 15, 20, 12, 13, 7, 8]),
        // Historical position totals are intentionally extreme, but this team
        // is eliminated by its official weekly score and cannot affect standings.
        matchup(4, 1, [100, 100, 100, 100, 100, 100, 100]),
      ]],
    ]);

    const elimination = computeEliminations(matchups, rosters, users);
    const activeRosterIds = new Set(
      [...elimination.teams.values()]
        .filter((team) => team.eliminatedWeek == null)
        .map((team) => team.rosterId)
        .reverse(), // deliberately oppose numeric order to exercise the tie-breaker
    );
    const ranks = computePositionGroupRanks(matchups, league, activeRosterIds);

    expect(activeRosterIds).toEqual(new Set([1, 2, 3]));
    expect(ranks.has(4)).toBe(false);
    expect([...ranks.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3]);

    for (const rosterId of activeRosterIds) {
      const groups = ranks.get(rosterId)!;
      expect(groups.map((group) => group.position)).toEqual(['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF']);
      expect(groups.every((group) => group.outOf === 3)).toBe(true);
      expect(groups.every((group) => group.rank <= 3)).toBe(true);
    }

    const team1 = Object.fromEntries(ranks.get(1)!.map((group) => [group.position, group]));
    const team2 = Object.fromEntries(ranks.get(2)!.map((group) => [group.position, group]));
    const team3 = Object.fromEntries(ranks.get(3)!.map((group) => [group.position, group]));

    // Equal QB totals are resolved by numeric roster ID, never insertion order.
    expect(team1.QB).toMatchObject({ points: 20, rank: 1, outOf: 3 });
    expect(team3.QB).toMatchObject({ points: 20, rank: 2, outOf: 3 });
    expect(team2.QB).toMatchObject({ points: 18, rank: 3, outOf: 3 });

    // The second RB starter remains allocated to the distinct FLEX category.
    expect(team1.RB).toMatchObject({ points: 10, rank: 3 });
    expect(team1.FLEX).toMatchObject({ points: 15, rank: 1 });
    expect(team1.WR).toMatchObject({ points: 30, rank: 1 });
    expect(team3.TE).toMatchObject({ points: 12, rank: 1 });
    expect(team1.K).toMatchObject({ points: 9, rank: 1 });
    expect(team1.DEF).toMatchObject({ points: 12, rank: 1 });
  });
});
