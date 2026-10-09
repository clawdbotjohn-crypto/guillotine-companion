import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MAX_CUSTOM_RANKINGS,
  customRankingScopeKey,
  normalizeCustomValue,
  type CustomRanking,
  type CustomRankingConfig,
} from '../logic/customRankings';

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
        if (boards.length >= MAX_CUSTOM_RANKINGS || boards.some((item) => item.id === board.id)) return false;
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

      updateBoardSettings: (leagueId, season, boardId, config) => set((state) => updateScopedBoard(
        state,
        leagueId,
        season,
        boardId,
        (board) => ({
          ...board,
          name: config.name.trim(),
          baseRankingSource: config.baseRankingSource,
          baseStrategy: config.baseStrategy,
          multiplier: config.multiplier,
          modifier: config.modifier,
          updatedAt: new Date().toISOString(),
        }),
      )),

      replaceBoard: (replacement) => set((state) => updateScopedBoard(
        state,
        replacement.leagueId,
        replacement.season,
        replacement.id,
        () => replacement,
      )),

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
