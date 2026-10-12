import { describe, expect, it } from 'vitest';
import type { Matchup, Roster, SleeperGame } from '../api/types';
import type { PlayerRecord } from '../store/players';
import type { EliminationResult } from './elimination';
import type { WeeklyScoredPlayer } from './projections';
import {
  buildLiveScoringModel,
  getLiveDataUpdatedAt,
  getLiveFreshness,
  getLiveRefreshInterval,
  getRemainingGameFraction,
  isWeeklyScoringActive,
  isWithinLiveGameWindow,
  LIVE_REFRESH_MS,
} from './liveScoring';

const roster = (rosterId: number): Roster => ({
  roster_id: rosterId, owner_id: String(rosterId), players: [], starters: [],
  settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
});
const matchup = (rosterId: number, points: number | null, starters: string[], starterPoints: Array<number | null> = []): Matchup => ({
  roster_id: rosterId,
  matchup_id: 1,
  points,
  starters,
  starters_points: starterPoints,
  players: starters,
  players_points: Object.fromEntries(starters.map((id, index) => [id, starterPoints[index] ?? null])),
});
const player = (id: string, team: string): PlayerRecord => ({
  player_id: id, first_name: id, last_name: '', full_name: `Player ${id}`, position: 'WR', team,
  age: 25, injury_status: null, status: 'Active',
});
const projection = (id: string, points: number): WeeklyScoredPlayer => ({ playerId: id, position: 'WR', points });
function elimination(eliminatedIds: number[] = []): EliminationResult {
  return {
    weeks: [{ week: 1, scores: [], eliminated: [99], teamsRemaining: 3, cutoffScore: 0, topScore: 0, avgScore: 0, lowScore: 0, isFinals: false }],
    teams: new Map([1, 2, 3, 4].map((id) => [id, {
      rosterId: id, userId: String(id), displayName: `Manager ${id}`,
      eliminatedWeek: eliminatedIds.includes(id) ? 1 : null,
      isChampion: false, isRunnerUp: false,
    }])),
    activeTeamCount: 4 - eliminatedIds.length, champion: null, runnerUp: null,
    isComplete: false, currentWeek: 2,
  };
}

const games: SleeperGame[] = [
  { game_id: 'pre', status: 'pre_game', home_team: 'PRE', away_team: 'XXX', start_time: 2_000_000_000_000 },
  { game_id: 'live', status: 'in_progress', home_team: 'LIVE', away_team: 'YYY', metadata: { quarter: 3, clock: '00:00', is_in_progress: true } },
  { game_id: 'done', status: 'complete', home_team: 'DONE', away_team: 'ZZZ', metadata: { is_over: true } },
];

