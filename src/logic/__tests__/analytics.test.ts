import { describe, expect, it, vi } from 'vitest';
import type { League, Matchup, Roster, SleeperUser } from '../../api/types';
import {
  computeAllRosterHistoricalRanks,
  computeHistoricalRanks,
  computePositionGroupRanks,
  computeProjectedLineupGroupRanks,
  formatProjectedCurrentRank,
  orderTeamProjections,
  projectAllTeams,
  rankActiveTeams,
} from '../analytics';
import { computeEliminations } from '../elimination';
import { buildHubRosterRows } from '../hubRoster';

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

describe('active-team risk thresholds', () => {
  const standingsByRank = (activeTeams: number, elimsPerWeek: number) => {
    const standings = rankActiveTeams(
      Array.from({ length: activeTeams }, (_, index) => ({
        rosterId: index + 1,
        value: activeTeams - index,
        eliminated: false,
      })),
      elimsPerWeek,
    );
    return [...standings.values()].sort((a, b) => a.rank - b.rank);
  };

  it('flags exactly ranks 19-28 in a 28-team, two-cut league', () => {
    const standings = standingsByRank(28, 2);

    expect(standings.slice(0, 18).every((standing) => standing.risk === 'safe')).toBe(true);
    expect(standings.slice(18, 26).every((standing) => standing.risk === 'warning')).toBe(true);
    expect(standings.slice(26).every((standing) => standing.risk === 'at-risk')).toBe(true);
    expect(standings[17]).toMatchObject({ rank: 18, risk: 'safe' });
    expect(standings[18]).toMatchObject({ rank: 19, risk: 'warning' });
    expect(standings[25]).toMatchObject({ rank: 26, risk: 'warning' });
    expect(standings[26]).toMatchObject({ rank: 27, risk: 'at-risk' });
    expect(standings[27]).toMatchObject({ rank: 28, risk: 'at-risk' });
  });

  it('uses the four-team minimum and caps it to leagues smaller than four', () => {
    expect(standingsByRank(6, 1).map((standing) => standing.risk)).toEqual([
      'safe',
      'safe',
      'warning',
      'warning',
      'warning',
      'at-risk',
    ]);
    expect(standingsByRank(3, 1).map((standing) => standing.risk)).toEqual([
      'warning',
      'warning',
      'at-risk',
    ]);
  });
});

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
    expect(team1).toMatchObject({ projRank: 1, projOutOf: 2, risk: 'warning' });
  });

  it('keeps Hub and Teams coherent when an optimized bench player displaces a Sleeper starter', () => {
    const rosters = [roster(1), roster(2), roster(3), roster(4)];
    const lineupLeague = {
      ...league,
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'FLEX', 'SUPER_FLEX', 'BN'],
    };
    const pointsByRoster: Record<number, Array<[string, string, number]>> = {
      1: [
        ['1-QB-a', 'QB', 20], ['1-QB-b', 'QB', 14],
        ['1-RB-a', 'RB', 18], ['1-RB-b', 'RB', 17], ['1-RB-c', 'RB', 16],
        ['1-WR-current-low', 'WR', 1], ['1-WR-bench-high', 'WR', 15],
      ],
      2: [
        ['2-QB-a', 'QB', 18], ['2-QB-b', 'QB', 12],
        ['2-RB-a', 'RB', 17], ['2-RB-b', 'RB', 16], ['2-RB-c', 'RB', 14],
        ['2-WR-a', 'WR', 13],
      ],
      3: [
        ['3-QB-a', 'QB', 16], ['3-QB-b', 'QB', 10],
        ['3-RB-a', 'RB', 15], ['3-RB-b', 'RB', 14], ['3-RB-c', 'RB', 12],
        ['3-WR-a', 'WR', 11],
      ],
      // Official Week 1 elimination keeps this absurd projected lineup out of every current pool.
      4: [
        ['4-QB-a', 'QB', 100], ['4-QB-b', 'QB', 99],
        ['4-RB-a', 'RB', 100], ['4-RB-b', 'RB', 99], ['4-RB-c', 'RB', 98],
        ['4-WR-a', 'WR', 100],
      ],
    };
    for (const team of rosters) {
      team.players = pointsByRoster[team.roster_id].map(([playerId]) => playerId);
      team.starters = team.roster_id === 1
        ? ['1-QB-a', '1-RB-a', '1-RB-b', '1-WR-current-low', '1-RB-c', '1-QB-b']
        : team.players.slice(0, 6);
    }
    const weekly = new Map(
      Object.values(pointsByRoster).flat().map(([playerId, position, points]) => [playerId, {
        playerId,
        position,
        points,
      }]),
    );
    const matchups = new Map<number, Matchup[]>([[1, [
      matchup(1, 120, [1, 1, 1, 1, 1, 1, 1]),
      matchup(2, 110, [1, 1, 1, 1, 1, 1, 1]),
      matchup(3, 100, [1, 1, 1, 1, 1, 1, 1]),
      matchup(4, 1, [100, 100, 100, 100, 100, 100, 100]),
    ]]]);
    const elimination = computeEliminations(matchups, rosters, [1, 2, 3, 4].map(user));

    const projections = projectAllTeams(rosters, weekly, lineupLeague, elimination);
    const projectedGroups = computeProjectedLineupGroupRanks(projections, weekly, lineupLeague);
    const historical = computeHistoricalRanks(elimination);
    const team1 = projections.find((team) => team.rosterId === 1)!;
    const hubRows = buildHubRosterRows({
      roster: rosters[0],
      teamProjection: team1,
      weeklyProjections: weekly,
      players: undefined,
      season: undefined,
      transactions: undefined,
      draftPicks: undefined,
    });

    // Hub optimized total/current rank and Teams Projected total/order/rank are the same object/model.
    expect(team1).toMatchObject({ projPoints: 100, projRank: 1, projOutOf: 3 });
    expect(formatProjectedCurrentRank(team1)).toBe('1/3');
    expect(orderTeamProjections(projections, historical, 'projected').map((team) => team.rosterId))
      .toEqual([1, 2, 3, 4]);
    expect(orderTeamProjections(projections, historical, 'projected')[0])
      .toMatchObject({ rosterId: 1, projPoints: 100, projRank: 1, projOutOf: 3 });

    // The higher-projected current BENCH WR becomes STARTER; the low current starter becomes BENCH.
    expect(hubRows.find((row) => row.playerId === '1-WR-bench-high'))
      .toMatchObject({ isStarter: true, starterSlot: 'WR', projection: 15 });
    expect(hubRows.find((row) => row.playerId === '1-WR-current-low'))
      .toMatchObject({ isStarter: false, starterSlot: null, projection: 1 });

    // Teams Projected expanded groups come directly from those optimized assignments.
    const team1Groups = Object.fromEntries(
      projectedGroups.byRosterId.get(1)!.map((row) => [row.group, row]),
    );
    expect(team1Groups.RB).toMatchObject({ slotCount: 2, points: 35, rank: 1, outOf: 3 });
    expect(team1Groups.WR).toMatchObject({ slotCount: 1, points: 15, rank: 1, outOf: 3 });
    expect(team1Groups.FLEX).toMatchObject({ slotCount: 1, points: 16, rank: 1, outOf: 3 });
    expect(team1Groups.SUPER_FLEX).toMatchObject({ slotCount: 1, points: 14, rank: 1, outOf: 3 });
    expect(projectedGroups.byRosterId.has(4)).toBe(false);
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

describe('projected lineup group rankings', () => {
  it('uses optimized duplicate, FLEX, and SUPER_FLEX assignments and excludes eliminated teams', () => {
    const rosters = [roster(1), roster(2), roster(3), roster(4)];
    const playerPoints: Record<number, Array<[string, number]>> = {
      1: [
        ['1-QB-a', 20], ['1-QB-b', 12],
        ['1-RB-a', 18], ['1-RB-b', 16], ['1-RB-c', 14],
        ['1-WR-a', 15], ['1-WR-b', 13],
      ],
      2: [
        ['2-QB-a', 19], ['2-QB-b', 18],
        ['2-RB-a', 20], ['2-RB-b', 17], ['2-RB-c', 12],
        ['2-WR-a', 16], ['2-WR-b', 15],
      ],
      3: [
        ['3-QB-a', 10], ['3-QB-b', 9],
        ['3-RB-a', 13], ['3-RB-b', 11], ['3-RB-c', 8],
        ['3-WR-a', 12], ['3-WR-b', 7],
      ],
      // This eliminated roster would rank first in every group if it leaked
      // into either the comparison pool or denominator.
      4: [
        ['4-QB-a', 100], ['4-QB-b', 99],
        ['4-RB-a', 100], ['4-RB-b', 99], ['4-RB-c', 98],
        ['4-WR-a', 100], ['4-WR-b', 99],
      ],
    };
    for (const team of rosters) {
      team.players = playerPoints[team.roster_id].map(([playerId]) => playerId);
    }
    const users = [1, 2, 3, 4].map(user);
    const matchups = new Map<number, Matchup[]>([[1, [
      matchup(1, 120, [1, 1, 1, 1, 1, 1, 1]),
      matchup(2, 110, [1, 1, 1, 1, 1, 1, 1]),
      matchup(3, 100, [1, 1, 1, 1, 1, 1, 1]),
      matchup(4, 1, [1, 1, 1, 1, 1, 1, 1]),
    ]]]);
    const elimination = computeEliminations(matchups, rosters, users);
    const weekly = new Map(
      Object.values(playerPoints).flat().map(([playerId, points]) => [playerId, {
        playerId,
        position: playerId.split('-')[1],
        points,
      }]),
    );
    const nonstandardLeague: League = {
      ...league,
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'FLEX', 'SUPER_FLEX', 'BN'],
    };

    const projections = projectAllTeams(rosters, weekly, nonstandardLeague, elimination);
    const rankings = computeProjectedLineupGroupRanks(projections, weekly, nonstandardLeague);
    const team1Projection = projections.find((team) => team.rosterId === 1)!;
    const team1 = Object.fromEntries(
      rankings.byRosterId.get(1)!.map((row) => [row.group, row]),
    );

    // These are the actual assignments made by projectAllTeams. In particular,
    // FLEX receives the best remaining FLEX player and SF receives the next
    // remaining QB/RB/WR/TE; no hard-coded position subtotal is reconstructed.
    expect(team1Projection.starters).toEqual([
      { playerId: '1-QB-a', position: 'QB', proj: 20 },
      { playerId: '1-RB-a', position: 'RB', proj: 18 },
      { playerId: '1-RB-b', position: 'RB', proj: 16 },
      { playerId: '1-WR-a', position: 'WR', proj: 15 },
      { playerId: '1-RB-c', position: 'FLEX', proj: 14 },
      { playerId: '1-WR-b', position: 'SFLEX', proj: 13 },
    ]);
    expect(team1.RB).toMatchObject({ slotCount: 2, points: 34, rank: 2, outOf: 3 });
    expect(team1.FLEX).toMatchObject({ slotCount: 1, points: 14, rank: 2, outOf: 3 });
    expect(team1.SUPER_FLEX).toMatchObject({ slotCount: 1, points: 13, rank: 2, outOf: 3 });
    expect(rankings.byRosterId.has(4)).toBe(false);
    expect([...rankings.byRosterId.keys()].sort()).toEqual([1, 2, 3]);
    expect(rankings.unavailableGroups).toEqual([]);

    const qbFlexLeague = {
      ...nonstandardLeague,
      roster_positions: nonstandardLeague.roster_positions.map((slot) =>
        slot === 'SUPER_FLEX' ? 'QB_FLEX' : slot),
    };
    const qbFlexProjections = projectAllTeams(rosters, weekly, qbFlexLeague, elimination);
    const qbFlexRankings = computeProjectedLineupGroupRanks(
      qbFlexProjections,
      weekly,
      qbFlexLeague,
    );
    expect(qbFlexRankings.byRosterId.get(1)?.find((row) => row.group === 'SUPER_FLEX'))
      .toMatchObject({ points: 13, rank: 2, outOf: 3 });
  });

  it('keeps the configured group and treats an omitted/bye player projection as honest zero', () => {
    const rosters = [roster(1), roster(2), roster(3)];
    rosters[0].players = ['1-QB-a'];
    rosters[1].players = ['2-QB-a'];
    rosters[2].players = ['3-QB-a'];
    const users = [user(1), user(2), user(3)];
    const matchups = new Map<number, Matchup[]>([[1, [
      matchup(1, 100, [1, 1, 1, 1, 1, 1, 1]),
      matchup(2, 90, [1, 1, 1, 1, 1, 1, 1]),
      matchup(3, 1, [1, 1, 1, 1, 1, 1, 1]),
    ]]]);
    const elimination = computeEliminations(matchups, rosters, users);
    const weekly = new Map([
      ['1-QB-a', { playerId: '1-QB-a', position: 'QB', points: 20 }],
    ]);
    const qbLeague = { ...league, roster_positions: ['QB'] };

    const projections = projectAllTeams(rosters, weekly, qbLeague, elimination);
    const rankings = computeProjectedLineupGroupRanks(projections, weekly, qbLeague);

    expect(rankings.byRosterId.get(1)?.[0]).toMatchObject({ group: 'QB', points: 20, rank: 1, outOf: 2 });
    expect(rankings.byRosterId.get(2)?.[0]).toMatchObject({ group: 'QB', points: 0, rank: 2, outOf: 2 });
    expect(rankings.unavailableGroups).toEqual([]);
  });

  it('ranks every configured fixed/flex/kicker/defense group for all active teams', () => {
    const configuredLeague = { ...league, roster_positions: ['QB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF'] };
    const starters = (prefix: string, multiplier: number) => [
      ['QB', 20], ['RB', 15], ['WR', 14], ['WR', 13], ['TE', 10], ['FLEX', 12], ['SFLEX', 11], ['K', 8], ['DEF', 0],
    ].map(([position, points], index) => ({ playerId: `${prefix}-${position}-${index}`, position: position as string, proj: Number(points) * multiplier }));
    const projections = [
      { rosterId: 1, displayName: 'One', projPoints: 103, eliminated: false, projRank: 1, projOutOf: 2, risk: 'safe' as const, starters: starters('a', 1) },
      { rosterId: 2, displayName: 'Two', projPoints: 51.5, eliminated: false, projRank: 2, projOutOf: 2, risk: 'warning' as const, starters: starters('b', 0.5) },
      { rosterId: 3, displayName: 'Cut', projPoints: 999, eliminated: true, projRank: 0, projOutOf: 0, risk: 'at-risk' as const, starters: starters('c', 9) },
    ];
    const weekly = new Map([['endpoint-available', { playerId: 'endpoint-available', position: 'QB', points: 1 }]]);
    const rankings = computeProjectedLineupGroupRanks(projections, weekly, configuredLeague);
    expect(rankings.byRosterId.get(1)?.map((row) => row.group)).toEqual(['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF']);
    expect(rankings.byRosterId.get(1)?.find((row) => row.group === 'WR')).toMatchObject({ slotCount: 2, points: 27, outOf: 2 });
    expect(rankings.byRosterId.get(2)?.every((row) => row.outOf === 2)).toBe(true);
    expect(rankings.byRosterId.has(3)).toBe(false);
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

    expect(activeProjections.map((standing) => standing.risk)).toEqual([
      ...Array(18).fill('safe'),
      ...Array(8).fill('warning'),
      'at-risk',
      'at-risk',
    ]);
    const historicalByRank = [...historical.values()].sort((a, b) => a.rank - b.rank);
    expect(historicalByRank.map((standing) => standing.risk)).toEqual([
      ...Array(18).fill('safe'),
      ...Array(8).fill('warning'),
      'at-risk',
      'at-risk',
    ]);
    expect(projections.filter((team) => team.eliminated).every((team) =>
      team.projRank === 0 && team.projOutOf === 0 && !historical.has(team.rosterId)
    )).toBe(true);
  });
});

