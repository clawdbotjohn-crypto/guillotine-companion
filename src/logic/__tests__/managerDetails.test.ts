import { describe, expect, it } from 'vitest';
import type { ManagerBiddingProfile } from '../biddingProfiles';
import { buildManagerDetailData, teamNeedTier } from '../managerDetails';

const profile: ManagerBiddingProfile = {
  managerRosterId: 1,
  managerMultiplier: 1,
  style: 'standard',
  confidence: 'low',
  usableEvidenceCount: 1,
        baselineStrategyId: 'max-vorp',
        baselineStrategyVersion: 'max-vorp-v1',
  evidence: [],
};

function player(name: string, position: string, team: string) {
  return { full_name: name, first_name: name.split(' ')[0], last_name: name.split(' ')[1], position, team } as never;
}

describe('manager details', () => {
  it('orders current-roster byes by nearest week and then current value', () => {
    const result = buildManagerDetailData({
      profiles: [profile],
      rosters: [{ roster_id: 1, owner_id: 'u1', players: ['low', 'high', 'later', 'outside'], starters: [], settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 } }],
      players: new Map([
        ['low', player('Low Value', 'WR', 'CAR')],
        ['high', player('High Value', 'RB', 'KC')],
        ['later', player('Later Bye', 'QB', 'BUF')],
        ['outside', player('Outside Window', 'TE', 'HOU')],
      ]),
      season: '2026',
      currentWeek: 5,
      playerValues: new Map([['low', 10], ['high', 20], ['later', 100], ['outside', 200]]),
      positionRanks: new Map([['low', 8], ['high', 3], ['later', 2], ['outside', 1]]),
      projectedPositionRanks: new Map([[1, [
        { rosterId: 1, group: 'QB', projectedPoints: 25, rank: 1, outOf: 9 },
        { rosterId: 1, group: 'RB', projectedPoints: 10, rank: 9, outOf: 9 },
        { rosterId: 1, group: 'WR', projectedPoints: 18, rank: 5, outOf: 9 },
      ]]]),
    }).get(1)!;

    expect(result.upcomingByes.map((row) => `${row.name}:${row.byeWeek}`)).toEqual([
      'High Value:5', 'Low Value:5', 'Later Bye:7',
    ]);
    expect(result.upcomingByes[0]).toMatchObject({ position: 'RB', positionRank: 3 });
    expect(result.teamNeeds.map((row) => `${row.position}:${row.tier}`)).toEqual([
      'QB:strong', 'RB:weak', 'WR:neutral',
    ]);
  });

  it('uses the shared deterministic position quartiles', () => {
    expect(teamNeedTier(1, 8)).toBe('strong');
    expect(teamNeedTier(2, 8)).toBe('strong');
    expect(teamNeedTier(3, 8)).toBe('neutral');
    expect(teamNeedTier(6, 8)).toBe('neutral');
    expect(teamNeedTier(7, 8)).toBe('weak');
    expect(teamNeedTier(8, 8)).toBe('weak');
  });
});
