import type { WaiverRankingSource } from './rankingSources';
import type { StrategyKey } from './waiverStrategies';
import type { WaiverPlayerRow } from './waivers';

export const CUSTOM_RANKING_SCHEMA_VERSION = 1;
export const MAX_CUSTOM_RANKINGS = 10;

export interface CustomRankingPlayerSnapshot {
  playerId: string;
  name: string;
  position: string;
  positionRank: number;
  sourceValue: number;
  sourceRank?: number;
  baselineValue: number;
}

export interface CustomRanking {
  schemaVersion: typeof CUSTOM_RANKING_SCHEMA_VERSION;
  id: string;
  leagueId: string;
  season: string;
  name: string;
  baseRankingSource: WaiverRankingSource;
  baseStrategy: StrategyKey;
  multiplier: number;
  modifier: number;
  players: Record<string, CustomRankingPlayerSnapshot>;
  overrides: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomRankingConfig {
  name: string;
  baseRankingSource: WaiverRankingSource;
  baseStrategy: StrategyKey;
  multiplier: number;
  modifier: number;
}

export function customRankingScopeKey(leagueId: string, season: string): string {
  return `${encodeURIComponent(leagueId)}::${encodeURIComponent(season)}`;
}

export function normalizeCustomValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function applyCustomRankingFormula(baseValue: number, multiplier: number, modifier: number): number {
  return normalizeCustomValue(baseValue * multiplier + modifier);
}

export function getBuiltInStrategyValue(row: WaiverPlayerRow, strategy: StrategyKey): number {
  const value = row.suggestions.find((suggestion) => suggestion.strategy === strategy)?.value;
  return normalizeCustomValue(value ?? 0);
}

export function buildCustomRankingPlayers(
  rows: readonly WaiverPlayerRow[],
  strategy: StrategyKey,
  multiplier: number,
  modifier: number,
): Record<string, CustomRankingPlayerSnapshot> {
  return Object.fromEntries([...rows]
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((row) => {
      const baseValue = getBuiltInStrategyValue(row, strategy);
      return [row.playerId, {
        playerId: row.playerId,
        name: row.name,
        position: row.position,
        positionRank: row.posRank,
        sourceValue: row.sourceValue,
        ...(row.sourceRank == null ? {} : { sourceRank: row.sourceRank }),
        baselineValue: applyCustomRankingFormula(baseValue, multiplier, modifier),
      }];
    }));
}

export function customRankingValue(board: CustomRanking, playerId: string): number {
  const override = board.overrides[playerId];
  if (override != null) return normalizeCustomValue(override);
  return board.players[playerId]?.baselineValue ?? 0;
}

export function sortCustomRankingPlayerIds(board: CustomRanking): string[] {
  return Object.keys(board.players).sort((a, b) => {
    const valueDifference = customRankingValue(board, b) - customRankingValue(board, a);
    if (valueDifference !== 0) return valueDifference;
    const sourceRankA = board.players[a].sourceRank ?? Number.POSITIVE_INFINITY;
    const sourceRankB = board.players[b].sourceRank ?? Number.POSITIVE_INFINITY;
    return sourceRankA - sourceRankB
      || board.players[a].positionRank - board.players[b].positionRank
      || board.players[a].name.localeCompare(board.players[b].name)
      || a.localeCompare(b);
  });
}

export function createCustomRanking({
  id,
  leagueId,
  season,
  config,
  rows,
  now,
}: {
  id: string;
  leagueId: string;
  season: string;
  config: CustomRankingConfig;
  rows: readonly WaiverPlayerRow[];
  now: string;
}): CustomRanking {
  return {
    schemaVersion: CUSTOM_RANKING_SCHEMA_VERSION,
    id,
    leagueId,
    season,
    name: config.name.trim(),
    baseRankingSource: config.baseRankingSource,
    baseStrategy: config.baseStrategy,
    multiplier: config.multiplier,
    modifier: config.modifier,
    players: buildCustomRankingPlayers(rows, config.baseStrategy, config.multiplier, config.modifier),
    overrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

/** Rebuilds the frozen generated baseline and intentionally clears every manual override. */
export function recalculateCustomRanking(
  board: CustomRanking,
  config: CustomRankingConfig,
  rows: readonly WaiverPlayerRow[],
  now: string,
): CustomRanking {
  return {
    ...board,
    name: config.name.trim(),
    baseRankingSource: config.baseRankingSource,
    baseStrategy: config.baseStrategy,
    multiplier: config.multiplier,
    modifier: config.modifier,
    players: buildCustomRankingPlayers(rows, config.baseStrategy, config.multiplier, config.modifier),
    overrides: {},
    updatedAt: now,
  };
}
