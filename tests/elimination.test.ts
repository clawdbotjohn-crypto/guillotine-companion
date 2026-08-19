import { describe, it, expect } from 'vitest';
import { computeEliminations } from '../src/logic/elimination';
import type { Matchup } from '../src/api/types';

describe('computeEliminations', () => {
  it('should identify the lowest scorer as eliminated each week', () => {
    const weekMatchups = new Map<number, Matchup[]>();

    // Week 1: 4 teams, lowest scorer gets eliminated
    weekMatchups.set(1, [
      { roster_id: 1, points: 120, starters: [], players: [] },
      { roster_id: 2, points: 95, starters: [], players: [] },
      { roster_id: 3, points: 110, starters: [], players: [] },
      { roster_id: 4, points: 80, starters: [], players: [] }, // eliminated
    ]);

    // Week 2: 3 teams remain
    weekMatchups.set(2, [
      { roster_id: 1, points: 100, starters: [], players: [] },
      { roster_id: 2, points: 115, starters: [], players: [] },
      { roster_id: 3, points: 90, starters: [], players: [] }, // eliminated
    ]);

    // Week 3: Finals — 2 teams
    weekMatchups.set(3, [
      { roster_id: 1, points: 130, starters: [], players: [] },
      { roster_id: 2, points: 105, starters: [], players: [] },
    ]);

    const result = computeEliminations(weekMatchups, 3);

    expect(result.eliminationOrder.get(4)).toBe(1);
    expect(result.eliminationOrder.get(3)).toBe(2);
    expect(result.champion).toBe(1);
    expect(result.runnerUp).toBe(2);
    expect(result.isComplete).toBe(true);
    expect(result.weekData).toHaveLength(3);
  });

  it('should handle in-progress seasons (no champion)', () => {
    const weekMatchups = new Map<number, Matchup[]>();

    weekMatchups.set(1, [
      { roster_id: 1, points: 120, starters: [], players: [] },
      { roster_id: 2, points: 95, starters: [], players: [] },
      { roster_id: 3, points: 110, starters: [], players: [] },
      { roster_id: 4, points: 80, starters: [], players: [] },
      { roster_id: 5, points: 70, starters: [], players: [] }, // eliminated
    ]);

    const result = computeEliminations(weekMatchups, 1);

    expect(result.eliminationOrder.get(5)).toBe(1);
    expect(result.champion).toBeNull();
    expect(result.isComplete).toBe(false);
  });

  it('should compute correct stats per week', () => {
    const weekMatchups = new Map<number, Matchup[]>();

    weekMatchups.set(1, [
      { roster_id: 1, points: 100, starters: [], players: [] },
      { roster_id: 2, points: 80, starters: [], players: [] },
      { roster_id: 3, points: 120, starters: [], players: [] },
    ]);

    const result = computeEliminations(weekMatchups, 1);
    const week1 = result.weekData[0];

    expect(week1.topScore).toBe(120);
    expect(week1.avgScore).toBe(100);
    expect(week1.teamsRemaining).toBe(3);
    expect(week1.eliminated).toEqual([2]);
  });
});
