import { describe, it, expect, vi } from 'vitest';
import { computeEliminations, isGuillotineLeague } from '../elimination';
import type { Matchup, Roster, SleeperUser } from '../../api/types';

// Mock the players store
vi.mock('../../store/players', () => ({
  getPlayerName: (id: string) => `Player ${id}`,
  getPlayerPosition: (_id: string) => 'WR',
}));

function makeRoster(id: number, ownerId: string): Roster {
  return {
    roster_id: id,
    owner_id: ownerId,
    players: [],
    starters: [],
    settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
  };
}

function makeUser(id: string, name: string): SleeperUser {
  return { user_id: id, display_name: name, avatar: null, username: name.toLowerCase() };
}

function makeMatchup(rosterId: number, points: number): Matchup {
  return {
    roster_id: rosterId,
    matchup_id: 1,
    points,
    starters: [],
    starters_points: [],
    players: [],
    players_points: {},
  };
}

describe('computeEliminations', () => {
  const rosters = [
    makeRoster(1, 'u1'), makeRoster(2, 'u2'), makeRoster(3, 'u3'), makeRoster(4, 'u4'),
  ];
  const users = [
    makeUser('u1', 'Alice'), makeUser('u2', 'Bob'), makeUser('u3', 'Charlie'), makeUser('u4', 'Diana'),
  ];

  it('eliminates lowest scorer each week', () => {
    const matchups = new Map<number, Matchup[]>();
    // Week 1: 4 teams, lowest gets eliminated
    matchups.set(1, [
      makeMatchup(1, 120), makeMatchup(2, 100), makeMatchup(3, 80), makeMatchup(4, 60),
    ]);
    // Week 2: 3 teams remain
    matchups.set(2, [
      makeMatchup(1, 110), makeMatchup(2, 90), makeMatchup(3, 70),
    ]);
    // Week 3: finals (2 teams)
    matchups.set(3, [
      makeMatchup(1, 115), makeMatchup(2, 95),
    ]);

    const result = computeEliminations(matchups, rosters, users);

    expect(result.weeks).toHaveLength(3);
    // Week 1: team 4 eliminated (60 pts)
    expect(result.weeks[0].eliminated).toEqual([4]);
    // Week 2: team 3 eliminated (70 pts)
    expect(result.weeks[1].eliminated).toEqual([3]);
    // Week 3: finals — no elimination
    expect(result.weeks[2].eliminated).toEqual([]);
    expect(result.weeks[2].isFinals).toBe(true);
    // Champion is team 1 (higher score)
    expect(result.champion).toBe(1);
    expect(result.runnerUp).toBe(2);
    expect(result.isComplete).toBe(true);
  });

  it('handles incomplete season (no finals yet)', () => {
    const matchups = new Map<number, Matchup[]>();
    matchups.set(1, [
      makeMatchup(1, 120), makeMatchup(2, 100), makeMatchup(3, 80), makeMatchup(4, 60),
    ]);

    const result = computeEliminations(matchups, rosters, users);

    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0].eliminated).toEqual([4]);
    expect(result.champion).toBeNull();
    expect(result.isComplete).toBe(false);
    expect(result.currentWeek).toBe(1);
  });

  it('correctly ranks teams by score', () => {
    const matchups = new Map<number, Matchup[]>();
    matchups.set(1, [
      makeMatchup(1, 80), makeMatchup(2, 120), makeMatchup(3, 100), makeMatchup(4, 90),
    ]);

    const result = computeEliminations(matchups, rosters, users);
    const scores = result.weeks[0].scores;

    expect(scores[0].rosterId).toBe(2); // 120 = rank 1
    expect(scores[0].rank).toBe(1);
    expect(scores[1].rosterId).toBe(3); // 100 = rank 2
    expect(scores[2].rosterId).toBe(4); // 90 = rank 3
    expect(scores[3].rosterId).toBe(1); // 80 = rank 4
  });

  it('computes correct stats (top, avg, cutoff)', () => {
    const matchups = new Map<number, Matchup[]>();
    matchups.set(1, [
      makeMatchup(1, 120), makeMatchup(2, 100), makeMatchup(3, 80), makeMatchup(4, 60),
    ]);

    const result = computeEliminations(matchups, rosters, users);
    const week = result.weeks[0];

    expect(week.topScore).toBe(120);
    expect(week.avgScore).toBe(90); // (120+100+80+60)/4
    expect(week.cutoffScore).toBe(60); // eliminated team's score
    expect(week.teamsRemaining).toBe(4);
  });

  it('sets team info correctly for champion and runner-up', () => {
    const matchups = new Map<number, Matchup[]>();
    matchups.set(1, [
      makeMatchup(1, 120), makeMatchup(2, 100), makeMatchup(3, 80), makeMatchup(4, 60),
    ]);
    matchups.set(2, [
      makeMatchup(1, 110), makeMatchup(2, 90), makeMatchup(3, 70),
    ]);
    matchups.set(3, [
      makeMatchup(1, 115), makeMatchup(2, 95),
    ]);

    const result = computeEliminations(matchups, rosters, users);

    const team1 = result.teams.get(1)!;
    expect(team1.isChampion).toBe(true);
    expect(team1.eliminatedWeek).toBeNull();
    expect(team1.displayName).toBe('Alice');

    const team2 = result.teams.get(2)!;
    expect(team2.isRunnerUp).toBe(true);

    const team4 = result.teams.get(4)!;
    expect(team4.eliminatedWeek).toBe(1);
  });

  it('handles empty matchups gracefully', () => {
    const matchups = new Map<number, Matchup[]>();
    const result = computeEliminations(matchups, rosters, users);

    expect(result.weeks).toHaveLength(0);
    expect(result.champion).toBeNull();
    expect(result.isComplete).toBe(false);
  });
});

describe('isGuillotineLeague', () => {
  it('returns true when playoff_teams is 0', () => {
    expect(isGuillotineLeague({ settings: { playoff_teams: 0 } })).toBe(true);
  });

  it('returns false when playoff_teams > 0', () => {
    expect(isGuillotineLeague({ settings: { playoff_teams: 6 } })).toBe(false);
  });

  it('returns true when settings has no playoff_teams', () => {
    expect(isGuillotineLeague({ settings: {} })).toBe(true);
  });
});
