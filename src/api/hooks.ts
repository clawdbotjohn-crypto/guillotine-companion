// TanStack Query hooks for Sleeper API

import { useQuery } from '@tanstack/react-query';
import * as api from './client';
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

const STALE_30M = 1000 * 60 * 30;
const STALE_1H = 1000 * 60 * 60;
const STALE_6H = STALE_1H * 6;

export function useLeague(leagueId: string | null) {
  return useQuery<League>({
    queryKey: ['league', leagueId],
    queryFn: () => api.getLeague(leagueId!),
    enabled: !!leagueId,
    staleTime: STALE_6H,
  });
}

export function useLeagueUsers(leagueId: string | null) {
  return useQuery<SleeperUser[]>({
    queryKey: ['league-users', leagueId],
    queryFn: () => api.getLeagueUsers(leagueId!),
    enabled: !!leagueId,
    staleTime: STALE_6H,
  });
}

export function useRosters(leagueId: string | null) {
  return useQuery<Roster[]>({
    queryKey: ['rosters', leagueId],
    queryFn: () => api.getLeagueRosters(leagueId!),
    enabled: !!leagueId,
    staleTime: STALE_1H,
  });
}

export function useMatchups(leagueId: string | null, week: number) {
  return useQuery<Matchup[]>({
    queryKey: ['matchups', leagueId, week],
    queryFn: () => api.getMatchups(leagueId!, week),
    enabled: !!leagueId && week > 0,
    staleTime: STALE_1H,
  });
}

export function useAllMatchups(leagueId: string | null, maxWeek: number) {
  return useQuery<Map<number, Matchup[]>>({
    queryKey: ['all-matchups', leagueId, maxWeek],
    queryFn: async () => {
      const map = new Map<number, Matchup[]>();
      for (let w = 1; w <= maxWeek; w++) {
        const m = await api.getMatchups(leagueId!, w);
        if (m && m.length > 0 && m.some((x) => x.points != null && x.points > 0)) {
          map.set(w, m);
        } else {
          break;
        }
      }
      return map;
    },
    enabled: !!leagueId && maxWeek > 0,
    staleTime: STALE_1H,
  });
}

export function useAllTransactions(leagueId: string | null, maxWeek: number) {
  return useQuery<Map<number, Transaction[]>>({
    queryKey: ['all-transactions', leagueId, maxWeek],
    queryFn: async () => {
      const map = new Map<number, Transaction[]>();
      for (let w = 1; w <= maxWeek; w++) {
        const t = await api.getTransactions(leagueId!, w);
        map.set(w, t || []);
      }
      return map;
    },
    enabled: !!leagueId && maxWeek > 0,
    staleTime: STALE_1H,
  });
}

export function useDraftPicks(draftId: string | null) {
  return useQuery<DraftPick[]>({
    queryKey: ['draft-picks', draftId],
    queryFn: () => api.getDraftPicks(draftId!),
    enabled: !!draftId,
    staleTime: STALE_6H,
  });
}

export function useSleeperUser(username: string | null) {
  return useQuery<SleeperUser>({
    queryKey: ['sleeper-user', username],
    queryFn: () => api.getUserByUsername(username!),
    enabled: !!username,
    staleTime: STALE_6H,
    retry: 1,
  });
}

export function useUserLeagues(userId: string | null, season: string) {
  return useQuery<UserLeague[]>({
    queryKey: ['user-leagues', userId, season],
    queryFn: () => api.getUserLeagues(userId!, season),
    enabled: !!userId,
    staleTime: STALE_6H,
  });
}

export function useLeagueHistory(leagueId: string | null) {
  return useQuery<League[]>({
    queryKey: ['league-history', leagueId],
    queryFn: () => api.getLeagueHistory(leagueId!),
    enabled: !!leagueId,
    staleTime: STALE_6H,
  });
}

export function useNflState() {
  return useQuery<NflState>({
    queryKey: ['nfl-state'],
    queryFn: api.getNflState,
    staleTime: STALE_30M,
    retry: 1,
  });
}

/**
 * Fetch and cache all remaining weekly projection payloads as one query. The client limits
 * concurrency to four requests, avoiding both a sequential waterfall and an unbounded fan-out.
 */
export function useRestOfSeasonProjectionWeeks(
  season: string | null,
  startWeek: number | null,
  endWeek = 18,
) {
  return useQuery<Map<number, WeeklyProjectionMap>>({
    queryKey: ['sleeper-ros-projections', season, startWeek, endWeek],
    queryFn: () => {
      const weeks = Array.from(
        { length: endWeek - startWeek! + 1 },
        (_, index) => startWeek! + index,
      );
      return api.getProjectionWeeks(season!, weeks, 4);
    },
    enabled: !!season && startWeek != null && startWeek >= 1 && startWeek <= endWeek,
    staleTime: STALE_30M,
    gcTime: STALE_6H,
    retry: 1,
  });
}
