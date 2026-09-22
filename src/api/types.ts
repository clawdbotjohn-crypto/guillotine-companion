// Sleeper API type definitions

export interface League {
  league_id: string;
  name: string;
  total_rosters: number;
  settings: Record<string, number>;
  scoring_settings: Record<string, number>;
  season: string;
  season_type: string;
  status: string;
  draft_id: string;
  previous_league_id: string | null;
  roster_positions: string[];
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  username: string;
}

export interface Roster {
  roster_id: number;
  owner_id: string;
  players: string[] | null;
  starters: string[] | null;
  settings: {
    wins: number;
    losses: number;
    fpts: number;
    fpts_decimal?: number;
    waiver_budget_used: number;
  };
}

export interface Matchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  starters: string[] | null;
  starters_points: number[] | null;
  players: string[] | null;
  players_points: Record<string, number> | null;
}

export interface Transaction {
  type: string;
  status: string;
  transaction_id: string;
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
  metadata: {
    first_name: string;
    last_name: string;
    position: string;
    team: string;
  };
}

export interface PlayerInfo {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
  fantasy_positions: string[] | null;
  status: string;
}

export interface UserLeague {
  league_id: string;
  name: string;
  total_rosters: number;
  settings: Record<string, number>;
  season: string;
  status: string;
  roster_positions: string[];
  previous_league_id: string | null;
  draft_id: string;
  avatar: string | null;
}

export interface NflState {
  week: number;
  display_week: number;
  season: string;
  season_type: string;
  leg: number;
  league_season: string;
  season_start_date: string;
  season_has_scores: boolean;
}

/** Sleeper's weekly projection object contains many stat fields; waiver math uses these totals. */
export interface SleeperProjection {
  pts_ppr?: number;
  pts_half_ppr?: number;
  pts_std?: number;
  [key: string]: unknown;
}

export type WeeklyProjectionMap = Record<string, SleeperProjection>;

export interface ExternalRanking {
  name: string;
  position: string;
  team: string;
  value: number;
  rank: number;
  sleeperId?: string;
}

export interface FantasyCalcResponse {
  players: ExternalRanking[];
  scoring: number;
  teams: number;
  superflex: boolean;
  fetchedAt: string;
}

export interface FootballAbsurdityResponse {
  rankings: Array<ExternalRanking & { vorp: number }>;
  settings: Record<string, string | number>;
}