describe('all-roster historical total rank', () => {
  it('ranks season-to-date totals across every original roster, including eliminated teams', () => {
    const rosters = [roster(1), roster(2), roster(3), roster(4)];
    const users = [user(1), user(2), user(3), user(4)];
    const matchups = new Map<number, Matchup[]>([
      [1, [
        matchup(1, 100, [1, 1, 1, 1, 1, 1, 1]),
        matchup(2, 90, [1, 1, 1, 1, 1, 1, 1]),
        matchup(3, 80, [1, 1, 1, 1, 1, 1, 1]),
        matchup(4, 70, [1, 1, 1, 1, 1, 1, 1]),
      ]],
      [2, [
        matchup(1, 20, [1, 1, 1, 1, 1, 1, 1]),
        matchup(2, 25, [1, 1, 1, 1, 1, 1, 1]),
        matchup(3, 30, [1, 1, 1, 1, 1, 1, 1]),
      ]],
    ]);
    const elimination = computeEliminations(matchups, rosters, users);

    const ranks = computeAllRosterHistoricalRanks(elimination);

    expect(ranks.size).toBe(4);
    expect(ranks.get(3)).toMatchObject({ rank: 3, outOf: 4, totalPoints: 110 });
    expect(ranks.get(4)).toMatchObject({ rank: 4, outOf: 4, totalPoints: 70 });
    expect(elimination.teams.get(4)?.eliminatedWeek).toBe(1);
  });
});
