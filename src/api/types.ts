// Sleeper API response types

export interface League {
  league_id: string;
  name: string;
  total_rosters: number;
  settings: Record<string, unknown>;
  season: string;
  draft_id: string;
  previous_league_id: string | null;
  status: string;
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
  starters: string[];
  settings: {
    wins: number;
    losses: number;
    fpts: number;
    waiver_budget_used: number;
  };
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
  metadata: {
    first_name: string;
    last_name: string;
    position: string;
    team: string;
  };
}

export interface Player {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  fantasy_positions: string[];
  injury_status: string | null;
  status: string;
}

export type PlayerMap = Record<string, Player>;
