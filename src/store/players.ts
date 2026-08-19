// Player database with IndexedDB caching via idb-keyval
// The Sleeper /players/nfl endpoint returns ~30MB; we cache it in IndexedDB

import { get, set, del } from 'idb-keyval';
import { useQuery } from '@tanstack/react-query';
import { getAllPlayers } from '../api/client';

const IDB_KEY = 'sleeper-players-v1';
const IDB_TS_KEY = 'sleeper-players-ts';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PlayerRecord {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string;
  age: number | null;
  injury_status: string | null;
  status: string;
}

// In-memory lookup for fast access after load
let playerMap: Map<string, PlayerRecord> = new Map();

function parsePlayer(id: string, raw: any): PlayerRecord {
  return {
    player_id: id,
    first_name: raw.first_name || '',
    last_name: raw.last_name || '',
    full_name: `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
    position: raw.position || raw.fantasy_positions?.[0] || 'UNK',
    team: raw.team || '',
    age: raw.age ?? null,
    injury_status: raw.injury_status ?? null,
    status: raw.status || 'Active',
  };
}

async function loadPlayers(): Promise<Map<string, PlayerRecord>> {
  // Check IDB cache first
  const [cached, ts] = await Promise.all([get(IDB_KEY), get<number>(IDB_TS_KEY)]);
  if (cached && ts && Date.now() - ts < CACHE_TTL) {
    playerMap = new Map(Object.entries(cached as Record<string, PlayerRecord>));
    return playerMap;
  }

  // Fetch fresh
  const raw = await getAllPlayers();
  const parsed: Record<string, PlayerRecord> = {};
  for (const [id, p] of Object.entries(raw)) {
    if (p && (p as any).first_name) {
      parsed[id] = parsePlayer(id, p);
    }
  }

  // Store in IDB
  try {
    await set(IDB_KEY, parsed);
    await set(IDB_TS_KEY, Date.now());
  } catch {
    // IDB may be full — continue with in-memory only
  }

  playerMap = new Map(Object.entries(parsed));
  return playerMap;
}

export function getPlayer(id: string): PlayerRecord | undefined {
  return playerMap.get(id);
}

export function getPlayerName(id: string): string {
  return playerMap.get(id)?.full_name || id;
}

export function getPlayerPosition(id: string): string {
  return playerMap.get(id)?.position || 'UNK';
}

export async function clearPlayerCache(): Promise<void> {
  await del(IDB_KEY);
  await del(IDB_TS_KEY);
  playerMap.clear();
}

// TanStack Query hook
export function usePlayers() {
  return useQuery({
    queryKey: ['players-db'],
    queryFn: loadPlayers,
    staleTime: CACHE_TTL,
    gcTime: Infinity,
  });
}
