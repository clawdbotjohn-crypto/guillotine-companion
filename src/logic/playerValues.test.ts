import { describe, expect, it } from 'vitest';
import type { Roster } from '../api/types';
import type { RosPlayerProjection } from './projections';
import { buildPositionRanks, buildSelectedRosterValueDisplay, collectRosterPlayerIds, rankActiveRosterValues, selectedPlayerValue, summarizeRosterValue } from './playerValues';

function roster(id: number, players: string[], reserve?: string[], taxi?: string[]): Roster {
  return { roster_id: id, owner_id: `u${id}`, players, starters: [], reserve, taxi, settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 } };
}
function projection(id: string, position: string, value: number): RosPlayerProjection {
  return { playerId: id, position, totalPoints: value, sourceValue: value, pointsPerWeek: value, projectedWeeks: 1 };
}

describe('player value helpers', () => {
  it('prefers explicit source values and ranks positions deterministically', () => {
    const values = new Map([
      ['b', projection('b', 'RB', 10)],
      ['a', projection('a', 'RB', 10)],
      ['c', projection('c', 'WR', 9)],
    ]);
    expect(selectedPlayerValue(values.get('a'))).toBe(10);
    expect([...buildPositionRanks(values)]).toEqual([['a', 1], ['b', 2], ['c', 1]]);
  });

  it('deduplicates all roster coordinates including reserve and taxi', () => {
    const item = roster(1, ['a', 'b', 'a'], ['b', 'c'], ['d', 'c']);
    expect(collectRosterPlayerIds(item)).toEqual(['a', 'b', 'c', 'd']);
    expect(summarizeRosterValue(item, new Map([
      ['a', projection('a', 'RB', 3)],
      ['c', projection('c', 'WR', 7)],
      ['d', projection('d', 'QB', 0)],
    ]))).toEqual({ rosterId: 1, total: 10, matched: 3, missing: 1, playerCount: 4 });
  });

  it('ranks active rosters only, uses stable roster id for ties, and bounds the denominator', () => {
    const values = new Map([
      ['a', projection('a', 'RB', 10)],
      ['b', projection('b', 'RB', 10)],
      ['c', projection('c', 'RB', 99)],
    ]);
    const ranked = rankActiveRosterValues(
      [roster(2, ['b']), roster(1, ['a']), roster(3, ['c'])],
      new Set([1, 2]),
      values,
    );
    expect([...ranked.keys()]).toEqual([1, 2]);
    expect(ranked.get(1)?.rank).toBe(1);
    expect(ranked.get(2)).toMatchObject({ rank: 2, outOf: 2 });
    expect(ranked.has(3)).toBe(false);
  });

  it('always summarizes an eliminated selection without ranking it among survivors', () => {
    const activeLow = roster(1, ['a']);
    const activeHigh = roster(2, ['b']);
    const eliminated = roster(3, ['c', 'missing']);
    const rosters = [activeLow, activeHigh, eliminated];
    const activeRosterIds = new Set([1, 2]);
    const values = new Map([
      ['a', projection('a', 'RB', 10)],
      ['b', projection('b', 'RB', 20)],
      ['c', projection('c', 'RB', 99)],
    ]);

    expect(buildSelectedRosterValueDisplay(eliminated, rosters, activeRosterIds, values)).toEqual({
      rosterId: 3,
      total: 99,
      matched: 1,
      missing: 1,
      playerCount: 2,
      eliminated: true,
      rank: null,
      outOf: 2,
    });
    expect(buildSelectedRosterValueDisplay(activeLow, rosters, activeRosterIds, values)).toMatchObject({
      eliminated: false,
      rank: 2,
      outOf: 2,
    });
  });
});
