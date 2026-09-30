import { describe, expect, it } from 'vitest';
import type { League, Roster } from '../api/types';
import type { EliminationResult } from './elimination';
import type { WeeklyScoredPlayer } from './projections';
import { buildFreeAgentTeamImpact } from './teamImpact';

const league: League = {
  league_id: 'league',
  name: 'League',
  total_rosters: 4,
  settings: {},
  scoring_settings: { rec: 1 },
  season: '2026',
  season_type: 'regular',
  status: 'in_season',
  draft_id: 'draft',
  previous_league_id: null,
  roster_positions: ['QB', 'WR', 'FLEX', 'BN'],
};

function roster(rosterId: number, players: string[]): Roster {
  return {
    roster_id: rosterId,
    owner_id: `u${rosterId}`,
    players,
    starters: [],
    settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
  };
}

function elimination(eliminatedRosterIds: number[] = [4]): EliminationResult {
  return {
    weeks: [{
      week: 1,
      teamsRemaining: 3,
      scores: [],
      topScore: 0,
      avgScore: 0,
      lowScore: 0,
      cutoffScore: 0,
      eliminated: eliminatedRosterIds,
      isFinals: false,
    }],
    teams: new Map([1, 2, 3, 4].map((rosterId) => [rosterId, {
      rosterId,
      userId: `u${rosterId}`,
      displayName: `Team ${rosterId}`,
      eliminatedWeek: eliminatedRosterIds.includes(rosterId) ? 1 : null,
      isChampion: false,
      isRunnerUp: false,
    }])),
    activeTeamCount: 4 - eliminatedRosterIds.length,
    champion: null,
    runnerUp: null,
    isComplete: false,
    currentWeek: 1,
  };
}

function weekly(rows: Array<[string, string, number]>): Map<string, WeeklyScoredPlayer> {
  return new Map(rows.map(([playerId, position, points]) => [playerId, { playerId, position, points }]));
}

const rosters = [
  roster(1, ['q1', 'w1', 'r1', 'bench']),
  roster(2, ['q2', 'w2', 'r2']),
  roster(3, ['q3', 'w3', 'r3']),
  roster(4, ['q4', 'w4', 'r4']),
];
const projections = weekly([
  ['q1', 'QB', 10], ['w1', 'WR', 8], ['r1', 'RB', 6], ['bench', 'TE', 0],
  ['q2', 'QB', 12], ['w2', 'WR', 16], ['r2', 'RB', 8],
  ['q3', 'QB', 9], ['w3', 'WR', 7], ['r3', 'RB', 5],
  ['q4', 'QB', 50], ['w4', 'WR', 50], ['r4', 'RB', 50],
  ['free-wr', 'WR', 20], ['low-wr', 'WR', 1],
]);

describe('buildFreeAgentTeamImpact', () => {
  it('reuses active-only optimized rankings and models the deterministic full-roster drop', () => {
    const result = buildFreeAgentTeamImpact({
      playerId: 'free-wr',
      playerPosition: 'WR',
      selectedRosterId: 1,
      rosters,
      league,
      elimination: elimination(),
      weeklyProjections: projections,
    });

    expect(result).toEqual({
      status: 'available',
      overallRank: { before: 2, after: 1, outOf: 3 },
      positionRank: { before: 2, after: 1, outOf: 3 },
      lineupPoints: { before: 24, after: 38 },
      position: 'WR',
      incomingPlayerStarts: true,
      displacedStarterIds: ['r1'],
      assumedDropPlayerId: 'bench',
      dropReason: 'lowest-projected-non-starter',
    });
  });

  it('reports a truthful zero-impact scenario without inventing a drop', () => {
    const result = buildFreeAgentTeamImpact({
      playerId: 'low-wr',
      playerPosition: 'WR',
      selectedRosterId: 1,
      rosters,
      league: { ...league, roster_positions: [...league.roster_positions, 'BN'] },
      elimination: elimination(),
      weeklyProjections: projections,
    });

    expect(result).toMatchObject({
      status: 'available',
      overallRank: { before: 2, after: 2, outOf: 3 },
      positionRank: { before: 2, after: 2, outOf: 3 },
      lineupPoints: { before: 24, after: 24 },
      incomingPlayerStarts: false,
      displacedStarterIds: [],
      assumedDropPlayerId: null,
      dropReason: null,
    });
  });

  it.each([
    {
      name: 'unknown selected team',
      selectedRosterId: null,
      playerId: 'free-wr',
      elim: elimination(),
      weeklyProjections: projections,
      reason: 'Select your team to calculate impact.',
    },
    {
      name: 'eliminated selected team',
      selectedRosterId: 1,
      playerId: 'free-wr',
      elim: elimination([1]),
      weeklyProjections: projections,
      reason: 'Team impact is unavailable for an eliminated team.',
    },
    {
      name: 'already-rostered player',
      selectedRosterId: 1,
      playerId: 'w2',
      elim: elimination(),
      weeklyProjections: projections,
      reason: 'This player is already rostered.',
    },
    {
      name: 'missing weekly projections',
      selectedRosterId: 1,
      playerId: 'free-wr',
      elim: elimination(),
      weeklyProjections: null,
      reason: 'Next-week Sleeper projections are unavailable.',
    },
    {
      name: 'missing player projection',
      selectedRosterId: 1,
      playerId: 'missing',
      elim: elimination(),
      weeklyProjections: projections,
      reason: 'This player has no next-week Sleeper projection.',
    },
  ])('returns one honest unavailable state for $name', ({ selectedRosterId, playerId, elim, weeklyProjections, reason }) => {
    expect(buildFreeAgentTeamImpact({
      playerId,
      playerPosition: 'WR',
      selectedRosterId,
      rosters,
      league,
      elimination: elim,
      weeklyProjections,
    })).toEqual({ status: 'unavailable', reason });
  });

  it('does not expose partial impact when the native position rank cannot be modeled', () => {
    expect(buildFreeAgentTeamImpact({
      playerId: 'free-wr',
      playerPosition: 'WR',
      selectedRosterId: 1,
      rosters,
      league: { ...league, roster_positions: ['QB', 'SUPER_FLEX', 'BN', 'BN'] },
      elimination: elimination(),
      weeklyProjections: projections,
    })).toEqual({
      status: 'unavailable',
      reason: 'The league lineup configuration cannot produce this position rank.',
    });
  });
});
