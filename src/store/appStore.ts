// Zustand app store with persistence

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // User info
  username: string;
  userId: string | null;

  // Selected league + team
  leagueId: string | null;
  leagueName: string | null;
  leagueSeason: string | null;
  rosterId: number | null;
  teamName: string | null;

  // Strategy preference
  activeStrategy: 'safe' | 'exponential' | 'vorp' | 'weeks-starter';

  // Actions
  setUser: (username: string, userId: string) => void;
  setLeague: (id: string, name: string, season: string) => void;
  setTeam: (rosterId: number, teamName: string) => void;
  setStrategy: (s: AppState['activeStrategy']) => void;
  reset: () => void;
}

const initialState = {
  username: '',
  userId: null as string | null,
  leagueId: null as string | null,
  leagueName: null as string | null,
  leagueSeason: null as string | null,
  rosterId: null as number | null,
  teamName: null as string | null,
  activeStrategy: 'safe' as const,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (username, userId) => set({ username, userId }),

      setLeague: (id, name, season) =>
        set({ leagueId: id, leagueName: name, leagueSeason: season, rosterId: null, teamName: null }),

      setTeam: (rosterId, teamName) => set({ rosterId, teamName }),

      setStrategy: (activeStrategy) => set({ activeStrategy }),

      reset: () => set(initialState),
    }),
    {
      name: 'guillotine-companion-store',
    },
  ),
);
