import { describe, expect, it } from 'vitest';
import type { League, Roster } from '../../api/types';
import type { EliminationResult } from '../elimination';
import type { RosPlayerProjection } from '../projections';
import {
  buildOptimizedStarterPool,
  buildVorpCalibration,
  buildLeagueContext,
  buildWaiverBoard,
  calculateCalibratedVorpBid,
  calculateDollarsPerVorp,
  calculatePlayerVorp,
  calculateRemainingFaab,
  computeReplacementBaselines,
  getReplacementTeamBounds,
  normalizeReplacementTeamTarget,
  predictedBidMultiplier,
  sortWaiverRowsByStrategy,
  type LeagueContext,
  type StrategyKey,
} from '../waivers';

const context: LeagueContext = {
  budget: 1000,
  teamsRemaining: 12,
  weeksRemaining: 10,
  currentWeek: 4,
  startersPerPos: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 0 },
};

function projection(
  playerId: string,
  position: string,
  pointsPerWeek: number,
  projectedWeeks = 10,
): RosPlayerProjection {
  return {
    playerId,
    position,
    totalPoints: pointsPerWeek * projectedWeeks,
    pointsPerWeek,
    projectedWeeks,
  };
}

function addPositionPlayers(
  map: Map<string, RosPlayerProjection>,
  position: string,
  count: number,
  startPoints = 1000,
): void {
  for (let rank = 1; rank <= count; rank++) {
    const id = `${position.toLowerCase()}-${String(rank).padStart(2, '0')}`;
    map.set(id, projection(id, position, startPoints - rank, 1));
  }
}

function suggestionValue(
  rows: ReturnType<typeof buildWaiverBoard>,
  strategy: StrategyKey,
): number | null {
  return rows[0].suggestions.find((suggestion) => suggestion.strategy === strategy)!.value;
}

describe('calculateRemainingFaab', () => {
  it('subtracts the selected roster waiver spend from the league budget', () => {
    const roster: Roster = {
      roster_id: 7,
      owner_id: 'owner-7',
      players: [],
      starters: [],
      settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 725 },
    };

    expect(calculateRemainingFaab(1000, roster)).toBe(275);
    expect(calculateRemainingFaab(500, roster)).toBe(0);
    expect(calculateRemainingFaab(1000, undefined)).toBeNull();
  });
});

describe('buildLeagueContext', () => {
  it('uses the post-elimination active count instead of the teams that entered the week', () => {
    const league: League = {
      league_id: 'league-30',
      name: 'Thirty Team Guillotine',
      total_rosters: 30,
      settings: { waiver_budget: 500 },
      scoring_settings: { rec: 1 },
      season: '2026',
      season_type: 'regular',
      status: 'in_season',
      draft_id: 'draft-30',
      previous_league_id: null,
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
    };
    const elimination: EliminationResult = {
      weeks: [],
      teams: new Map(),
      activeTeamCount: 28,
      champion: null,
      runnerUp: null,
      isComplete: false,
      currentWeek: 1,
    };

    const result = buildLeagueContext(league, elimination, 2);

    expect(result.teamsRemaining).toBe(28);
    expect(result.budget).toBe(500);
  });
});

