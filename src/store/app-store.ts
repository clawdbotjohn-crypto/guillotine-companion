// App state store — Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // League context
  sleeperUsername: string | null;
  selectedLeagueId: string | null;
  selectedRosterId: number | null;

  // UI state
  activeTab: 'hub' | 'waivers' | 'league' | 'teams';
  activeStrategy: string;
  currentWeek: number | null;

  // Actions
  setUsername: (username: string | null) => void;
  setLeague: (leagueId: string | null) => void;
  setRoster: (rosterId: number | null) => void;
  setTab: (tab: AppState['activeTab']) => void;
  setStrategy: (strategy: string) => void;
  setWeek: (week: number | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sleeperUsername: null,
      selectedLeagueId: null,
      selectedRosterId: null,
      activeTab: 'hub',
      activeStrategy: 'safe',
      currentWeek: null,

      setUsername: (username) => set({ sleeperUsername: username }),
      setLeague: (leagueId) => set({ selectedLeagueId: leagueId, selectedRosterId: null }),
      setRoster: (rosterId) => set({ selectedRosterId: rosterId }),
      setTab: (tab) => set({ activeTab: tab }),
      setStrategy: (strategy) => set({ activeStrategy: strategy }),
      setWeek: (week) => set({ currentWeek: week }),
      reset: () => set({
        sleeperUsername: null,
        selectedLeagueId: null,
        selectedRosterId: null,
        activeTab: 'hub',
        activeStrategy: 'safe',
        currentWeek: null,
      }),
    }),
    {
      name: 'guillotine-companion-state',
      partialize: (state) => ({
        sleeperUsername: state.sleeperUsername,
        selectedLeagueId: state.selectedLeagueId,
        selectedRosterId: state.selectedRosterId,
        activeStrategy: state.activeStrategy,
      }),
    }
  )
);
