// TanStack Query hooks for Sleeper API

import { useQuery } from '@tanstack/react-query';
import { get, set } from 'idb-keyval';
import * as api from './client';
import type { PlayerMap } from './types';

// Stale times
const LEAGUE_STALE = 1000 * 60 * 60; // 1 hour
const PLAYERS_STALE = 1000 * 60 * 60 * 24 * 7; // 7 days

export function useLeague(leagueId: string | null) {
  return useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => api.fetchLeague(leagueId!),
    enabled: !!leagueId,
    staleTime: LEAGUE_STALE,
  });
}

export function useUsers(leagueId: string | null) {
  return useQuery({
    queryKey: ['users', leagueId],
    queryFn: () => api.fetchUsers(leagueId!),
    enabled: !!leagueId,
    staleTime: LEAGUE_STALE,
  });
}

export function useRosters(leagueId: string | null) {
  return useQuery({
    queryKey: ['rosters', leagueId],
    queryFn: () => api.fetchRosters(leagueId!),
    enabled: !!leagueId,
    staleTime: LEAGUE_STALE,
  });
}

export function useMatchups(leagueId: string | null, week: number) {
  return useQuery({
    queryKey: ['matchups', leagueId, week],
    queryFn: () => api.fetchMatchups(leagueId!, week),
    enabled: !!leagueId && week > 0,
    staleTime: LEAGUE_STALE,
  });
}

export function useAllMatchups(leagueId: string | null, maxWeek: number) {
  return useQuery({
    queryKey: ['allMatchups', leagueId, maxWeek],
    queryFn: async () => {
      const results = new Map<number, Awaited<ReturnType<typeof api.fetchMatchups>>>();
      for (let w = 1; w <= maxWeek; w++) {
        const matchups = await api.fetchMatchups(leagueId!, w);
        if (matchups.length === 0) break;
        results.set(w, matchups);
      }
      return results;
    },
    enabled: !!leagueId && maxWeek > 0,
    staleTime: LEAGUE_STALE,
  });
}

export function useTransactions(leagueId: string | null, week: number) {
  return useQuery({
    queryKey: ['transactions', leagueId, week],
    queryFn: () => api.fetchTransactions(leagueId!, week),
    enabled: !!leagueId && week > 0,
    staleTime: LEAGUE_STALE,
  });
}

export function useAllTransactions(leagueId: string | null, maxWeek: number) {
  return useQuery({
    queryKey: ['allTransactions', leagueId, maxWeek],
    queryFn: async () => {
      const results = new Map<number, Awaited<ReturnType<typeof api.fetchTransactions>>>();
      for (let w = 1; w <= maxWeek; w++) {
        const txns = await api.fetchTransactions(leagueId!, w);
        results.set(w, txns);
      }
      return results;
    },
    enabled: !!leagueId && maxWeek > 0,
    staleTime: LEAGUE_STALE,
  });
}

export function useDraftPicks(draftId: string | null) {
  return useQuery({
    queryKey: ['draftPicks', draftId],
    queryFn: () => api.fetchDraftPicks(draftId!),
    enabled: !!draftId,
    staleTime: Infinity, // Draft picks never change
  });
}

/**
 * Player database hook with IndexedDB caching.
 * The /players/nfl endpoint is ~30MB so we cache in IndexedDB
 * and only refetch if older than 7 days.
 */
export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async (): Promise<PlayerMap> => {
      // Check IndexedDB cache first
      const cached = await get<{ data: PlayerMap; timestamp: number }>('sleeper-players');
      if (cached && Date.now() - cached.timestamp < PLAYERS_STALE) {
        return cached.data;
      }
      // Fetch fresh
      const data = await api.fetchPlayers();
      await set('sleeper-players', { data, timestamp: Date.now() });
      return data;
    },
    staleTime: PLAYERS_STALE,
    gcTime: Infinity, // Never garbage collect player data from memory
  });
}

export function useUserLeagues(userId: string | null, season: string) {
  return useQuery({
    queryKey: ['userLeagues', userId, season],
    queryFn: () => api.fetchUserLeagues(userId!, season),
    enabled: !!userId,
    staleTime: LEAGUE_STALE,
  });
}

export function useSleeperUser(username: string | null) {
  return useQuery({
    queryKey: ['sleeperUser', username],
    queryFn: () => api.fetchUser(username!),
    enabled: !!username,
    staleTime: Infinity, // User IDs don't change
  });
}
