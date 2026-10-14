import { describe, expect, it } from 'vitest';
import type { Roster } from '../api/types';
import type { RosPlayerProjection, WeeklyScoredPlayer } from './projections';
import type { WaiverPlayerRow } from './waivers';
import {
  buildWeeklyBidPlan,
  safeCutDistanceMultiplier,
  type WeeklyBidPlanInput,
} from './weeklyBidPlan';

const roster = (rosterId: number, players: string[], used = 0): Roster => ({
  roster_id: rosterId,
  owner_id: `u-${rosterId}`,
  players,
  starters: [],
  settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: used },
});
const weekly = (id: string, position: string, points: number): WeeklyScoredPlayer => ({
  playerId: id, position, points,
});
const ros = (id: string, position: string, totalPoints: number): RosPlayerProjection => ({
  playerId: id, position, totalPoints, projectedWeeks: 10, pointsPerWeek: totalPoints / 10,
});
const target = (id: string, position: string, safe: number, aggressive: number): WaiverPlayerRow => ({
  playerId: id, name: id, position, posRank: 1, rosPoints: 100,
  projectedPointsPerWeek: 10, sourceValue: 100, starterWeeks: 5, possibleStarterWeeks: 5,
  suggestions: [
    { strategy: 'safe', label: 'Safe', value: safe, pctOfBudget: null },
    { strategy: 'aggressive', label: 'Aggressive', value: aggressive, pctOfBudget: null },
  ],
  predictedWinningBid: 0,
});

type MutableInput = Omit<WeeklyBidPlanInput, 'rosters' | 'weeklyProjections' | 'rosProjections'> & {
  rosters: Roster[];
  weeklyProjections: Map<string, WeeklyScoredPlayer>;
  rosProjections: Map<string, RosPlayerProjection>;
};

function base(overrides: Partial<WeeklyBidPlanInput> = {}): MutableInput {
  const weekPlayers = [
    weekly('drop-a', 'RB', 4), weekly('drop-b', 'WR', 5), weekly('drop-c', 'TE', 6),
    weekly('drop-d', 'RB', 7), weekly('drop-e', 'WR', 8), weekly('drop-f', 'QB', 9),
    weekly('target-a', 'RB', 20), weekly('target-b', 'WR', 18), weekly('target-c', 'TE', 17),
    weekly('target-d', 'RB', 16), weekly('target-e', 'WR', 15), weekly('target-f', 'QB', 14),
    weekly('other-1', 'QB', 30), weekly('other-2', 'QB', 25),
    weekly('def-old', 'DEF', 3), weekly('def-new', 'DEF', 7),
    weekly('k-old', 'K', 5), weekly('k-new', 'K', 6),
  ];
  const rosPlayers = [
    ros('drop-a', 'RB', 10), ros('drop-b', 'WR', 20), ros('drop-c', 'TE', 30),
    ros('drop-d', 'RB', 40), ros('drop-e', 'WR', 50), ros('drop-f', 'QB', 60),
    ros('target-a', 'RB', 120), ros('target-b', 'WR', 110), ros('target-c', 'TE', 105),
    ros('target-d', 'RB', 100), ros('target-e', 'WR', 95), ros('target-f', 'QB', 90),
    ros('other-1', 'QB', 150), ros('other-2', 'QB', 140),
    ros('def-old', 'DEF', 30), ros('def-new', 'DEF', 35),
    ros('k-old', 'K', 40), ros('k-new', 'K', 42),
  ];
  return {
    selectedRosterId: 1,
    rosters: [
      roster(1, ['drop-a', 'drop-b', 'drop-c', 'drop-d', 'drop-e', 'drop-f', 'def-old', 'k-old']),
      roster(2, ['other-1'], 30),
      roster(3, ['other-2'], 60),
    ],
    activeRosterIds: new Set([1, 2, 3]),
    lineupPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX'],
    weeklyProjections: new Map(weekPlayers.map((item) => [item.playerId, item])),
    rosProjections: new Map(rosPlayers.map((item) => [item.playerId, item])),
    availableRows: [
      target('target-a', 'RB', 20, 100), target('target-b', 'WR', 15, 80),
      target('target-c', 'TE', 14, 70), target('target-d', 'RB', 13, 65),
      target('target-e', 'WR', 12, 60), target('target-f', 'QB', 11, 55),
    ],
    availablePlayerIds: ['target-a', 'target-b', 'target-c', 'target-d', 'target-e', 'target-f', 'def-new', 'k-new'],
    initialBudget: 100,
    eliminationsPerWeek: 1,
    ...overrides,
  } as MutableInput;
}