describe('live scoring model', () => {
  it('adds only known remaining projection and keeps the projected final numeric', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(1), roster(2), roster(3)],
      matchups: [
        matchup(1, 20, ['pre', 'live', 'done', 'bye'], [0, 4, 8, null]),
        matchup(2, 40, ['done2'], [40]),
        matchup(3, 30, ['done3'], [30]),
      ],
      weeklyProjections: new Map([
        ['pre', projection('pre', 10)],
        ['live', projection('live', 20)],
        ['done', projection('done', 50)],
      ]),
      games,
      players: new Map([
        ['pre', player('pre', 'PRE')], ['live', player('live', 'LIVE')],
        ['done', player('done', 'DONE')], ['bye', player('bye', 'BYE')],
        ['done2', player('done2', 'DONE')], ['done3', player('done3', 'DONE')],
      ]),
      elimination: elimination(),
      lineupPositions: ['WR', 'FLEX', 'WR', 'WR'],
    });
    const team = model.teams.find((entry) => entry.rosterId === 1)!;
    // Q3 at 0:00 leaves one quarter, so 20 official + 10 pregame + 5 remaining.
    expect(team).toMatchObject({
      officialPoints: 20,
      projectedFinal: 35,
      playersRemaining: 2,
      playersInProgress: 1,
      startersStarted: 2,
      starterCount: 4,
    });
    expect(team.starters.map((starter) => starter.lineupPosition)).toEqual(['WR', 'FLEX', 'WR', 'WR']);
    expect(model.rankingsAvailable).toBe(true);
  });

  it('locks loaded null/missing team and starter scores to zero while unresolved projection contributes zero', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(1)],
      matchups: [matchup(1, null, ['done', 'unknown'], [null])],
      weeklyProjections: new Map(),
      games,
      players: new Map([['done', player('done', 'DONE')]]),
      elimination: elimination([2, 3, 4]),
    });
    expect(model.teams[0]).toMatchObject({
      officialPoints: 0,
      projectedFinal: 0,
      startersStarted: 1,
      starterCount: 2,
    });
    expect(model.teams[0].starters.map((starter) => starter.currentPoints)).toEqual([0, 0]);
    expect(model.teams[0].standing).toMatchObject({ rank: 1, outOf: 1 });
    expect(model.projectedCutline).toBe(0);
  });

  it('uses deterministic zero contribution for unmapped and bye starters without hiding status', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(1)], matchups: [matchup(1, 12, ['bye', 'unknown'])],
      weeklyProjections: new Map([['unknown', projection('unknown', 9)]]),
      games: [{ status: 'complete', home_team: 'DAL', away_team: 'NYG' }],
      players: new Map([['bye', player('bye', 'BUF')]]), elimination: elimination([2, 3, 4]),
    });
    expect(model.teams[0]).toMatchObject({ projectedFinal: 12, startersStarted: 0, starterCount: 2 });
    expect(model.teams[0].starters.map((starter) => starter.status)).toEqual(['bye', 'unknown']);
    expect(model.teams[0].standing?.risk).toBe('at-risk');
  });

  it('orders active teams projected-lowest first with roster-id ties and excludes eliminated teams', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(3), roster(2), roster(1), roster(4)],
      matchups: [matchup(1, 10, []), matchup(2, 10, []), matchup(3, 20, []), matchup(4, 1, [])],
      weeklyProjections: null,
      games: [],
      players: new Map(),
      elimination: elimination([4]),
    });
    expect(model.teams.map((team) => team.rosterId)).toEqual([1, 2, 3, 4]);
    expect(model.activeTeamCount).toBe(3);
    expect(model.teams.find((team) => team.rosterId === 4)?.standing).toBeNull();
    expect(model.teams.find((team) => team.rosterId === 1)?.standing).toMatchObject({ rank: 2, outOf: 3 });
    expect(model.teams.find((team) => team.rosterId === 2)?.standing).toMatchObject({ rank: 3, outOf: 3 });
  });
});

describe('live query policy and freshness', () => {
  const now = 1_000_000_000_000;
  it('keeps the weekly slate active between game windows until the final game completes', () => {
    expect(isWeeklyScoringActive([
      { status: 'complete', start_time: now - 2 * 86_400_000 },
      { status: 'pre_game', start_time: now + 86_400_000 },
    ], now)).toBe(true);
    expect(isWeeklyScoringActive([{ status: 'pre_game', start_time: now + 1_000 }], now)).toBe(false);
    expect(isWeeklyScoringActive([{ status: 'complete', start_time: now - 1_000 }], now)).toBe(false);
  });

  it('polls only in live windows and schedules one bounded kickoff wake-up', () => {
    const near = [{ status: 'pre_game', start_time: now + 10 * 60_000 }];
    const oneHourAway = [{ status: 'pre_game', start_time: now + 60 * 60_000 }];
    const far = [{ status: 'pre_game', start_time: now + 12 * 60 * 60_000 }];
    expect(isWithinLiveGameWindow(near, now)).toBe(true);
    expect(getLiveRefreshInterval(near, now)).toBe(LIVE_REFRESH_MS);
    expect(getLiveRefreshInterval(oneHourAway, now)).toBe(45 * 60_000);
    expect(getLiveRefreshInterval(far, now)).toBe(false);
    expect(isWithinLiveGameWindow([{ status: 'in_progress' }], now)).toBe(true);
  });

  it('derives bounded remaining fractions from observed progress fields only', () => {
    expect(getRemainingGameFraction(games[1])).toBe(0.25);
    expect(getRemainingGameFraction({ status: 'in_progress', metadata: { quarter_num: '2', time_remaining: '07:30', is_in_progress: true } })).toBe(0.625);
    expect(getRemainingGameFraction({ status: 'in_progress', metadata: { quarter: 2 } })).toBeNull();
  });

  it('reports freshness from minute-polled inputs', () => {
    expect(getLiveFreshness(now - 30_000, now)).toBe('fresh');
    expect(getLiveFreshness(now - 121_000, now)).toBe('stale');
    expect(getLiveFreshness(null, now)).toBe('unavailable');
    expect(getLiveDataUpdatedAt(now - 10_000, now - 20_000)).toBe(now - 20_000);
    expect(getLiveDataUpdatedAt(now - 10_000, 0)).toBeNull();
  });
});
