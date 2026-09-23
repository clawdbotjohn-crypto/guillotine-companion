import { describe, expect, it, vi } from 'vitest';
import type { League, Matchup, Roster, SleeperUser } from '../../api/types';
import {
  computeHistoricalRanks,
  computePositionGroupRanks,
  formatProjectedCurrentRank,
  projectAllTeams,
} from '../analytics';
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

describe('Sleeper weekly best-lineup projections', () => {
  it('optimizes fixed and flex slots once for both team score and projected rank', () => {
    const rosters = [roster(1), roster(2), roster(3)];
    rosters[0].players = ['1-RB-a', '1-RB-b', '1-WR-a'];
    rosters[1].players = ['2-RB-a', '2-WR-a'];
    rosters[2].players = ['3-RB-a', '3-WR-a'];
    const users = [user(1), user(2), user(3)];
    const matchups = new Map<number, Matchup[]>([[1, [
      matchup(1, 100, [1, 1, 1, 1, 1, 1, 1]),
      matchup(2, 90, [99, 99, 99, 99, 99, 99, 99]),
      matchup(3, 1, [500, 500, 500, 500, 500, 500, 500]),
    ]]]);
    const elimination = computeEliminations(matchups, rosters, users);
    const weekly = new Map([
      ['1-RB-a', { playerId: '1-RB-a', position: 'RB', points: 20 }],
      ['1-RB-b', { playerId: '1-RB-b', position: 'RB', points: 15 }],
      ['1-WR-a', { playerId: '1-WR-a', position: 'WR', points: 19 }],
      ['2-RB-a', { playerId: '2-RB-a', position: 'RB', points: 17 }],
      ['2-WR-a', { playerId: '2-WR-a', position: 'WR', points: 16 }],
      ['3-RB-a', { playerId: '3-RB-a', position: 'RB', points: 100 }],
    ]);
    const projections = projectAllTeams(
      rosters,
      weekly,
      { ...league, roster_positions: ['RB', 'FLEX'] },
      elimination,
    );
    const team1 = projections.find((team) => team.rosterId === 1)!;

    expect(team1.projPoints).toBe(39);
    expect(team1.starters).toEqual([
      { playerId: '1-RB-a', position: 'RB', proj: 20 },
      { playerId: '1-WR-a', position: 'FLEX', proj: 19 },
    ]);
    expect(team1).toMatchObject({ projRank: 1, projOutOf: 2, risk: 'middle' });
  });

  it('keeps score and rank unavailable without a usable weekly payload', () => {
    const rosters = [roster(1), roster(2)];
    const users = [user(1), user(2)];
    const matchups = new Map<number, Matchup[]>([[1, [
      matchup(1, 100, [50, 50, 50, 50, 50, 50, 50]),
      matchup(2, 90, [40, 40, 40, 40, 40, 40, 40]),
    ]]]);
    const elimination = computeEliminations(matchups, rosters, users);

    const projections = projectAllTeams(rosters, null, league, elimination);

    expect(projections.every((team) => team.projPoints == null)).toBe(true);
    expect(projections.every((team) => team.projRank === 0 && team.projOutOf === 0)).toBe(true);
  });
});