describe('championship-calibrated VoRP helpers', () => {
  it('fills base 1QB/2RB/2WR/1TE slots and one shared FLEX pool without triple counting', () => {
    const projections = new Map<string, RosPlayerProjection>();
    addPositionPlayers(projections, 'QB', 8, 800);
    addPositionPlayers(projections, 'RB', 14, 700);
    addPositionPlayers(projections, 'WR', 14, 600);
    addPositionPlayers(projections, 'TE', 8, 500);

    const pool = buildOptimizedStarterPool(
      projections,
      { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 0 },
      4,
    );

    expect(pool.complete).toBe(true);
    expect(pool.requiredSlots).toBe(28);
    expect(pool.players).toHaveLength(28);
    expect(new Set(pool.players.map((player) => player.playerId)).size).toBe(28);
    expect(pool.players.filter((player) => player.position === 'RB')).toHaveLength(12);
    expect(pool.players.filter((player) => player.position === 'WR')).toHaveLength(8);
    expect(pool.players.filter((player) => player.position === 'TE')).toHaveLength(4);
  });

  it('fills SUPER_FLEX from one shared remaining QB/RB/WR/TE pool without double counting', () => {
    const projections = new Map<string, RosPlayerProjection>();
    addPositionPlayers(projections, 'QB', 10, 1000);
    addPositionPlayers(projections, 'RB', 10, 800);
    addPositionPlayers(projections, 'WR', 10, 700);
    addPositionPlayers(projections, 'TE', 10, 600);

    const pool = buildOptimizedStarterPool(
      projections,
      { QB: 1, RB: 1, WR: 1, TE: 1, FLEX: 0, SUPER_FLEX: 1 },
      4,
    );

    expect(pool.complete).toBe(true);
    expect(pool.players).toHaveLength(20);
    expect(new Set(pool.players.map((player) => player.playerId)).size).toBe(20);
    expect(pool.players.filter((player) => player.position === 'QB')).toHaveLength(8);
  });

  it('uses the last selected starter as replacement (QB28), not the first excluded player', () => {
    const projections = new Map<string, RosPlayerProjection>();
    for (let rank = 1; rank <= 30; rank++) {
      const id = `qb-${String(rank).padStart(2, '0')}`;
      projections.set(id, projection(id, 'QB', 31 - rank, 1));
    }
    const pool = buildOptimizedStarterPool(
      projections,
      { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 },
      28,
    );
    const replacement = computeReplacementBaselines(pool);

    expect(replacement.get('QB')).toBe(3);
    expect(calculatePlayerVorp(projections.get('qb-01'), replacement)).toBe(27);
    expect(pool.players.some((player) => player.playerId === 'qb-29')).toBe(false);
  });

  it('changes replacement depth and player VoRP when the target-team count changes', () => {
    const projections = new Map<string, RosPlayerProjection>();
    addPositionPlayers(projections, 'QB', 12, 101);
    const slots = { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 };
    const fourTeamBaseline = computeReplacementBaselines(buildOptimizedStarterPool(projections, slots, 4));
    const eightTeamBaseline = computeReplacementBaselines(buildOptimizedStarterPool(projections, slots, 8));

    expect(fourTeamBaseline.get('QB')).toBe(97);
    expect(eightTeamBaseline.get('QB')).toBe(93);
    expect(calculatePlayerVorp(projections.get('qb-01'), fourTeamBaseline)).toBe(3);
    expect(calculatePlayerVorp(projections.get('qb-01'), eightTeamBaseline)).toBe(7);
  });

  it('normalizes replacement target defaults, min, max, and fewer than four survivors', () => {
    expect(getReplacementTeamBounds(28)).toEqual({ min: 4, max: 28, defaultValue: 28 });
    expect(normalizeReplacementTeamTarget(undefined, 28)).toBe(28);
    expect(normalizeReplacementTeamTarget(16, 28)).toBe(16);
    expect(normalizeReplacementTeamTarget(2, 28)).toBe(4);
    expect(normalizeReplacementTeamTarget(40, 28)).toBe(28);
    expect(getReplacementTeamBounds(2)).toEqual({ min: 4, max: 4, defaultValue: 4 });
    expect(normalizeReplacementTeamTarget(2, 2)).toBe(4);
  });

  it('builds the final-four pool and calibrates average championship-team VoRP', () => {
    const projections = new Map<string, RosPlayerProjection>();
    for (let rank = 1; rank <= 8; rank++) {
      const id = `qb-${rank}`;
      projections.set(id, projection(id, 'QB', 900 - rank * 100, 1));
    }
    const calibration = buildVorpCalibration(
      projections,
      { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 },
      8,
      500,
    );

    expect(calibration).not.toBeNull();
    expect(calibration!.championshipPool.players.map((player) => player.playerId))
      .toEqual(['qb-1', 'qb-2', 'qb-3', 'qb-4']);
    expect(calibration!.replacementByPosition.get('QB')).toBe(100);
    expect(calibration!.totalChampionshipVorp).toBe(2200);
    expect(calibration!.averageChampionshipTeamVorp).toBe(550);
    expect(calibration!.dollarsPerVorp).toBeCloseTo(500 / 550);
  });

  it('uses the exact budget / championship VoRP dollar ratio', () => {
    expect(calculateDollarsPerVorp(500, 900)).toBeCloseTo(500 / 900);
    expect(calculateCalibratedVorpBid(90, 500, 900)).toBe(50);
    expect(calculateDollarsPerVorp(500, 0)).toBeNull();
    expect(calculateCalibratedVorpBid(90, 500, Number.NaN)).toBeNull();
  });

  it('keeps external display values from contaminating independently supplied Sleeper VoRP', () => {
    const ctx: LeagueContext = {
      ...context,
      teamsRemaining: 4,
      startersPerPos: { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 },
    };
    const sleeper = new Map<string, RosPlayerProjection>();
    addPositionPlayers(sleeper, 'QB', 6, 101);
    const displayA = new Map([
      ['qb-01', projection('qb-01', 'QB', 30)],
      ['qb-02', projection('qb-02', 'QB', 10)],
    ]);
    const displayB = new Map([
      ['qb-01', projection('qb-01', 'QB', 1)],
      ['qb-02', projection('qb-02', 'QB', 29)],
    ]);
    const options = { sleeperRosProjections: sleeper, replacementTeamCount: 4 };
    const rowsA = buildWaiverBoard(['qb-01', 'qb-02'], displayA, ctx, [], (id) => id, options);
    const rowsB = buildWaiverBoard(['qb-01', 'qb-02'], displayB, ctx, [], (id) => id, options);
    const vorpById = (rows: ReturnType<typeof buildWaiverBoard>) => Object.fromEntries(
      rows.map((row) => [row.playerId, row.suggestions.find((item) => item.strategy === 'vorp')?.value]),
    );

    expect(vorpById(rowsA)).toEqual(vorpById(rowsB));
    expect(rowsA.find((row) => row.playerId === 'qb-01')?.posRank).toBe(1);
    expect(rowsB.find((row) => row.playerId === 'qb-01')?.posRank).toBe(2);
  });
});

