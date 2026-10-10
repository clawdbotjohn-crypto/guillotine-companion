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

export const DEFAULT_INITIAL_LEAGUE_FAAB = 1000;

const POSITION_CURVE_PERCENTAGES: Record<CustomRankingPosition, { maxValue: number; step: number }> = {
  QB: { maxValue: 0.17, step: 0.01 },
  RB: { maxValue: 0.27, step: 0.01 },
  WR: { maxValue: 0.27, step: 0.01 },
  TE: { maxValue: 0.09, step: 0.01 },
};

/** Build whole-dollar defaults from initial league FAAB; $1,000 is only the invalid/missing fallback. */
export function createDefaultPositionValueCurves(initialLeagueBudget?: number): PositionValueCurves {
  const budget = typeof initialLeagueBudget === 'number'
    && Number.isFinite(initialLeagueBudget)
    && initialLeagueBudget >= 0
    ? initialLeagueBudget
    : DEFAULT_INITIAL_LEAGUE_FAAB;
  return Object.fromEntries(CUSTOM_RANKING_POSITIONS.map((position) => {
    const percentages = POSITION_CURVE_PERCENTAGES[position];
    return [position, {
      maxValue: Math.max(0, Math.round(budget * percentages.maxValue)),
      step: Math.max(0, Math.round(budget * percentages.step)),
    }];
  })) as PositionValueCurves;
}

export const DEFAULT_POSITION_VALUE_CURVES: PositionValueCurves = createDefaultPositionValueCurves();

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

export function cloneDefaultPositionValueCurves(initialLeagueBudget?: number): PositionValueCurves {
  return createDefaultPositionValueCurves(initialLeagueBudget);
}

export function createDefaultCustomRankingConfig(
  baseRankingSource: WaiverRankingSource = 'sleeper',
  initialLeagueBudget?: number,
): CustomRankingConfig {
  return {
    name: '',
    baseRankingSource,
    mode: 'built-in',
    baseStrategy: 'max-vorp',
    multiplier: 1,
    modifier: 0,
    positionCurves: cloneDefaultPositionValueCurves(initialLeagueBudget),
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
  const rank = Number.isFinite(positionRank) ? Math.floor(positionRank) : 0;
  if (rank < 1) return 0;
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

function positiveWholeRank(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rank = Math.floor(value);
  return rank >= 1 ? rank : null;
}

function finiteSourceValue(value: number): number {
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

/**
 * Freeze a unique 1..N ordinal for every supported row in each position. Valid selected-source
 * position ranks stay first. Duplicate ranks are intentionally untied, and missing/zero ranks go
 * last using source rank/value/name/ID tie-breaks so input iteration order can never affect value.
 */
export function buildPositionCurveOrdinals(
  rows: readonly WaiverPlayerRow[],
): Map<string, number> {
  const ordinals = new Map<string, number>();
  for (const position of CUSTOM_RANKING_POSITIONS) {
    const positionRows = rows.filter((row) => row.position === position);
    positionRows.sort((a, b) => {
      const positionRankA = positiveWholeRank(a.posRank);
      const positionRankB = positiveWholeRank(b.posRank);
      if (positionRankA != null || positionRankB != null) {
        if (positionRankA == null) return 1;
        if (positionRankB == null) return -1;
        if (positionRankA !== positionRankB) return positionRankA - positionRankB;
      }

      const sourceRankA = positiveWholeRank(a.sourceRank);
      const sourceRankB = positiveWholeRank(b.sourceRank);
      if (sourceRankA != null || sourceRankB != null) {
        if (sourceRankA == null) return 1;
        if (sourceRankB == null) return -1;
        if (sourceRankA !== sourceRankB) return sourceRankA - sourceRankB;
      }

      return finiteSourceValue(b.sourceValue) - finiteSourceValue(a.sourceValue)
        || a.name.localeCompare(b.name)
        || a.playerId.localeCompare(b.playerId);
    });
    positionRows.forEach((row, index) => ordinals.set(row.playerId, index + 1));
  }
  return ordinals;
}

export function buildCustomRankingPlayers(
  rows: readonly WaiverPlayerRow[],
  config: CustomRankingConfig,
): Record<string, CustomRankingPlayerSnapshot> {
  const positionOrdinals = config.mode === 'position-curve'
    ? buildPositionCurveOrdinals(rows)
    : null;
  return Object.fromEntries([...rows]
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((row) => {
      const positionRank = positionOrdinals?.get(row.playerId) ?? row.posRank;
      return [row.playerId, {
        playerId: row.playerId,
        name: row.name,
        position: row.position,
        positionRank,
        sourceValue: row.sourceValue,
        ...(row.sourceRank == null ? {} : { sourceRank: row.sourceRank }),
        baselineValue: getGeneratedCustomValue({ ...row, posRank: positionRank }, config),
      }];
    }));
}

export function applyFrozenCustomRankingSnapshot(
  current: WaiverPlayerRow,
  snapshot: CustomRankingPlayerSnapshot,
): WaiverPlayerRow {
  return {
    ...current,
    posRank: snapshot.positionRank,
    sourceValue: snapshot.sourceValue,
    sourceRank: snapshot.sourceRank,
  };
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
