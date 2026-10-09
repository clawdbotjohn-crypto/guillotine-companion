import type { WaiverRankingSource } from './rankingSources';
import type { StrategyKey } from './waiverStrategies';
import type { WaiverPlayerRow } from './waivers';

export const CUSTOM_RANKING_SCHEMA_VERSION = 2;
export const MAX_CUSTOM_RANKINGS = 10;
export const CUSTOM_RANKING_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;

export type CustomRankingMode = 'built-in' | 'position-curve';
export type CustomRankingPosition = typeof CUSTOM_RANKING_POSITIONS[number];

export interface PositionValueCurve {
  maxValue: number;
  step: number;
}

export type PositionValueCurves = Record<CustomRankingPosition, PositionValueCurve>;

export const DEFAULT_POSITION_VALUE_CURVES: PositionValueCurves = {
  QB: { maxValue: 85, step: 10 },
  RB: { maxValue: 250, step: 25 },
  WR: { maxValue: 225, step: 20 },
  TE: { maxValue: 100, step: 10 },
};

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
  mode: CustomRankingMode;
  baseStrategy: StrategyKey;
  multiplier: number;
  modifier: number;
  positionCurves: PositionValueCurves;
  players: Record<string, CustomRankingPlayerSnapshot>;
  overrides: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomRankingConfig {
  name: string;
  baseRankingSource: WaiverRankingSource;
  mode: CustomRankingMode;
  baseStrategy: StrategyKey;
  multiplier: number;
  modifier: number;
  positionCurves: PositionValueCurves;
}

export function cloneDefaultPositionValueCurves(): PositionValueCurves {
  return Object.fromEntries(CUSTOM_RANKING_POSITIONS.map((position) => [
    position,
    { ...DEFAULT_POSITION_VALUE_CURVES[position] },
  ])) as PositionValueCurves;
}

export function createDefaultCustomRankingConfig(
  baseRankingSource: WaiverRankingSource = 'sleeper',
): CustomRankingConfig {
  return {
    name: '',
    baseRankingSource,
    mode: 'built-in',
    baseStrategy: 'max-vorp',
    multiplier: 1,
    modifier: 0,
    positionCurves: cloneDefaultPositionValueCurves(),
  };
}

