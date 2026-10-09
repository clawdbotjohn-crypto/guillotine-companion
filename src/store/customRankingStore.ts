import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MAX_CUSTOM_RANKINGS,
  customRankingScopeKey,
  normalizeCustomValue,
  type CustomRanking,
  type CustomRankingConfig,
} from '../logic/customRankings';

function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

interface CustomRankingState {
  boardsByScope: Record<string, CustomRanking[]>;
  lastUsedByScope: Record<string, string>;
  addBoard: (board: CustomRanking) => boolean;
  selectBoard: (leagueId: string, season: string, boardId: string) => void;
  updateBoardSettings: (leagueId: string, season: string, boardId: string, config: CustomRankingConfig) => void;
  replaceBoard: (board: CustomRanking) => void;
  setOverride: (leagueId: string, season: string, boardId: string, playerId: string, value: number) => void;
  clearOverrides: (leagueId: string, season: string, boardId: string) => void;
  deleteBoard: (leagueId: string, season: string, boardId: string) => void;
}

function scopeBoards(state: CustomRankingState, leagueId: string, season: string): CustomRanking[] {
  return state.boardsByScope[customRankingScopeKey(leagueId, season)] ?? [];
}

function updateScopedBoard(
  state: CustomRankingState,
  leagueId: string,
  season: string,
  boardId: string,
  update: (board: CustomRanking) => CustomRanking,
): Pick<CustomRankingState, 'boardsByScope'> {
  const key = customRankingScopeKey(leagueId, season);
  return {
    boardsByScope: {
      ...state.boardsByScope,
      [key]: scopeBoards(state, leagueId, season).map((board) => board.id === boardId ? update(board) : board),
    },
  };
}

export const useCustomRankingStore = create<CustomRankingState>()(
  persist(
    (set, get) => ({
      boardsByScope: {},
      lastUsedByScope: {},

      addBoard: (board) => {
        const key = customRankingScopeKey(board.leagueId, board.season);
        const boards = get().boardsByScope[key] ?? [];
        if (boards.length >= MAX_CUSTOM_RANKINGS
          || !normalizedName(board.name)
          || boards.some((item) => item.id === board.id || normalizedName(item.name) === normalizedName(board.name))) return false;
        set((state) => ({
          boardsByScope: { ...state.boardsByScope, [key]: [...boards, board] },
          lastUsedByScope: { ...state.lastUsedByScope, [key]: board.id },
        }));
        return true;
      },

      selectBoard: (leagueId, season, boardId) => set((state) => {
        const key = customRankingScopeKey(leagueId, season);
        if (!scopeBoards(state, leagueId, season).some((board) => board.id === boardId)) return {};
        return { lastUsedByScope: { ...state.lastUsedByScope, [key]: boardId } };
      }),

      updateBoardSettings: (leagueId, season, boardId, config) => set((state) => {
        const name = config.name.trim();
        const duplicate = scopeBoards(state, leagueId, season).some(
          (item) => item.id !== boardId && normalizedName(item.name) === normalizedName(name),
        );
        if (!name || duplicate) return {};
        // A normal settings save is deliberately rename-only. Formula metadata changes only
        // together with regenerated values through the confirmed recalculation path.
        return updateScopedBoard(state, leagueId, season, boardId, (board) => ({
          ...board,
          name,
          updatedAt: new Date().toISOString(),
        }));
      }),

      replaceBoard: (replacement) => set((state) => {
        const duplicate = scopeBoards(state, replacement.leagueId, replacement.season).some(
          (item) => item.id !== replacement.id && normalizedName(item.name) === normalizedName(replacement.name),
        );
        if (!normalizedName(replacement.name) || duplicate) return {};
        return updateScopedBoard(
          state,
          replacement.leagueId,
          replacement.season,
          replacement.id,
          () => replacement,
        );
      }),

      setOverride: (leagueId, season, boardId, playerId, value) => set((state) => updateScopedBoard(
        state,
        leagueId,
        season,
        boardId,
        (board) => board.players[playerId] ? {
          ...board,
          overrides: { ...board.overrides, [playerId]: normalizeCustomValue(value) },
          updatedAt: new Date().toISOString(),
        } : board,
      )),

      clearOverrides: (leagueId, season, boardId) => set((state) => updateScopedBoard(
        state,
        leagueId,
        season,
        boardId,
        (board) => ({ ...board, overrides: {}, updatedAt: new Date().toISOString() }),
      )),

      deleteBoard: (leagueId, season, boardId) => set((state) => {
        const key = customRankingScopeKey(leagueId, season);
        const remaining = scopeBoards(state, leagueId, season).filter((board) => board.id !== boardId);
        const lastUsed = state.lastUsedByScope[key];
        const nextLastUsed = lastUsed === boardId ? remaining[0]?.id : lastUsed;
        const lastUsedByScope = { ...state.lastUsedByScope };
        if (nextLastUsed) lastUsedByScope[key] = nextLastUsed;
        else delete lastUsedByScope[key];
        return {
          boardsByScope: { ...state.boardsByScope, [key]: remaining },
          lastUsedByScope,
        };
      }),
    }),
    {
      name: 'guillotine-companion-custom-rankings',
      version: 1,
      partialize: (state) => ({
        boardsByScope: state.boardsByScope,
        lastUsedByScope: state.lastUsedByScope,
      }),
    },
  ),
);

export function getCustomRankingsForScope(
  state: Pick<CustomRankingState, 'boardsByScope'>,
  leagueId: string,
  season: string,
): CustomRanking[] {
  return state.boardsByScope[customRankingScopeKey(leagueId, season)] ?? [];
}

export function getLastUsedCustomRanking(
  state: Pick<CustomRankingState, 'boardsByScope' | 'lastUsedByScope'>,
  leagueId: string,
  season: string,
): CustomRanking | undefined {
  const key = customRankingScopeKey(leagueId, season);
  const boards = state.boardsByScope[key] ?? [];
  return boards.find((board) => board.id === state.lastUsedByScope[key]) ?? boards[0];
}
