// Zustand app store with persistence

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StrategyKey } from '../logic/waivers';

interface AppState {
  // User info
  username: string;
  userId: string | null;

  // Selected league + team
  leagueId: string | null;
  leagueName: string | null;
  leagueSeason: string | null;
  rootLeagueId: string | null; // The original league ID entered (most recent season)
  rosterId: number | null;
  teamName: string | null;

  // Strategy and UI preferences
  activeStrategy: StrategyKey;
  showEliminatedTeams: boolean;

  // Actions
  setUser: (username: string, userId: string) => void;
  setLeague: (id: string, name: string, season: string) => void;
  switchSeason: (leagueId: string, name: string, season: string) => void;
  setTeam: (rosterId: number, teamName: string) => void;
  setStrategy: (s: AppState['activeStrategy']) => void;
  setShowEliminatedTeams: (show: boolean) => void;
  reset: () => void;
}

export function migratePersistedAppState(persistedState: unknown): unknown {
  if (!persistedState || typeof persistedState !== 'object') return persistedState;

  const state = persistedState as Record<string, unknown>;
  // Version 0 persisted the old strategy key. Map it to the honest semantic name so
  // existing users keep the same selected ceiling and hydration never yields an invalid key.
  if (state.activeStrategy === 'exponential') {
    return { ...state, activeStrategy: 'aggressive' };
  }
  return state;
}

const initialState = {
  username: '',
  userId: null as string | null,
  leagueId: null as string | null,
  leagueName: null as string | null,
  leagueSeason: null as string | null,
  rootLeagueId: null as string | null,
  rosterId: null as number | null,
  teamName: null as string | null,
  activeStrategy: 'safe' as const,
  showEliminatedTeams: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (username, userId) => set({ username, userId }),

      setLeague: (id, name, season) =>
        set((state) => ({
          leagueId: id,
          leagueName: name,
          leagueSeason: season,
          rootLeagueId: state.rootLeagueId || id,
          rosterId: null,
          teamName: null,
        })),

      switchSeason: (leagueId, name, season) =>
        set({ leagueId, leagueName: name, leagueSeason: season, rosterId: null, teamName: null }),

      setTeam: (rosterId, teamName) => set({ rosterId, teamName }),

      setStrategy: (activeStrategy) => set({ activeStrategy }),

      setShowEliminatedTeams: (showEliminatedTeams) => set({ showEliminatedTeams }),

      reset: () => set(initialState),
    }),
    {
      name: 'guillotine-companion-store',
      version: 1,
      migrate: (persistedState) => migratePersistedAppState(persistedState) as AppState,
    },
  ),
);
