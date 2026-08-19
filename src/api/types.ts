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
