import { describe, expect, it } from 'vitest';
import type { Roster } from '../api/types';
import type { RosPlayerProjection } from './projections';
import { buildMaxVorpCalibration } from './waivers';
import { buildLeagueValuePositionBuckets } from './teamPositionGroups';
import {
  buildMaxVorpPlayerValues,
  buildModeledPositionRanks,
  buildSelectedRosterValueDisplay,
  collectRosterPlayerIds,
  rankActiveRosterPositionValues,
  rankActiveRosterValues,
  summarizeRosterValue,
} from './playerValues';

function roster(id: number, players: string[], reserve?: string[], taxi?: string[]): Roster {
  return { roster_id: id, owner_id: `u${id}`, players, starters: [], reserve, taxi, settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 } };
}
function projection(id: string, points: number, sourceValue = points): RosPlayerProjection {
  return { playerId: id, position: 'QB', totalPoints: points, sourceValue, pointsPerWeek: points, projectedWeeks: 1 };
}
function qbFixture(): Map<string, RosPlayerProjection> {
  return new Map(Array.from({ length: 8 }, (_, index) => {
    const id = `qb-${index + 1}`;
    return [id, projection(id, 80 - index * 10, 9_000 - index)] as const;
  }));
}
const slots = { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 };

describe('Max VORP Hub values', () => {
  it('uses the existing calibration rounded bids, scales with initial FAAB, and never sourceValue', () => {
    const projections = qbFixture();
    const calibration500 = buildMaxVorpCalibration(projections, slots, 8, 500)!;
    const calibration1000 = buildMaxVorpCalibration(projections, slots, 8, 1000)!;
    const values500 = buildMaxVorpPlayerValues(projections, calibration500)!;
    const values1000 = buildMaxVorpPlayerValues(projections, calibration1000)!;

    expect(values500.get('qb-1')).toBe(calibration500.playerValues.get('qb-1')?.bid);
    expect(values500.get('qb-1')).not.toBe(projections.get('qb-1')?.sourceValue);
    expect(calibration1000.playerValues.get('qb-1')?.rawBid).toBeCloseTo(
      calibration500.playerValues.get('qb-1')!.rawBid * 2,
    );
    expect(values1000.get('qb-1')).toBe(calibration1000.playerValues.get('qb-1')?.bid);
    expect(values1000.get('qb-1')).toBe(values500.get('qb-1')! * 2);
  });

  it('distinguishes projected replacement-level $0 from a missing projection', () => {
    const projections = qbFixture();
    const calibration = buildMaxVorpCalibration(projections, slots, 8, 500)!;
    const values = buildMaxVorpPlayerValues(projections, calibration)!;

    expect(calibration.playerValues.has('qb-8')).toBe(false);
    expect(values.get('qb-8')).toBe(0);
    expect(values.has('missing')).toBe(false);
    expect(buildMaxVorpPlayerValues(projections, null)).toBeNull();
  });

  it('builds deterministic position ranks from modeled dollars', () => {
    const projections = qbFixture();
    const values = new Map([['qb-2', 10], ['qb-1', 10], ['qb-3', 5]]);
    expect([...buildModeledPositionRanks(values, projections)]).toEqual([
      ['qb-1', 1], ['qb-2', 2], ['qb-3', 3],
    ]);
  });
});

