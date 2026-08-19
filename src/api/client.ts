// Sleeper API client — all fetches go through here for consistency

import type {
  League,
  SleeperUser,
  Roster,
  Matchup,
  Transaction,
  DraftPick,
  UserLeague,
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
