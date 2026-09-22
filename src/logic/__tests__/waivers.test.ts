import { describe, expect, it } from 'vitest';
import type { Roster } from '../../api/types';
import type { RosPlayerProjection } from '../projections';
import { buildWaiverBoard, calculateRemainingFaab, type LeagueContext } from '../waivers';

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

function suggestionValue(
  rows: ReturnType<typeof buildWaiverBoard>,
  strategy: 'safe' | 'exponential' | 'weeks-starter' | 'vorp',
): number {
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
    // Rank 22 drives each rank-based strategy; available-only QB1 would be $188/$500/$188.
    // Safe has no artificial rank floor, so a QB this far below the starter pool is worth $0.
    expect(suggestionValue(rows, 'safe')).toBe(0);
    expect(suggestionValue(rows, 'exponential')).toBe(150);
    expect(suggestionValue(rows, 'weeks-starter')).toBe(0);
    expect(rows[0].starterWeeks).toBe(0);
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

  it('uses projected ROS values for replacement level and VoRP', () => {
    const projections = new Map<string, RosPlayerProjection>();
    for (let rank = 1; rank <= 12; rank++) {
      const id = `qb-${rank}`;
      projections.set(id, projection(id, 'QB', 30 - rank));
    }
    projections.set('available-qb', projection('available-qb', 'QB', 25));

    const rows = buildWaiverBoard(['available-qb'], projections, context, [], (id) => id);

    // First player after 12 starters is projected at 18/wk; available player is 7/wk above it.
    expect(suggestionValue(rows, 'vorp')).toBe(210);
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

  it('does not clamp raw values when remaining FAAB is supplied without a budget floor', () => {
    const projections = new Map([
      ['available-qb', projection('available-qb', 'QB', 30)],
    ]);

    const rows = buildWaiverBoard(
      ['available-qb'],
      projections,
      context,
      [],
      (id) => id,
      { remaining: 20 },
    );

    expect(suggestionValue(rows, 'safe')).toBe(188);
    expect(suggestionValue(rows, 'safe')).toBeGreaterThan(20);
  });
});