describe('current team ranking semantics', () => {
  it('keeps projected and historical standings active-only and mode-specific in a 32-to-28 league', () => {
    const rosters: Roster[] = Array.from({ length: 32 }, (_, index) => {
      const id = index + 1;
      return {
        ...roster(id),
        players: [`${id}-QB`],
        starters: [`${id}-QB`],
      };
    });
    const users = Array.from({ length: 32 }, (_, index) => user(index + 1));

    const weekOneScore = (id: number) => {
      if (id === 1) return 1;
      if (id === 2) return 2;
      if (id === 3) return 200;
      if (id === 4) return 3;
      if (id === 29) return 10;
      if (id >= 30) return 50 + id;
      return 100 + id;
    };
    const weekTwoScore = (id: number) => {
      if (id === 3) return 1;
      if (id === 4) return 2;
      if (id === 29) return 10;
      return 100;
    };
    const projectedPoints = (id: number) => {
      if (id === 29) return 300;
      if (id === 30) return 1;
      if (id === 31) return 2;
      if (id === 32) return 3;
      if (id === 28) return 4;
      return 100 - id;
    };
    const rankingMatchup = (id: number, points: number): Matchup => ({
      roster_id: id,
      matchup_id: id,
      points,
      starters: [`${id}-QB`],
      starters_points: [projectedPoints(id)],
      players: [`${id}-QB`],
      players_points: { [`${id}-QB`]: projectedPoints(id) },
    });
    const matchups = new Map<number, Matchup[]>([
      [1, rosters.map((entry) => rankingMatchup(entry.roster_id, weekOneScore(entry.roster_id)))],
      [2, rosters
        .filter((entry) => entry.roster_id > 2)
        .map((entry) => rankingMatchup(entry.roster_id, weekTwoScore(entry.roster_id)))],
    ]);
    const rankingLeague: League = {
      ...league,
      name: '32-team Guillotine',
      total_rosters: 32,
      roster_positions: ['QB'],
    };

    const elimination = computeEliminations(matchups, rosters, users);
    const weeklyProjections = new Map(
      rosters.map((entry) => {
        const playerId = `${entry.roster_id}-QB`;
        return [playerId, {
          playerId,
          position: 'QB',
          points: projectedPoints(entry.roster_id),
        }];
      }),
    );
    const projections = projectAllTeams(
      rosters,
      weeklyProjections,
      rankingLeague,
      elimination,
    );
    const historical = computeHistoricalRanks(elimination);
    const activeProjections = projections.filter((team) => !team.eliminated);
    const team29Projection = projections.find((team) => team.rosterId === 29)!;
    const team29Historical = historical.get(29)!;

    expect(elimination.activeTeamCount).toBe(28);
    expect(activeProjections).toHaveLength(28);
    expect(Math.max(...activeProjections.map((team) => team.projRank))).toBe(28);
    expect(activeProjections.every((team) => team.projOutOf === 28)).toBe(true);
    expect([...historical.values()]).toHaveLength(28);
    expect(Math.max(...[...historical.values()].map((standing) => standing.rank))).toBe(28);
    expect([...historical.values()].every((standing) => standing.outOf === 28)).toBe(true);

    // This survivor was #29/32 under the old all-team cumulative ranking:
    // 27 survivors plus eliminated roster 3 had more historical points.
    const allTeamTotals = new Map<number, number>();
    for (const week of matchups.values()) {
      for (const entry of week) {
        allTeamTotals.set(entry.roster_id, (allTeamTotals.get(entry.roster_id) ?? 0) + entry.points);
      }
    }
    const oldAllTeamOrder = [...allTeamTotals.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    expect(oldAllTeamOrder.findIndex(([rosterId]) => rosterId === 29) + 1).toBe(29);

    // The same team is strongest by best-lineup projection but weakest by
    // cumulative survivor points, so each tab must own its order and badge.
    expect(team29Projection).toMatchObject({ projRank: 1, projOutOf: 28, risk: 'safe' });
    expect(team29Historical).toMatchObject({ rank: 28, outOf: 28, risk: 'at-risk' });
    expect(formatProjectedCurrentRank(team29Projection)).toBe('1/28');

    expect(activeProjections.slice(-4).map((standing) => standing.risk)).toEqual([
      'middle',
      'middle',
      'at-risk',
      'at-risk',
    ]);
    const historicalByRank = [...historical.values()].sort((a, b) => a.rank - b.rank);
    expect(historicalByRank.slice(-4).map((standing) => standing.risk)).toEqual([
      'middle',
      'middle',
      'at-risk',
      'at-risk',
    ]);
    expect(projections.filter((team) => team.eliminated).every((team) =>
      team.projRank === 0 && team.projOutOf === 0 && !historical.has(team.rosterId)
    )).toBe(true);
  });
});
