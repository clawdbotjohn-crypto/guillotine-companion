import { describe, it, expect, vi } from 'vitest';
import { computeEliminations, getActiveRosterIds, getCompletedLeagueWeek, isGuillotineLeague } from '../elimination';
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

  it('separates teams entering a week from the post-elimination active count', () => {
    const largeRosters = Array.from({ length: 30 }, (_, index) =>
      makeRoster(index + 1, `u${index + 1}`));
    const largeUsers = Array.from({ length: 30 }, (_, index) =>
      makeUser(`u${index + 1}`, `Team ${index + 1}`));
    const matchups = new Map<number, Matchup[]>([
      [1, Array.from({ length: 30 }, (_, index) => makeMatchup(index + 1, 130 - index))],
    ]);

    const result = computeEliminations(matchups, largeRosters, largeUsers);

    expect(result.weeks[0].teamsRemaining).toBe(30);
    expect(result.weeks[0].eliminated).toHaveLength(2);
    expect(result.activeTeamCount).toBe(28);
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

describe('current-week elimination guard', () => {
  it('uses league last_scored_leg so partial Thursday scores cannot become an elimination week', () => {
    expect(getCompletedLeagueWeek(
      { season: '2026', settings: { last_scored_leg: 2 } },
      { season: '2026', week: 3 },
    )).toBe(2);
    expect(getCompletedLeagueWeek(
      { season: '2025', settings: { last_scored_leg: 18 } },
      { season: '2026', week: 3 },
    )).toBe(18);
    expect(getCompletedLeagueWeek(undefined, { season: '2026', week: 3 })).toBeNull();
  });

  it('keeps a 32-team/two-chops-per-week league at 28 active before the third week is final', () => {
    const leagueRosters = Array.from({ length: 32 }, (_, index) => makeRoster(index + 1, `u${index + 1}`));
    const leagueUsers = Array.from({ length: 32 }, (_, index) => makeUser(`u${index + 1}`, `Manager ${index + 1}`));
    const completedWeek = getCompletedLeagueWeek(
      { season: '2026', settings: { last_scored_leg: 2 } },
      { season: '2026', week: 3 },
    )!;
    const allFetchedWeeks = new Map<number, Matchup[]>([
      [1, Array.from({ length: 32 }, (_, index) => makeMatchup(index + 1, index + 1))],
      [2, Array.from({ length: 32 }, (_, index) => makeMatchup(index + 1, index < 2 ? 0 : index + 1))],
      [3, Array.from({ length: 32 }, (_, index) => makeMatchup(index + 1, index < 21 ? 0 : index + 1))],
    ]);
    const completedMatchups = new Map([...allFetchedWeeks].filter(([week]) => week <= completedWeek));
    const result = computeEliminations(completedMatchups, leagueRosters, leagueUsers);
    expect(getActiveRosterIds(result).size).toBe(28);
    expect([...result.teams.values()].filter((team) => team.eliminatedWeek != null)).toHaveLength(4);
  });

  it('derives one survivor set directly from the canonical elimination result', () => {
    const result = computeEliminations(new Map([
      [1, [makeMatchup(1, 10), makeMatchup(2, 20), makeMatchup(3, 30)]],
    ]), [makeRoster(1, 'u1'), makeRoster(2, 'u2'), makeRoster(3, 'u3')], [
      makeUser('u1', 'Alice'), makeUser('u2', 'Bob'), makeUser('u3', 'Charlie'),
    ]);
    expect([...getActiveRosterIds(result)]).toEqual([2, 3]);
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