describe('weekly team bid planning', () => {
  it('requires a target to beat a drop both this week and ROS and protects low-week ROS stars', () => {
    const input = base();
    input.weeklyProjections.set('injured-star', weekly('injured-star', 'RB', 0));
    input.rosProjections.set('injured-star', ros('injured-star', 'RB', 500));
    input.rosters[0] = roster(1, ['injured-star', 'drop-a', 'drop-b']);
    const plan = buildWeeklyBidPlan(input)!;
    expect(plan.rows.some((row) => row.dropPlayerId === 'injured-star')).toBe(false);

    input.rosProjections.set('target-a', ros('target-a', 'RB', 5));
    const withoutRosImprovement = buildWeeklyBidPlan(input)!;
    expect(withoutRosImprovement.rows.flatMap((row) => row.recommendations)
      .some((rec) => rec.target.playerId === 'target-a')).toBe(false);
  });

  it('rejects raw cross-position upgrades that do not improve the optimized lineup and reports lineup gain', () => {
    const weeklyPlayers = [
      weekly('qb-starter', 'QB', 30), weekly('rb-starter', 'RB', 10),
      weekly('bench-wr', 'WR', 1), weekly('target-qb', 'QB', 20),
      weekly('target-rb', 'RB', 12), weekly('other-qb', 'QB', 25),
    ];
    const rosPlayers = [
      ros('qb-starter', 'QB', 150), ros('rb-starter', 'RB', 20),
      ros('bench-wr', 'WR', 5), ros('target-qb', 'QB', 100),
      ros('target-rb', 'RB', 90), ros('other-qb', 'QB', 120),
    ];
    const plan = buildWeeklyBidPlan(base({
      rosters: [roster(1, ['qb-starter', 'rb-starter', 'bench-wr']), roster(2, ['other-qb'])],
      activeRosterIds: new Set([1, 2]),
      lineupPositions: ['QB', 'RB'],
      weeklyProjections: new Map(weeklyPlayers.map((player) => [player.playerId, player])),
      rosProjections: new Map(rosPlayers.map((player) => [player.playerId, player])),
      availableRows: [target('target-qb', 'QB', 10, 20), target('target-rb', 'RB', 10, 20)],
      availablePlayerIds: ['target-qb', 'target-rb'],
      maxPositionDrops: 1,
    }))!;

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].dropPlayerId).toBe('bench-wr');
    expect(plan.rows[0].recommendations.map((rec) => rec.target.playerId)).toEqual(['target-rb']);
    expect(plan.rows[0].recommendations[0].weeklyGain).toBe(2);
  });

  it('orders weakest qualifying holds first and caps position drops at five', () => {
    const plan = buildWeeklyBidPlan(base())!;
    const positionRows = plan.rows.filter((row) => row.kind === 'position');
    expect(positionRows).toHaveLength(5);
    expect(positionRows.map((row) => row.dropPlayerId)).toEqual([
      'drop-a', 'drop-b', 'drop-c', 'drop-d', 'drop-e',
    ]);
  });

  it('applies sequential assumed wins, subtracts the visible bid, and reclassifies', () => {
    const plan = buildWeeklyBidPlan(base({ maxPositionDrops: 2 }))!;
    const rows = plan.rows.filter((row) => row.kind === 'position');
    expect(rows).toHaveLength(2);
    expect(rows[1].scenarioBudgetBefore).toBe(
      rows[0].scenarioBudgetBefore - rows[0].recommendations[0].suggestedBid,
    );
    expect(rows[1].recommendations[0].beforeRisk).toBe(rows[0].recommendations[0].afterRisk);
    expect(rows[1].recommendations.every((rec) => rec.target.playerId !== rows[0].recommendations[0].target.playerId)).toBe(true);
  });

  it('caps at actual scenario budget, preserves qualifying $0 recommendations, and caps by richest active opponent + $1', () => {
    const unspentRoster = roster(1, ['drop-a']);
    delete (unspentRoster.settings as Partial<Roster['settings']>).waiver_budget_used;
    const unspentPlan = buildWeeklyBidPlan(base({
      rosters: [unspentRoster, roster(2, ['other-1'], 50)],
      activeRosterIds: new Set([1, 2]),
      maxPositionDrops: 1,
    }))!;
    expect(unspentPlan.initialBudgetRemaining).toBe(100);

    const zeroPlan = buildWeeklyBidPlan(base({
      rosters: [roster(1, ['drop-a'], 100), roster(2, ['other-1'], 20)],
      activeRosterIds: new Set([1, 2]),
      maxPositionDrops: 1,
    }))!;
    expect(zeroPlan.rows[0].recommendations.length).toBeGreaterThan(0);
    expect(zeroPlan.rows[0].recommendations.every((rec) => rec.suggestedBid === 0)).toBe(true);

    const opponentPlan = buildWeeklyBidPlan(base({
      rosters: [roster(1, ['drop-a']), roster(2, ['other-1'], 70), roster(3, ['other-2'], 10)],
      activeRosterIds: new Set([1, 2]),
      maxPositionDrops: 1,
    }))!;
    expect(opponentPlan.richestOtherActiveBudget).toBe(30);
    expect(Math.max(...opponentPlan.rows[0].recommendations.map((rec) => rec.suggestedBid))).toBeLessThanOrEqual(31);
  });

  it('applies approved Safe cut bands to passed Safe output with a 0.5 floor', () => {
    expect(safeCutDistanceMultiplier(8, 12, 1)).toBe(1);
    expect(safeCutDistanceMultiplier(7, 12, 1)).toBe(0.9);
    expect(safeCutDistanceMultiplier(0, 20, 1)).toBe(0.5);
  });

  it('adds at most one improving same-position $0 DEF and K replacement', () => {
    const plan = buildWeeklyBidPlan(base({ maxPositionDrops: 0 }))!;
    const streamers = plan.rows.filter((row) => row.kind === 'streamer');
    expect(streamers.map((row) => row.dropPosition)).toEqual(['DEF', 'K']);
    expect(streamers.every((row) => row.recommendations.length === 1
      && row.recommendations[0].suggestedBid === 0)).toBe(true);
  });
});