describe('Hub roster Team Value', () => {
  it('deduplicates players, reserve, and taxi while counting a modeled zero as matched', () => {
    const item = roster(1, ['a', 'b', 'a'], ['b', 'c'], ['d', 'c']);
    expect(collectRosterPlayerIds(item)).toEqual(['a', 'b', 'c', 'd']);
    expect(summarizeRosterValue(item, new Map([
      ['a', 3], ['c', 7], ['d', 0],
    ]))).toEqual({ rosterId: 1, total: 10, matched: 3, missing: 1, playerCount: 4 });
  });

  it('ranks active rosters only with deterministic competition ties and a skipped rank', () => {
    const ranked = rankActiveRosterValues(
      [roster(3, ['c']), roster(2, ['b']), roster(4, ['eliminated']), roster(1, ['a'])],
      new Set([1, 2, 3]),
      new Map([['a', 20], ['b', 20], ['c', 10], ['eliminated', 999]]),
    );
    expect([...ranked.keys()]).toEqual([1, 2, 3]);
    expect(ranked.get(1)).toMatchObject({ rank: 1, outOf: 3 });
    expect(ranked.get(2)).toMatchObject({ rank: 1, outOf: 3 });
    expect(ranked.get(3)).toMatchObject({ rank: 3, outOf: 3 });
    expect(ranked.has(4)).toBe(false);
  });

  it('uses the active-team denominator and league high without eliminated totals', () => {
    const activeTieA = roster(1, ['a']);
    const activeTieB = roster(2, ['b']);
    const activeLow = roster(3, ['c']);
    const activeUnavailable = roster(4, ['missing']);
    const eliminated = roster(5, ['huge', 'missing']);
    const rosters = [eliminated, activeUnavailable, activeLow, activeTieB, activeTieA];
    const activeRosterIds = new Set([1, 2, 3, 4]);
    const values = new Map([['a', 20], ['b', 20], ['c', 10], ['huge', 999]]);

    expect(buildSelectedRosterValueDisplay(activeLow, rosters, activeRosterIds, values)).toMatchObject({
      total: 10,
      eliminated: false,
      rank: 3,
      outOf: 4,
      leagueHigh: 20,
    });
    expect(buildSelectedRosterValueDisplay(activeUnavailable, rosters, activeRosterIds, values)).toMatchObject({
      total: null,
      matched: 0,
      missing: 1,
      rank: null,
      outOf: 4,
      leagueHigh: 20,
    });
    expect(buildSelectedRosterValueDisplay(eliminated, rosters, activeRosterIds, values)).toEqual({
      rosterId: 5,
      total: 999,
      matched: 1,
      missing: 1,
      playerCount: 2,
      eliminated: true,
      rank: null,
      outOf: 4,
      leagueHigh: 20,
    });
  });
  it('keeps Teams totals exactly equal to the Hub selected-team display', () => {
    const rosters = [roster(1, ['a', 'b']), roster(2, ['c'])];
    const active = new Set([1, 2]);
    const values = new Map([['a', 40], ['b', 0], ['c', 20]]);
    const teams = rankActiveRosterValues(rosters, active, values);
    const hub = buildSelectedRosterValueDisplay(rosters[0], rosters, active, values);
    expect(teams.get(1)).toMatchObject({ total: hub.total, rank: hub.rank, outOf: hub.outOf });
  });

  it('uses exclusive native positions with deterministic ties, zeros, and no FLEX double count', () => {
    const projections = new Map<string, RosPlayerProjection>([
      ['qb1', { ...projection('qb1', 10), position: 'QB' }],
      ['rb1', { ...projection('rb1', 10), position: 'RB' }],
      ['rb2', { ...projection('rb2', 10), position: 'RB' }],
      ['rb3', { ...projection('rb3', 10), position: 'RB' }],
    ]);
    const values = new Map([['qb1', 12], ['rb1', 8], ['rb2', 8], ['rb3', 0]]);
    const ranked = rankActiveRosterPositionValues(
      [roster(1, ['qb1', 'rb1', 'rb1']), roster(2, ['rb2']), roster(3, ['rb3']), roster(4, ['qb1'])],
      new Set([1, 2, 3]),
      values,
      projections,
    );
    expect(ranked.get(1)).toEqual([
      { position: 'QB', total: 12, rank: 1, outOf: 3 },
      { position: 'RB', total: 8, rank: 1, outOf: 3 },
    ]);
    expect(ranked.get(2)?.find((row) => row.position === 'RB')).toEqual({ position: 'RB', total: 8, rank: 1, outOf: 3 });
    expect(ranked.get(3)?.find((row) => row.position === 'RB')).toEqual({ position: 'RB', total: 0, rank: 3, outOf: 3 });
    expect([...ranked.values()].flat().some((row) => row.position === 'FLEX')).toBe(false);
    expect(ranked.has(4)).toBe(false);
  });

  it('excludes irrelevant global projection positions and preserves league-supported parity', () => {
    const positions = ['C', 'CB', 'DE', 'DT', 'FB', 'NT', 'SS', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'];
    const projections = new Map<string, RosPlayerProjection>(positions.map((position) => [
      position.toLowerCase(),
      { ...projection(position.toLowerCase(), 10), position },
    ]));
    const values = new Map(positions.map((position) => [position.toLowerCase(), 0]));
    values.set('rb', 29);
    values.set('wr', 31);
    values.set('te', 34);
    const ranked = rankActiveRosterPositionValues(
      [roster(1, [...values.keys()]), roster(2, [])],
      new Set([1, 2]),
      values,
      projections,
      buildLeagueValuePositionBuckets(['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN']),
    );
    const selectedRows = ranked.get(1) ?? [];

    expect(selectedRows.map((row) => row.position)).toEqual(['DEF', 'K', 'QB', 'RB', 'TE', 'WR']);
    expect(selectedRows.reduce((sum, row) => sum + row.total, 0)).toBe(94);
    expect(selectedRows.some((row) => ['C', 'CB', 'DE', 'DT', 'FB', 'NT', 'SS', 'DL', 'LB', 'DB', 'FLEX'].includes(row.position))).toBe(false);
  });

  it('maps broad IDP lineup slots without counting native defenders twice', () => {
    const buckets = buildLeagueValuePositionBuckets(['DL', 'LB', 'DB', 'IDP_FLEX', 'BN']);
    expect(buckets.get('DE')).toBe('DL');
    expect(buckets.get('DT')).toBe('DL');
    expect(buckets.get('CB')).toBe('DB');
    expect(buckets.get('SS')).toBe('DB');
    expect(buckets.get('LB')).toBe('LB');
    expect(buckets.has('WR')).toBe(false);
  });

});