export function customRankingConfigFromBoard(board: CustomRanking): CustomRankingConfig {
  return {
    name: board.name,
    baseRankingSource: board.baseRankingSource,
    mode: board.mode,
    baseStrategy: board.baseStrategy,
    multiplier: board.multiplier,
    modifier: board.modifier,
    positionCurves: structuredClone(board.positionCurves),
  };
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

export function applyPositionValueCurve(
  positionRank: number,
  curve: PositionValueCurve,
  multiplier: number,
): number {
  const rank = Number.isFinite(positionRank) ? Math.max(1, Math.floor(positionRank)) : 1;
  return normalizeCustomValue((curve.maxValue - ((rank - 1) * curve.step)) * multiplier);
}

export function getBuiltInStrategyValue(row: WaiverPlayerRow, strategy: StrategyKey): number {
  const value = row.suggestions.find((suggestion) => suggestion.strategy === strategy)?.value;
  return normalizeCustomValue(value ?? 0);
}

function isCustomRankingPosition(position: string): position is CustomRankingPosition {
  return CUSTOM_RANKING_POSITIONS.includes(position as CustomRankingPosition);
}

export function getGeneratedCustomValue(row: WaiverPlayerRow, config: CustomRankingConfig): number {
  if (config.mode === 'position-curve') {
    return isCustomRankingPosition(row.position)
      ? applyPositionValueCurve(row.posRank, config.positionCurves[row.position], config.multiplier)
      : 0;
  }
  return applyCustomRankingFormula(
    getBuiltInStrategyValue(row, config.baseStrategy),
    config.multiplier,
    config.modifier,
  );
}

export function buildCustomRankingPlayers(
  rows: readonly WaiverPlayerRow[],
  config: CustomRankingConfig,
): Record<string, CustomRankingPlayerSnapshot> {
  return Object.fromEntries([...rows]
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((row) => [row.playerId, {
      playerId: row.playerId,
      name: row.name,
      position: row.position,
      positionRank: row.posRank,
      sourceValue: row.sourceValue,
      ...(row.sourceRank == null ? {} : { sourceRank: row.sourceRank }),
      baselineValue: getGeneratedCustomValue(row, config),
    }]));
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

export function customRankingGeneratedSettingsChanged(
  board: CustomRanking,
  config: CustomRankingConfig,
): boolean {
  if (config.baseRankingSource !== board.baseRankingSource || config.mode !== board.mode) return true;
  if (config.multiplier !== board.multiplier) return true;
  if (config.mode === 'built-in') {
    return config.baseStrategy !== board.baseStrategy || config.modifier !== board.modifier;
  }
  return CUSTOM_RANKING_POSITIONS.some((position) => (
    config.positionCurves[position].maxValue !== board.positionCurves[position].maxValue
    || config.positionCurves[position].step !== board.positionCurves[position].step
  ));
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
    mode: config.mode,
    baseStrategy: config.baseStrategy,
    multiplier: config.multiplier,
    modifier: config.modifier,
    positionCurves: structuredClone(config.positionCurves),
    players: buildCustomRankingPlayers(rows, config),
    overrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

/** Rebuilds the frozen generated baseline from explicit settings and optionally reapplies manual values. */
export function regenerateCustomRanking(
  board: CustomRanking,
  config: CustomRankingConfig,
  rows: readonly WaiverPlayerRow[],
  now: string,
  preserveOverrides: boolean,
): CustomRanking {
  const players = buildCustomRankingPlayers(rows, config);
  const overrides = preserveOverrides
    ? Object.fromEntries(Object.entries(board.overrides)
      .filter(([playerId]) => players[playerId] != null)
      .map(([playerId, value]) => [playerId, normalizeCustomValue(value)]))
    : {};
  return {
    ...board,
    schemaVersion: CUSTOM_RANKING_SCHEMA_VERSION,
    name: config.name.trim(),
    baseRankingSource: config.baseRankingSource,
    mode: config.mode,
    baseStrategy: config.baseStrategy,
    multiplier: config.multiplier,
    modifier: config.modifier,
    positionCurves: structuredClone(config.positionCurves),
    players,
    overrides,
    updatedAt: now,
  };
}

interface PersistedCustomRankingState {
  boardsByScope: Record<string, CustomRanking[]>;
  lastUsedByScope: Record<string, string>;
}

/** Migrates v1 formula boards without changing their frozen values or explicit overrides. */
export function migrateCustomRankingPersistedState(persisted: unknown): PersistedCustomRankingState {
  const state = persisted && typeof persisted === 'object'
    ? persisted as Partial<PersistedCustomRankingState>
    : {};
  const boardsByScope = Object.fromEntries(Object.entries(state.boardsByScope ?? {}).map(([scope, boards]) => [
    scope,
    Array.isArray(boards) ? boards.map((candidate) => {
      const board = candidate as CustomRanking & { schemaVersion?: number; mode?: CustomRankingMode; positionCurves?: PositionValueCurves };
      return {
        ...board,
        schemaVersion: CUSTOM_RANKING_SCHEMA_VERSION,
        mode: board.mode ?? 'built-in',
        positionCurves: CUSTOM_RANKING_POSITIONS.every((position) => board.positionCurves?.[position])
          ? structuredClone(board.positionCurves as PositionValueCurves)
          : cloneDefaultPositionValueCurves(),
      } satisfies CustomRanking;
    }) : [],
  ]));
  return {
    boardsByScope,
    lastUsedByScope: state.lastUsedByScope ?? {},
  };
}
