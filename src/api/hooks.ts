// TanStack Query hooks for Sleeper API

import { useQuery } from '@tanstack/react-query';
import * as api from './client';
import type { League, SleeperUser, Roster, Matchup, Transaction, DraftPick, UserLeague } from './types';

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
