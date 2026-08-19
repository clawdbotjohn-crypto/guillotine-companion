// Sleeper API client — all fetch wrappers with error handling

import type { League, User, Roster, Matchup, Transaction, DraftPick, PlayerMap } from './types';

const BASE = 'https://api.sleeper.app/v1';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

export function fetchLeague(leagueId: string): Promise<League> {
  return fetchJSON(`${BASE}/league/${leagueId}`);
}

export function fetchUsers(leagueId: string): Promise<User[]> {
  return fetchJSON(`${BASE}/league/${leagueId}/users`);
}

export function fetchRosters(leagueId: string): Promise<Roster[]> {
  return fetchJSON(`${BASE}/league/${leagueId}/rosters`);
}

export function fetchMatchups(leagueId: string, week: number): Promise<Matchup[]> {
  return fetchJSON(`${BASE}/league/${leagueId}/matchups/${week}`);
}

export function fetchTransactions(leagueId: string, week: number): Promise<Transaction[]> {
  return fetchJSON(`${BASE}/league/${leagueId}/transactions/${week}`);
}

export function fetchDraftPicks(draftId: string): Promise<DraftPick[]> {
  return fetchJSON(`${BASE}/draft/${draftId}/picks`);
}

export function fetchPlayers(): Promise<PlayerMap> {
  return fetchJSON(`${BASE}/players/nfl`);
}

export function fetchUserLeagues(userId: string, season: string): Promise<League[]> {
  return fetchJSON(`${BASE}/user/${userId}/leagues/nfl/${season}`);
}

export function fetchUser(username: string): Promise<{ user_id: string; display_name: string; username: string }> {
  return fetchJSON(`${BASE}/user/${username}`);
}
