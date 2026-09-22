import { describe, expect, it } from 'vitest';
import type { Roster } from '../../api/types';
import type { PlayerSeason } from '../analytics';
import { buildWaiverBoard, calculateRemainingFaab, type LeagueContext } from '../waivers';

const context: LeagueContext = {
  budget: 1000,
  teamsRemaining: 12,
  weeksRemaining: 10,
  currentWeek: 4,
  startersPerPos: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 0 },
};

function season(playerId: string, position: string, avgPoints: number): PlayerSeason {
  return {
    playerId,
    position,
    totalPoints: avgPoints * 4,
    games: 4,
    avgPoints,
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
  it('ranks and values an available QB against all 21 higher-scoring QBs', () => {
    const seasons = new Map<string, PlayerSeason>();
    for (let rank = 1; rank <= 21; rank++) {
      const id = `rostered-qb-${String(rank).padStart(2, '0')}`;
      seasons.set(id, season(id, 'QB', 40 - rank));
    }
    seasons.set('available-qb', season('available-qb', 'QB', 10));

    const rows = buildWaiverBoard(
      ['available-qb'],
      seasons,
      context,
      [],
      (id) => id,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].posRank).toBe(22);
    // Rank 22 drives each rank-based strategy; available-only QB1 would be $188/$500/$188.
    expect(suggestionValue(rows, 'safe')).toBe(60);
    expect(suggestionValue(rows, 'exponential')).toBe(150);
    expect(suggestionValue(rows, 'weeks-starter')).toBe(0);
  });

  it('applies maxPerPos to displayed players without renumbering their league-wide ranks', () => {
    const seasons = new Map([
      ['qb-1', season('qb-1', 'QB', 30)],
      ['qb-2-available', season('qb-2-available', 'QB', 25)],
      ['qb-3', season('qb-3', 'QB', 20)],
      ['qb-4-available', season('qb-4-available', 'QB', 15)],
    ]);

    const rows = buildWaiverBoard(
      ['qb-4-available', 'qb-2-available'],
      seasons,
      context,
      [],
      (id) => id,
      { maxPerPos: 1 },
    );

    expect(rows.map((row) => [row.playerId, row.posRank])).toEqual([
      ['qb-2-available', 2],
    ]);
  });

  it('does not clamp raw values when remaining FAAB is supplied without a budget floor', () => {
    const seasons = new Map([
      ['available-qb', season('available-qb', 'QB', 30)],
    ]);

    const rows = buildWaiverBoard(
      ['available-qb'],
      seasons,
      context,
      [],
      (id) => id,
      { remaining: 20 },
    );

    expect(suggestionValue(rows, 'safe')).toBe(188);
    expect(suggestionValue(rows, 'safe')).toBeGreaterThan(20);
  });
});
