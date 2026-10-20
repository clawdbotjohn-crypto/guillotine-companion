import { describe, expect, it } from 'vitest';
import type { Roster } from '../api/types';
import type { RosPlayerProjection, WeeklyScoredPlayer } from './projections';
import type { WaiverPlayerRow } from './waivers';
import {
  buildStablePositionDropQueue,
  buildWeeklyBidPlan,
  classifyWeeklyLineupGain,
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

function pricingInput(
  selectedPoints: number,
  opponentPoints: number[],
  gains: Array<[string, number]>,
): MutableInput {
  const selected = weekly('drop', 'QB', selectedPoints);
  const targets = gains.map(([id, gain]) => weekly(id, 'QB', selectedPoints + gain));
  const opponents = opponentPoints.map((points, index) => weekly(`opp-${index}`, 'QB', points));
  const weeklyPlayers = [selected, ...targets, ...opponents];
  const rosPlayers = [
    ros('drop', 'QB', 10),
    ...gains.map(([id], index) => ros(id, 'QB', 100 - index)),
    ...opponentPoints.map((_, index) => ros(`opp-${index}`, 'QB', 50)),
  ];
  const rosters = [
    roster(1, ['drop']),
    ...opponentPoints.map((_, index) => roster(index + 2, [`opp-${index}`])),
  ];
  return base({
    rosters,
    activeRosterIds: new Set(rosters.map((item) => item.roster_id)),
    lineupPositions: ['QB'],
    weeklyProjections: new Map(weeklyPlayers.map((player) => [player.playerId, player])),
    rosProjections: new Map(rosPlayers.map((player) => [player.playerId, player])),
    availableRows: gains.map(([id]) => target(id, 'QB', 20, 40)),
    availablePlayerIds: gains.map(([id]) => id),
    maxPositionDrops: 1,
  });
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

  it('keeps no-harm positive-ROS bench upgrades but rejects lineup harm', () => {
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
    expect(plan.rows[0].recommendations.map((rec) => rec.target.playerId)).toEqual([
      'target-rb', 'target-qb',
    ]);
    expect(plan.rows[0].recommendations.map((rec) => rec.weeklyGain)).toEqual([2, 0]);
    expect(plan.rows[0].recommendations[1].theoreticalBid).toBeLessThanOrEqual(10);

    const harmedWeekly = [
      weekly('qb-starter', 'QB', 30), weekly('rb-starter', 'RB', 40),
      weekly('target-rb', 'RB', 31), weekly('other-qb', 'QB', 25),
    ];
    const harmedRos = [
      ros('qb-starter', 'QB', 150), ros('rb-starter', 'RB', 300),
      ros('target-rb', 'RB', 200), ros('other-qb', 'QB', 120),
    ];
    const harmed = buildWeeklyBidPlan(base({
      rosters: [roster(1, ['qb-starter', 'rb-starter']), roster(2, ['other-qb'])],
      activeRosterIds: new Set([1, 2]),
      lineupPositions: ['QB', 'RB'],
      weeklyProjections: new Map(harmedWeekly.map((player) => [player.playerId, player])),
      rosProjections: new Map(harmedRos.map((player) => [player.playerId, player])),
      availableRows: [target('target-rb', 'RB', 10, 20)],
      availablePlayerIds: ['target-rb'],
      maxPositionDrops: 1,
    }))!;
    expect(harmed.rows).toHaveLength(0);
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

  it('builds one stable original-roster raw-VORP queue and protects high-ROS injury/bye stars', () => {
    const input = base({
      rosters: [
        roster(1, ['scarce-qb', 'low-ros-rb', 'injured-star']),
        roster(2, ['other-1']),
      ],
      activeRosterIds: new Set([1, 2]),
      lineupPositions: ['QB', 'RB', 'WR'],
      weeklyProjections: new Map([
        weekly('scarce-qb', 'QB', 1), weekly('low-ros-rb', 'RB', 2),
        weekly('injured-star', 'WR', 0), weekly('qb-upgrade', 'QB', 30),
        weekly('rb-upgrade', 'RB', 20), weekly('other-1', 'QB', 25),
      ].map((player) => [player.playerId, player])),
      rosProjections: new Map([
        ros('scarce-qb', 'QB', 40), ros('low-ros-rb', 'RB', 10),
        ros('injured-star', 'WR', 500), ros('qb-upgrade', 'QB', 200),
        ros('rb-upgrade', 'RB', 150), ros('other-1', 'QB', 100),
      ].map((player) => [player.playerId, player])),
      availableRows: [
        target('qb-upgrade', 'QB', 10, 20), target('rb-upgrade', 'RB', 10, 20),
      ],
      availablePlayerIds: ['qb-upgrade', 'rb-upgrade'],
      valueByPlayerId: new Map([
        ['scarce-qb', 40], ['low-ros-rb', 10], ['injured-star', 500],
      ]),
      replacementByPosition: new Map([['QB', 100], ['RB', 0], ['WR', 0]]),
      maxPositionDrops: 3,
    });

    const queue = buildStablePositionDropQueue(input, input.rosters[0].players ?? []);
    expect(queue.map(({ playerId, internalVorp }) => [playerId, internalVorp])).toEqual([
      ['scarce-qb', -60], ['low-ros-rb', 10], ['injured-star', 500],
    ]);
    const partialCalibrationQueue = buildStablePositionDropQueue({
      ...input,
      valueByPlayerId: new Map([['scarce-qb', 40], ['injured-star', 500]]),
    }, input.rosters[0].players ?? []);
    expect(partialCalibrationQueue.map(({ playerId, internalVorp }) => [playerId, internalVorp])).toEqual([
      ['low-ros-rb', 10], ['scarce-qb', 40], ['injured-star', 500],
    ]);
    const plan = buildWeeklyBidPlan(input)!;
    const drops = plan.rows.filter((row) => row.kind === 'position').map((row) => row.dropPlayerId);
    expect(drops).toEqual(['scarce-qb', 'low-ros-rb']);
    expect(drops).not.toContain('injured-star');
    expect(drops).not.toContain('qb-upgrade');
  });

  it('prices exact 10/3 boundaries from the current class and gives same-band highs the same rung', () => {
    expect(classifyWeeklyLineupGain(10)).toBe('high');
    expect(classifyWeeklyLineupGain(9.999)).toBe('mid');
    expect(classifyWeeklyLineupGain(3)).toBe('mid');
    expect(classifyWeeklyLineupGain(2.999)).toBe('low');

    const cases = [
      { input: pricingInput(0, [30, 25, 20, 15], [['high-12', 12], ['high-10', 10], ['mid-3', 3], ['low-2', 2]]), risk: 'at-risk', bids: [60, 60, 40, 20] },
      { input: pricingInput(10, [30, 25, 20, 5], [['high-12', 12], ['high-10', 10], ['mid-3', 3], ['low-2', 2]]), risk: 'warning', bids: [40, 40, 20, 10] },
      { input: pricingInput(30, [25, 20, 15, 10], [['high-12', 12], ['high-10', 10], ['mid-3', 3], ['low-2', 2]]), risk: 'safe', bids: [20, 20, 10, 10] },
    ] as const;

    for (const item of cases) {
      const recommendations = buildWeeklyBidPlan(item.input)!.rows[0].recommendations;
      expect(recommendations[0].beforeRisk).toBe(item.risk);
      expect(recommendations.map(({ theoreticalBid }) => theoreticalBid)).toEqual(item.bids);
    }
  });

  it('uses the current class for merit, then the top-impact win class for the next round', () => {
    const weekPlayers = [
      weekly('drop-a', 'QB', 0), weekly('drop-b', 'RB', 0),
      weekly('escape', 'QB', 50), weekly('next-rb', 'RB', 15),
      weekly('opp-1', 'QB', 30), weekly('opp-2', 'QB', 25),
      weekly('opp-3', 'QB', 20), weekly('opp-4', 'QB', 15),
    ];
    const rosPlayers = [
      ros('drop-a', 'QB', 1), ros('drop-b', 'RB', 2),
      ros('escape', 'QB', 200), ros('next-rb', 'RB', 150),
      ros('opp-1', 'QB', 100), ros('opp-2', 'QB', 100),
      ros('opp-3', 'QB', 100), ros('opp-4', 'QB', 100),
    ];
    const plan = buildWeeklyBidPlan(base({
      rosters: [
        roster(1, ['drop-a', 'drop-b']), roster(2, ['opp-1']), roster(3, ['opp-2']),
        roster(4, ['opp-3']), roster(5, ['opp-4']),
      ],
      activeRosterIds: new Set([1, 2, 3, 4, 5]),
      lineupPositions: ['QB', 'RB'],
      weeklyProjections: new Map(weekPlayers.map((player) => [player.playerId, player])),
      rosProjections: new Map(rosPlayers.map((player) => [player.playerId, player])),
      availableRows: [target('escape', 'QB', 20, 40), target('next-rb', 'RB', 20, 40)],
      availablePlayerIds: ['escape', 'next-rb'],
      maxPositionDrops: 2,
    }))!;
    const rows = plan.rows.filter((row) => row.kind === 'position');
    expect(rows).toHaveLength(2);
    expect(rows[0].recommendations[0]).toMatchObject({
      beforeRisk: 'at-risk', afterRisk: 'safe', theoreticalBid: 60,
    });
    expect(rows[1].recommendations[0].beforeRisk).toBe('safe');
    expect(rows[1].recommendations[0].theoreticalBid).toBe(20);
  });

  it('limits groups to five, keeps row and repeated-target bids monotonic, and reserves each prior row maximum', () => {
    const plan = buildWeeklyBidPlan(base({ maxPositionDrops: 3 }))!;
    const rows = plan.rows.filter((row) => row.kind === 'position');
    expect(rows[0].recommendations).toHaveLength(5);

    const earliest = new Map<string, number>();
    let repeatedTargets = 0;
    let expectedBudget = plan.initialBudgetRemaining;
    for (const row of rows) {
      expect(row.scenarioBudgetBefore).toBe(expectedBudget);
      const bids = row.recommendations.map((rec) => rec.suggestedBid);
      expect(bids).toEqual([...bids].sort((a, b) => b - a));
      for (const recommendation of row.recommendations) {
        const first = earliest.get(recommendation.target.playerId);
        if (first != null) {
          repeatedTargets++;
          expect(recommendation.suggestedBid).toBeLessThanOrEqual(first);
        } else earliest.set(recommendation.target.playerId, recommendation.suggestedBid);
      }
      expectedBudget = Math.max(0, expectedBudget - Math.max(0, ...bids));
    }
    expect(repeatedTargets).toBeGreaterThan(0);
  });

  it('adds at most one improving same-position $0 DEF and K replacement', () => {
    const plan = buildWeeklyBidPlan(base({ maxPositionDrops: 0 }))!;
    const streamers = plan.rows.filter((row) => row.kind === 'streamer');
    expect(streamers.map((row) => row.dropPosition)).toEqual(['DEF', 'K']);
    expect(streamers.every((row) => row.recommendations.length === 1
      && row.recommendations[0].suggestedBid === 0)).toBe(true);
  });
});
