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
  isWithinLiveGameWindow,
  LIVE_REFRESH_MS,
} from './liveScoring';

const roster = (rosterId: number): Roster => ({
  roster_id: rosterId, owner_id: String(rosterId), players: [], starters: [],
  settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
});
const matchup = (rosterId: number, points: number, starters: string[]): Matchup => ({
  roster_id: rosterId, matchup_id: 1, points, starters, starters_points: [], players: starters, players_points: {},
});
const player = (id: string, team: string): PlayerRecord => ({
  player_id: id, first_name: id, last_name: '', full_name: id, position: 'WR', team,
  age: 25, injury_status: null, status: 'Active',
});
const projection = (id: string, points: number): WeeklyScoredPlayer => ({ playerId: id, position: 'WR', points });
function elimination(eliminatedIds: number[] = []): EliminationResult {
  return {
    weeks: [{ week: 1, scores: [], eliminated: [99], teamsRemaining: 3, cutoffScore: 0, topScore: 0, avgScore: 0, lowScore: 0, isFinals: false }],
    teams: new Map([1, 2, 3].map((id) => [id, {
      rosterId: id, userId: String(id), displayName: `Manager ${id}`,
      eliminatedWeek: eliminatedIds.includes(id) ? 1 : null,
      isChampion: false, isRunnerUp: false,
    }])),
    activeTeamCount: 3 - eliminatedIds.length, champion: null, runnerUp: null,
    isComplete: false, currentWeek: 2,
  };
}

const games: SleeperGame[] = [
  { game_id: 'pre', status: 'pre_game', home_team: 'PRE', away_team: 'XXX', start_time: 2_000_000_000_000 },
  { game_id: 'live', status: 'in_progress', home_team: 'LIVE', away_team: 'YYY', metadata: { quarter: 3, clock: '00:00', is_in_progress: true } },
  { game_id: 'done', status: 'complete', home_team: 'DONE', away_team: 'ZZZ', metadata: { is_over: true } },
];

describe('live scoring model', () => {
  it('adds only remaining projection to official scores for pregame, in-progress, and complete starters', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(1), roster(2), roster(3)],
      matchups: [
        matchup(1, 20, ['pre', 'live', 'done', 'bye']),
        matchup(2, 40, ['done2']),
        matchup(3, 30, ['done3']),
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
    });
    const team = model.teams.find((entry) => entry.rosterId === 1)!;
    // Q3 at 0:00 leaves one quarter, so 20 official + 10 pregame + 5 remaining.
    expect(team.officialPoints).toBe(20);
    expect(team.projectedFinal).toBe(35);
    expect(team.projectionQuality).toBe('full');
    expect(team.playersRemaining).toBe(2);
    expect(team.playersInProgress).toBe(1);
    expect(model.activeTeamCount).toBe(3);
    expect(model.rankingsAvailable).toBe(true);
  });

  it('marks unknown progress or missing player mappings partial without inventing points', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(1)], matchups: [matchup(1, 12, ['done', 'unknown'])],
      weeklyProjections: new Map(), games,
      players: new Map([['done', player('done', 'DONE')]]), elimination: elimination([2, 3]),
    });
    expect(model.teams[0]).toMatchObject({ projectedFinal: 12, projectionQuality: 'partial', standing: null });
    expect(model.rankingsAvailable).toBe(false);
    expect(model.projectedCutline).toBeNull();
  });

  it('fails closed when an empty game feed cannot establish starter state', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(1)], matchups: [matchup(1, 12, ['unknown-game'])],
      weeklyProjections: new Map([['unknown-game', projection('unknown-game', 9)]]), games: [],
      players: new Map([['unknown-game', player('unknown-game', 'BUF')]]), elimination: elimination([2, 3]),
    });
    expect(model.teams[0]).toMatchObject({ projectedFinal: null, projectionQuality: 'unavailable' });
  });

  it('keeps bye/no-game starters at official points and excludes eliminated teams from denominator', () => {
    const model = buildLiveScoringModel({
      rosters: [roster(1), roster(2), roster(3)],
      matchups: [matchup(1, 10, ['bye']), matchup(2, 20, ['bye2']), matchup(3, 99, ['bye3'])],
      weeklyProjections: new Map(), games: [{ status: 'complete', home_team: 'DAL', away_team: 'NYG' }],
      players: new Map([['bye', player('bye', 'BUF')], ['bye2', player('bye2', 'KC')], ['bye3', player('bye3', 'SEA')]]),
      elimination: elimination([3]),
    });
    expect(model.activeTeamCount).toBe(2);
    expect(model.teams.find((team) => team.rosterId === 3)?.standing).toBeNull();
    expect(model.teams.at(-1)?.rosterId).toBe(3);
    expect(model.projectedCutline).toBe(10);
  });
});

describe('live query policy and freshness', () => {
  const now = 1_000_000_000_000;
  it('polls only in live windows, schedules one bounded wake-up, and ignores games hours away', () => {
    const near = [{ status: 'pre_game', start_time: now + 10 * 60_000 }];
    const oneHourAway = [{ status: 'pre_game', start_time: now + 60 * 60_000 }];
    const far = [{ status: 'pre_game', start_time: now + 12 * 60 * 60_000 }];
    expect(isWithinLiveGameWindow(near, now)).toBe(true);
    expect(getLiveRefreshInterval(near, now)).toBe(LIVE_REFRESH_MS);
    expect(getLiveRefreshInterval(oneHourAway, now)).toBe(45 * 60_000);
    expect(getLiveRefreshInterval(far, now)).toBe(false);
    expect(isWithinLiveGameWindow([{ status: 'in_progress' }], now)).toBe(true);
    expect(getLiveRefreshInterval([{ status: 'complete', start_time: now }], now)).toBe(false);
  });

  it('derives bounded remaining fractions from observed Sleeper progress fields only', () => {
    expect(getRemainingGameFraction(games[1])).toBe(0.25);
    expect(getRemainingGameFraction({
      status: 'in_progress',
      metadata: { quarter_num: '2', time_remaining: '07:30', is_in_progress: true },
    })).toBe(0.625);
    expect(getRemainingGameFraction({ status: 'in_progress', metadata: { quarter: 2 } })).toBeNull();
    expect(getRemainingGameFraction({
      status: 'in_progress', metadata: { quarter_num: 5, time_remaining: '10:00' },
    })).toBeNull();
  });

  it('reports fresh, stale, and unavailable timestamps', () => {
    expect(getLiveFreshness(now - 30_000, now)).toBe('fresh');
    expect(getLiveFreshness(now - 121_000, now)).toBe('stale');
    expect(getLiveFreshness(null, now)).toBe('unavailable');
  });

  it('tracks freshness from minute-polled live inputs rather than the static projection baseline', () => {
    const matchupUpdatedAt = now - 10_000;
    const gamesUpdatedAt = now - 20_000;
    expect(getLiveDataUpdatedAt(matchupUpdatedAt, gamesUpdatedAt)).toBe(gamesUpdatedAt);
    expect(getLiveFreshness(getLiveDataUpdatedAt(matchupUpdatedAt, gamesUpdatedAt), now)).toBe('fresh');
    expect(getLiveDataUpdatedAt(matchupUpdatedAt, 0)).toBeNull();
  });
});
