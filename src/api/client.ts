// Sleeper API client — all fetches go through here for consistency

import type {
  League,
  SleeperUser,
  Roster,
  Matchup,
  Transaction,
  DraftPick,
  UserLeague,
  NflState,
  WeeklyProjectionMap,
} from './types';

const BASE = 'https://api.sleeper.app/v1';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new ApiError(`API error: ${res.statusText}`, res.status);
  }
  return res.json();
}

// League
export const getLeague = (id: string) => get<League>(`/league/${id}`);
export const getLeagueUsers = (id: string) => get<SleeperUser[]>(`/league/${id}/users`);
export const getLeagueRosters = (id: string) => get<Roster[]>(`/league/${id}/rosters`);
export const getMatchups = (id: string, week: number) =>
  get<Matchup[]>(`/league/${id}/matchups/${week}`);
export const getTransactions = (id: string, week: number) =>
  get<Transaction[]>(`/league/${id}/transactions/${week}`);

// Draft
export const getDraftPicks = (draftId: string) => get<DraftPick[]>(`/draft/${draftId}/picks`);

// User
export const getUserByUsername = (username: string) =>
  get<SleeperUser>(`/user/${username}`);
export const getUserLeagues = (userId: string, season: string) =>
  get<UserLeague[]>(`/user/${userId}/leagues/nfl/${season}`);

// Players (large payload ~30MB)
export const getAllPlayers = () => get<Record<string, any>>('/players/nfl');

// NFL state and weekly projections
export const getNflState = () => get<NflState>('/state/nfl');
export const getWeeklyProjections = (season: string, week: number) =>
  get<WeeklyProjectionMap>(`/projections/nfl/regular/${season}/${week}`);

/** Fetch projection weeks with a small concurrency cap so one page load does not fan out 16 requests. */
export async function getProjectionWeeks(
  season: string,
  weeks: number[],
  concurrency = 4,
): Promise<Map<number, WeeklyProjectionMap>> {
  const results = new Map<number, WeeklyProjectionMap>();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < weeks.length) {
      const week = weeks[nextIndex++];
      try {
        results.set(week, await getWeeklyProjections(season, week));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        throw new Error(`Could not load Sleeper projections for week ${week}: ${message}`);
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), weeks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

// League history — walk previous_league_id chain
export async function getLeagueHistory(leagueId: string): Promise<League[]> {
  const history: League[] = [];
  let currentId: string | null = leagueId;
  while (currentId) {
    const league = await getLeague(currentId);
    history.push(league);
    currentId = league.previous_league_id;
  }
  return history; // Most recent first
}
