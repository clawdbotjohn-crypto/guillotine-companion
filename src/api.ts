// Sleeper API helper functions

const BASE = 'https://api.sleeper.app/v1';

export interface League {
  league_id: string;
  name: string;
  total_rosters: number;
  settings: Record<string, any>;
  season: string;
  draft_id: string;
  previous_league_id: string | null;
}

export interface User {
  user_id: string;
  display_name: string;
  avatar: string | null;
}

export interface Roster {
  roster_id: number;
  owner_id: string;
  players: string[];
  settings: { wins: number; losses: number; fpts: number; waiver_budget_used: number };
}

export interface Matchup {
  roster_id: number;
  points: number;
  starters: string[];
  players: string[];
}

export interface Transaction {
  type: string;
  status: string;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  settings: { waiver_bid?: number } | null;
  leg: number;
  created: number;
}

export interface DraftPick {
  round: number;
  pick_no: number;
  roster_id: number;
  player_id: string;
  metadata: { first_name: string; last_name: string; position: string; team: string };
}

export async function fetchLeague(leagueId: string): Promise<League> {
  const res = await fetch(`${BASE}/league/${leagueId}`);
  if (!res.ok) throw new Error('League not found');
  return res.json();
}

export async function fetchUsers(leagueId: string): Promise<User[]> {
  const res = await fetch(`${BASE}/league/${leagueId}/users`);
  return res.json();
}

export async function fetchRosters(leagueId: string): Promise<Roster[]> {
  const res = await fetch(`${BASE}/league/${leagueId}/rosters`);
  return res.json();
}

export async function fetchMatchups(leagueId: string, week: number): Promise<Matchup[]> {
  const res = await fetch(`${BASE}/league/${leagueId}/matchups/${week}`);
  return res.json();
}

export async function fetchTransactions(leagueId: string, week: number): Promise<Transaction[]> {
  const res = await fetch(`${BASE}/league/${leagueId}/transactions/${week}`);
  return res.json();
}

export async function fetchDraftPicks(draftId: string): Promise<DraftPick[]> {
  const res = await fetch(`${BASE}/draft/${draftId}/picks`);
  return res.json();
}

// Player names cache (subset - we'll build from draft + transactions)
let playerCache: Record<string, { fn: string; ln: string; pos: string; team: string }> = {};

export function getPlayerName(playerId: string): string {
  const p = playerCache[playerId];
  if (p) return `${p.fn} ${p.ln}`;
  return playerId;
}

export function getPlayerInfo(playerId: string) {
  return playerCache[playerId] || null;
}

export function setPlayerCache(id: string, fn: string, ln: string, pos: string, team: string) {
  playerCache[id] = { fn, ln, pos, team };
}

// Fetch full player DB (large!) - cache in localStorage
export async function fetchPlayers(): Promise<Record<string, any>> {
  const cacheKey = 'sleeper_players_v1';
  const cacheTimeKey = 'sleeper_players_time';
  const cached = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);
  
  // Use cache if less than 7 days old
  if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 7 * 24 * 60 * 60 * 1000) {
    const data = JSON.parse(cached);
    loadPlayersIntoCache(data);
    return data;
  }
  
  const res = await fetch(`${BASE}/players/nfl`);
  const data = await res.json();
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
  } catch (e) {
    // localStorage might be full
  }
  loadPlayersIntoCache(data);
  return data;
}

function loadPlayersIntoCache(data: Record<string, any>) {
  for (const [id, p] of Object.entries(data)) {
    if (p && (p as any).first_name) {
      const player = p as any;
      playerCache[id] = { fn: player.first_name, ln: player.last_name, pos: player.position || 'UNK', team: player.team || '' };
    }
  }
}
