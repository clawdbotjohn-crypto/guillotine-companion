import { expect, it } from 'vitest';
import type { TeamProjection } from './analytics';
import type { EliminationResult, TeamInfo } from './elimination';
import { buildBiddingTeamStatusMap } from './biddingTeamStatus';

function team(rosterId: number, eliminatedWeek: number | null = null): TeamInfo {
  return {
    rosterId,
    userId: `u-${rosterId}`,
    displayName: `Team ${rosterId}`,
    eliminatedWeek,
    isChampion: false,
    isRunnerUp: false,
  };
}

function projection(
  rosterId: number,
  risk: TeamProjection['risk'],
  projPoints: number | null = 100,
): TeamProjection {
  return {
    rosterId,
    displayName: `Team ${rosterId}`,
    projPoints,
    eliminated: false,
    projRank: projPoints == null ? 0 : rosterId,
    projOutOf: projPoints == null ? 0 : 5,
    risk,
    starters: [],
  };
}

it('maps elimination and every existing projection risk to explicit bidding-team statuses', () => {
  const elimination: EliminationResult = {
    weeks: [],
    teams: new Map([
      [1, team(1, 3)],
      [2, team(2)],
      [3, team(3)],
      [4, team(4)],
      [5, team(5)],
    ]),
    activeTeamCount: 4,
    champion: null,
    runnerUp: null,
    isComplete: false,
    currentWeek: 4,
  };
  const statuses = buildBiddingTeamStatusMap(elimination, [
    projection(1, 'safe'),
    projection(2, 'safe'),
    projection(3, 'warning'),
    projection(4, 'at-risk'),
    projection(5, 'warning', null),
  ]);

  expect([...statuses.entries()].map(([id, status]) => [id, status.kind, status.label])).toEqual([
    [1, 'eliminated', 'Eliminated'],
    [2, 'safe', 'Safe'],
    [3, 'warning', 'Warning'],
    [4, 'danger', 'Danger'],
    [5, 'unavailable', 'Active · projection unavailable'],
  ]);
});