describe('buildWaiverBoard', () => {
  it('ranks and values an available QB against all 21 higher Sleeper ROS projections', () => {
    const projections = new Map<string, RosPlayerProjection>();
    for (let rank = 1; rank <= 21; rank++) {
      const id = `rostered-qb-${String(rank).padStart(2, '0')}`;
      projections.set(id, projection(id, 'QB', 40 - rank));
    }
    projections.set('available-qb', projection('available-qb', 'QB', 10));

    const rows = buildWaiverBoard(
      ['available-qb'],
      projections,
      context,
      [],
      (id) => id,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].posRank).toBe(22);
    // Safe has no artificial rank floor, so a QB this far below the starter pool is worth $0.
    expect(suggestionValue(rows, 'safe')).toBe(0);
    expect(suggestionValue(rows, 'aggressive')).toBe(0);
    expect(suggestionValue(rows, 'weeks-starter')).toBe(0);
    expect(rows[0].starterWeeks).toBe(0);
    // Season timing must not assign a large position-wide prediction to this deep QB.
    expect(rows[0].predictedWinningBid).toBe(0);
  });

  it('makes Aggressive exactly equal each player-sensitive predicted winning bid across weeks', () => {
    const projections = new Map([
      ['qb-1-available', projection('qb-1-available', 'QB', 30)],
      ['qb-2', projection('qb-2', 'QB', 20)],
      ['qb-3-available', projection('qb-3-available', 'QB', 10)],
    ]);

    for (const currentWeek of [1, 6, 14, 17]) {
      const rows = buildWaiverBoard(
        ['qb-1-available', 'qb-3-available'],
        projections,
        { ...context, currentWeek },
        [],
        (id) => id,
      );
      for (const row of rows) {
        const aggressive = row.suggestions.find((item) => item.strategy === 'aggressive')!.value;
        expect(aggressive).toBe(row.predictedWinningBid);
      }
    }
  });

  it('uses continuous season interpolation for Aggressive instead of the old step thresholds', () => {
    const projections = new Map([
      ['qb-1-available', projection('qb-1-available', 'QB', 30)],
      ['qb-2', projection('qb-2', 'QB', 20)],
    ]);
    const rows = buildWaiverBoard(
      ['qb-1-available'],
      projections,
      { ...context, currentWeek: 6 },
      [],
      (id) => id,
    );
    const weeksAsStarter = suggestionValue(rows, 'weeks-starter')!;
    const expected = Math.round(weeksAsStarter * (2 * (17 - 6) / 16));

    expect(suggestionValue(rows, 'aggressive')).toBe(expected);
    expect(rows[0].predictedWinningBid).toBe(expected);
    expect(suggestionValue(rows, 'aggressive')).not.toBe(context.budget / 2);
  });

  it('sorts Aggressive by the same player-sensitive predicted winning bids', () => {
    const projections = new Map([
      ['qb-1-available', projection('qb-1-available', 'QB', 30)],
      ['qb-2', projection('qb-2', 'QB', 20)],
      ['qb-3-available', projection('qb-3-available', 'QB', 10)],
    ]);
    const rows = buildWaiverBoard(
      ['qb-1-available', 'qb-3-available'],
      projections,
      { ...context, currentWeek: 6 },
      [],
      (id) => id,
    );

    const sorted = sortWaiverRowsByStrategy([...rows].reverse(), 'aggressive');
    expect(sorted.map((row) => row.playerId)).toEqual(['qb-1-available', 'qb-3-available']);
    expect(sorted.map((row) => suggestionValue([row], 'aggressive')))
      .toEqual(sorted.map((row) => row.predictedWinningBid));
    expect(sorted[0].predictedWinningBid).toBeGreaterThan(sorted[1].predictedWinningBid);
  });

  it('values the top positional player as a starter for every remaining week', () => {
    const championshipContext: LeagueContext = {
      ...context,
      teamsRemaining: 12,
      weeksRemaining: 11,
    };
    const projections = new Map([
      ['qb-1-available', projection('qb-1-available', 'QB', 30, 11)],
      ['qb-2', projection('qb-2', 'QB', 25, 11)],
    ]);

    const rows = buildWaiverBoard(
      ['qb-1-available'],
      projections,
      championshipContext,
      [],
      (id) => id,
    );

    expect(rows[0].posRank).toBe(1);
    expect(rows[0].starterWeeks).toBe(11);
    expect(rows[0].possibleStarterWeeks).toBe(11);
    expect(suggestionValue(rows, 'weeks-starter')).toBe(suggestionValue(rows, 'safe'));
  });

  it('sorts rows by the selected strategy rather than always using Safe', () => {
    const projections = new Map<string, RosPlayerProjection>();
    for (let rank = 1; rank <= 24; rank++) {
      const id = `rb-${rank}`;
      projections.set(id, projection(id, 'RB', 40 - rank));
    }
    projections.set('rb-25-available', projection('rb-25-available', 'RB', 15));
    projections.set('te-1-available', projection('te-1-available', 'TE', 30));

    const rows = buildWaiverBoard(
      ['rb-25-available', 'te-1-available'],
      projections,
      context,
      [],
      (id) => id,
    );
    expect(rows[0].playerId).toBe('te-1-available'); // Weeks-as-Starter is the default order
    expect(rows[0].suggestions[0].strategy).toBe('weeks-starter');

    const weeksSorted = sortWaiverRowsByStrategy(rows, 'weeks-starter');
    expect(weeksSorted[0].playerId).toBe('te-1-available');
    expect(suggestionValue([weeksSorted[0]], 'weeks-starter')!)
      .toBeGreaterThan(suggestionValue([weeksSorted[1]], 'weeks-starter')!);
  });

  it('uses the requested season-remaining multiplier anchors', () => {
    expect(predictedBidMultiplier(1)).toBeCloseTo(2);
    expect(predictedBidMultiplier(9)).toBeCloseTo(1);
    expect(predictedBidMultiplier(13)).toBeCloseTo(0.5);
    expect(predictedBidMultiplier(15)).toBeCloseTo(0.25);
    expect(predictedBidMultiplier(17)).toBeCloseTo(0);
  });

  it('scales predicted winning bids by Weeks-as-Starter instead of one flat position bid', () => {
    const projections = new Map<string, RosPlayerProjection>();
    for (let rank = 1; rank <= 8; rank++) {
      const id = `market-qb-${rank}`;
      projections.set(id, projection(id, 'QB', 31 - rank));
    }
    const rows = buildWaiverBoard(
      ['market-qb-1', 'market-qb-8'],
      projections,
      context,
      [],
      (id) => id,
    );
    const elite = rows.find((row) => row.playerId === 'market-qb-1')!;
    const fringe = rows.find((row) => row.playerId === 'market-qb-8')!;

    expect(elite.predictedWinningBid).toBeGreaterThan(fringe.predictedWinningBid);
    expect(elite.predictedWinningBid).not.toBe(100);
    expect(fringe.predictedWinningBid).not.toBe(100);
  });

  it('reports VoRP as unavailable instead of fabricating a zero without Sleeper ROS', () => {
    const displayValues = new Map([
      ['available-qb', projection('available-qb', 'QB', 25)],
    ]);

    const rows = buildWaiverBoard(['available-qb'], displayValues, context, [], (id) => id);

    expect(suggestionValue(rows, 'vorp')).toBeNull();
    expect(rows[0].suggestions.find((item) => item.strategy === 'vorp')?.pctOfBudget).toBeNull();
  });

  it('applies maxPerPos to displayed players without renumbering their league-wide ranks', () => {
    const projections = new Map([
      ['qb-1', projection('qb-1', 'QB', 30)],
      ['qb-2-available', projection('qb-2-available', 'QB', 25)],
      ['qb-3', projection('qb-3', 'QB', 20)],
      ['qb-4-available', projection('qb-4-available', 'QB', 15)],
    ]);

    const rows = buildWaiverBoard(
      ['qb-4-available', 'qb-2-available'],
      projections,
      context,
      [],
      (id) => id,
      { maxPerPos: 1 },
    );

    expect(rows.map((row) => [row.playerId, row.posRank])).toEqual([
      ['qb-2-available', 2],
    ]);
  });

  it('does not fall back to historical scoring when a player has no ROS projection', () => {
    const rows = buildWaiverBoard(
      ['historical-only-player'],
      new Map(),
      context,
      [],
      (id) => id,
    );

    expect(rows).toEqual([]);
  });

  it('preserves raw model values without any budget-floor clamp path', () => {
    const projections = new Map([
      ['available-qb', projection('available-qb', 'QB', 30)],
    ]);

    const rows = buildWaiverBoard(
      ['available-qb'],
      projections,
      context,
      [],
      (id) => id,
    );

    expect(suggestionValue(rows, 'safe')).toBe(188);
    expect(suggestionValue(rows, 'safe')).toBeGreaterThan(20);
    expect(rows[0].suggestions.map((item) => item.strategy)).toEqual([
      'weeks-starter', 'safe', 'aggressive', 'vorp',
    ]);
  });
});
