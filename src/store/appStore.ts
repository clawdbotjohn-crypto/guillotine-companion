// Zustand app store with persistence

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WAIVER_STRATEGY, WAIVER_STRATEGY_REGISTRY } from '../logic/waiverStrategies';
import type { DisplayStrategyKey } from '../logic/waiverDisplay';

export interface RecentLeague {
  leagueId: string;
  name: string;
  season: string;
}

export const RECENT_LEAGUE_LIMIT = 6;

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
  recentLeagues: RecentLeague[];

  // Strategy and UI preferences
  activeStrategy: DisplayStrategyKey;
  showEliminatedTeams: boolean;

  // Actions
  startUsernameDiscovery: () => void;
  startLeagueDiscovery: () => void;
  setUser: (username: string, userId: string) => void;
  setLeague: (id: string, name: string, season: string) => void;
  switchSeason: (leagueId: string, name: string, season: string) => void;
  setTeam: (rosterId: number, teamName: string) => void;
  removeRecentLeague: (leagueId: string) => void;
  restoreRecentLeague: (league: RecentLeague) => void;
  setStrategy: (s: AppState['activeStrategy']) => void;
  setShowEliminatedTeams: (show: boolean) => void;
  clearSelection: () => void;
  reset: () => void;
}

function readRecentLeague(value: unknown): RecentLeague | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  const leagueId = typeof entry.leagueId === 'string'
    ? entry.leagueId
    : typeof entry.id === 'string'
      ? entry.id
      : null;
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  const season = typeof entry.season === 'string' ? entry.season.trim() : '';
  if (!leagueId || !/^\d{16,20}$/.test(leagueId) || !name || !/^\d{4}$/.test(season)) return null;
  return { leagueId, name, season };
}

export function normalizeRecentLeagues(value: unknown): RecentLeague[] {
  if (!Array.isArray(value)) return [];
  const result: RecentLeague[] = [];
  const seen = new Set<string>();
  for (const valueEntry of value) {
    const entry = readRecentLeague(valueEntry);
    if (!entry || seen.has(entry.leagueId)) continue;
    seen.add(entry.leagueId);
    result.push(entry);
    if (result.length === RECENT_LEAGUE_LIMIT) break;
  }
  return result;
}

function upsertRecentLeague(recentLeagues: unknown, league: RecentLeague): RecentLeague[] {
  return [league, ...normalizeRecentLeagues(recentLeagues).filter((entry) => entry.leagueId !== league.leagueId)]
    .slice(0, RECENT_LEAGUE_LIMIT);
}

export function migratePersistedAppState(persistedState: unknown): unknown {
  if (!persistedState || typeof persistedState !== 'object') return persistedState;

  const state = persistedState as Record<string, unknown>;
  const { savedLeagues, ...stateWithoutLegacySavedLeagues } = state;
  const legacySelectedLeague = {
    leagueId: state.leagueId,
    name: state.leagueName,
    season: state.leagueSeason,
  };
  const migrated = {
    ...stateWithoutLegacySavedLeagues,
    recentLeagues: normalizeRecentLeagues(
      state.recentLeagues ?? savedLeagues ?? [legacySelectedLeague],
    ),
  };
  // Preserve every explicit recognized choice. Only legacy aliases, missing values, and invalid
  // values migrate; old implicit defaults cannot otherwise be distinguished from user choices.
  if (state.activeStrategy === 'exponential') {
    return { ...migrated, activeStrategy: 'aggressive' };
  }
  const valid = state.activeStrategy === 'custom'
    || WAIVER_STRATEGY_REGISTRY.some(({ key }) => key === state.activeStrategy);
  if (!valid) return { ...migrated, activeStrategy: DEFAULT_WAIVER_STRATEGY };
  return migrated;
}

const selectionState = {
  leagueId: null as string | null,
  leagueName: null as string | null,
  leagueSeason: null as string | null,
  rootLeagueId: null as string | null,
  rosterId: null as number | null,
  teamName: null as string | null,
};

const initialState = {
  username: '',
  userId: null as string | null,
  ...selectionState,
  recentLeagues: [] as RecentLeague[],
  activeStrategy: DEFAULT_WAIVER_STRATEGY,
  showEliminatedTeams: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      startUsernameDiscovery: () => set({ userId: null, ...selectionState }),

      startLeagueDiscovery: () => set({ username: '', userId: null, ...selectionState }),

      setUser: (username, userId) => set({ username, userId }),

      setLeague: (id, name, season) =>
        set((state) => ({
          leagueId: id,
          leagueName: name,
          leagueSeason: season,
          rootLeagueId: id,
          rosterId: null,
          teamName: null,
          recentLeagues: upsertRecentLeague(state.recentLeagues, { leagueId: id, name, season }),
        })),

      switchSeason: (leagueId, name, season) =>
        set({ leagueId, leagueName: name, leagueSeason: season, rosterId: null, teamName: null }),

      setTeam: (rosterId, teamName) => set({ rosterId, teamName }),

      removeRecentLeague: (leagueId) => set((state) => ({
        recentLeagues: normalizeRecentLeagues(state.recentLeagues)
          .filter((entry) => entry.leagueId !== leagueId),
      })),

      restoreRecentLeague: (league) => set((state) => ({
        recentLeagues: upsertRecentLeague(state.recentLeagues, league),
      })),

      setStrategy: (activeStrategy) => set({ activeStrategy }),

      setShowEliminatedTeams: (showEliminatedTeams) => set({ showEliminatedTeams }),

      clearSelection: () => set({ username: '', userId: null, ...selectionState }),

      reset: () => set(initialState),
    }),
    {
      name: 'guillotine-companion-store',
      version: 3,
      migrate: (persistedState) => migratePersistedAppState(persistedState) as AppState,
      merge: (persistedState, currentState) => {
        const migrated = migratePersistedAppState(persistedState);
        if (!migrated || typeof migrated !== 'object') return currentState;
        return { ...currentState, ...migrated } as AppState;
      },
    },
  ),
);
