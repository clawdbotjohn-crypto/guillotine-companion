import type { RosPlayerProjection } from '../src/logic/projections.ts';
import {
  buildMaxVorpCalibration,
  buildVorpCalibration,
  calculatePlayerVorp,
  type LeagueContext,
  type MaxVorpCalibration,
  type VorpCalibration,
} from '../src/logic/waivers.ts';
import { spearmanCorrelation } from './bidding-strategy-analysis.ts';

export type CommonHorizonFraction = 0.67 | 0.5 | 0.33;
export type HorizonRounding = 'ceil' | 'floor';

export interface OfflinePlayerValues {
  playerId: string;
  position: string;
  positionRank: number;
  totalPoints: number;
  pointsPerWeek: number;
  maxVorp: number;
  maxVorpStage: number | null;
  middleVorp: number;
  currentVorp: number;
  horizon67: number;
  horizon50Floor: number;
  horizon33: number;
  correctedSafe: number;
  correctedWeeksStarter: number;
  legacySafe: number | null;
  legacyWeeksStarter: number | null;
}

export interface DistributionSummary {
  n: number;
  positive: number;
  zero: number;
  min: number;
  p25: number;
  median: number;
  mean: number;
  p75: number;
  max: number;
  total: number;
}

interface AllocatablePlayer extends RosPlayerProjection {}
interface CorrectedNonVorpModel {
  positionRanks: Map<string, number>;
  currentSelectedCountByPosition: Map<string, number>;
  selectedIdsByStage: Set<string>[];
}

const BASE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
const FLEX_POSITIONS = ['RB', 'WR', 'TE'] as const;
const SUPER_FLEX_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
const VORP_WEIGHTS: Record<string, number> = { QB: 0.75, RB: 1, WR: 1, TE: 0.85 };

export function commonHorizonTeamCount(
  teamsRemaining: number,
  fraction: CommonHorizonFraction = 0.5,
  rounding: HorizonRounding = 'ceil',
): number {
  const teams = Math.max(0, Number.isFinite(teamsRemaining) ? teamsRemaining : 0);
  const rounded = rounding === 'ceil' ? Math.ceil(teams * fraction) : Math.floor(teams * fraction);
  return Math.max(4, Math.min(Math.floor(teams), rounded));
}

function bidForCalibration(player: RosPlayerProjection | undefined, calibration: VorpCalibration | null): number {
  if (!player || !calibration) return 0;
  const vorp = calculatePlayerVorp(player, calibration.replacementByPosition);
  return vorp == null ? 0 : Math.max(0, Math.round(vorp * calibration.dollarsPerVorp));
}

export function buildCommonHorizonCalibration(
  projections: Map<string, RosPlayerProjection>,
  ctx: LeagueContext,
  fraction: CommonHorizonFraction = 0.5,
  rounding: HorizonRounding = 'ceil',
): VorpCalibration | null {
  return buildVorpCalibration(
    projections,
    ctx.startersPerPos,
    commonHorizonTeamCount(ctx.teamsRemaining, fraction, rounding),
    ctx.budget,
  );
}

export function calculateCommonHorizonBid(
  player: RosPlayerProjection | undefined,
  calibration: VorpCalibration | null,
): number {
  return bidForCalibration(player, calibration);
}

function comparePpw(a: AllocatablePlayer, b: AllocatablePlayer): number {
  return b.pointsPerWeek - a.pointsPerWeek || a.playerId.localeCompare(b.playerId);
}

/** Analytical copy of PR #13 commit 7d86b2d's direct/FLEX/SUPER_FLEX allocation. */
function allocateOptimizedPool(
  eligiblePlayers: AllocatablePlayer[],
  ctx: LeagueContext,
  teamCount: number,
): AllocatablePlayer[] {
  const teams = Math.max(0, Math.floor(teamCount));
  const eligible = [...eligiblePlayers].sort(comparePpw);
  const selected: AllocatablePlayer[] = [];
  const selectedIds = new Set<string>();
  const add = (players: AllocatablePlayer[]) => {
    for (const player of players) {
      if (selectedIds.has(player.playerId)) continue;
      selectedIds.add(player.playerId);
      selected.push(player);
    }
  };
  for (const position of BASE_POSITIONS) {
    add(eligible.filter((player) => player.position === position)
      .slice(0, Math.max(0, ctx.startersPerPos[position]) * teams));
  }
  const selectShared = (positions: readonly string[], count: number) => {
    add(eligible.filter((player) => positions.includes(player.position) && !selectedIds.has(player.playerId)).slice(0, count));
  };
  selectShared(FLEX_POSITIONS, Math.max(0, ctx.startersPerPos.FLEX) * teams);
  selectShared(SUPER_FLEX_POSITIONS, Math.max(0, ctx.startersPerPos.SUPER_FLEX) * teams);
  return selected.sort(comparePpw);
}

function buildCorrectedNonVorpModel(
  projections: Map<string, RosPlayerProjection>,
  ctx: LeagueContext,
): CorrectedNonVorpModel {
  const eligible = [...projections.values()].filter((player) =>
    BASE_POSITIONS.includes(player.position as typeof BASE_POSITIONS[number])
    && Number.isFinite(player.pointsPerWeek)
    && player.pointsPerWeek > 0);
  const positionRanks = new Map<string, number>();
  const nextRank = new Map<string, number>();
  for (const player of [...eligible].sort(comparePpw)) {
    const rank = (nextRank.get(player.position) ?? 0) + 1;
    nextRank.set(player.position, rank);
    positionRanks.set(player.playerId, rank);
  }
  const currentSelectedCountByPosition = new Map<string, number>();
  for (const player of allocateOptimizedPool(eligible, ctx, ctx.teamsRemaining)) {
    currentSelectedCountByPosition.set(player.position, (currentSelectedCountByPosition.get(player.position) ?? 0) + 1);
  }
  const eliminationsPerWeek = ctx.teamsRemaining > 16 ? 2 : 1;
  const selectedIdsByStage: Set<string>[] = [];
  let teams = ctx.teamsRemaining;
  for (let week = 0; week < ctx.weeksRemaining && teams > 1; week += 1) {
    selectedIdsByStage.push(new Set(allocateOptimizedPool(eligible, ctx, teams).map((player) => player.playerId)));
    teams = Math.max(1, teams - eliminationsPerWeek);
  }
  return { positionRanks, currentSelectedCountByPosition, selectedIdsByStage };
}

export function correctedNonVorpValues(
  player: RosPlayerProjection,
  ctx: LeagueContext,
  model: CorrectedNonVorpModel,
): { positionRank: number; safe: number; starterWeeks: number; weeksStarter: number } {
  const positionRank = model.positionRanks.get(player.playerId) ?? 0;
  const replacementRank = model.currentSelectedCountByPosition.get(player.position) ?? 0;
  let premium = 0;
  if (replacementRank > 1 && positionRank > 0 && positionRank < replacementRank) {
    premium = positionRank === 1 ? 1.25 : 1.1 * (replacementRank - positionRank) / (replacementRank - 1);
  }
  const safe = Math.max(0, Math.round((200 * (VORP_WEIGHTS[player.position] ?? 1) * premium / 1000) * Math.max(0, ctx.budget)));
  const starterWeeks = model.selectedIdsByStage.reduce(
    (weeks, selected) => weeks + (selected.has(player.playerId) ? 1 : 0),
    0,
  );
  const fraction = ctx.weeksRemaining > 0 ? starterWeeks / ctx.weeksRemaining : 0;
  return { positionRank, safe, starterWeeks, weeksStarter: Math.max(0, Math.round(safe * fraction)) };
}

export function buildOfflinePlayerValues(
  projections: Map<string, RosPlayerProjection>,
  ctx: LeagueContext,
  legacyByPlayer?: Map<string, { safe: number | null; weeksStarter: number | null }>,
): OfflinePlayerValues[] {
  const max = buildMaxVorpCalibration(projections, ctx.startersPerPos, ctx.teamsRemaining, ctx.budget);
  const current = buildVorpCalibration(projections, ctx.startersPerPos, ctx.teamsRemaining, ctx.budget);
  const middle = buildCommonHorizonCalibration(projections, ctx, 0.5, 'ceil');
  const floor = buildCommonHorizonCalibration(projections, ctx, 0.5, 'floor');
  const h67 = buildCommonHorizonCalibration(projections, ctx, 0.67, 'ceil');
  const h33 = buildCommonHorizonCalibration(projections, ctx, 0.33, 'ceil');
  const correctedModel = buildCorrectedNonVorpModel(projections, ctx);
  return [...projections.values()]
    .filter((player) => BASE_POSITIONS.includes(player.position as typeof BASE_POSITIONS[number]))
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((player) => {
      const maxValue = max?.playerValues.get(player.playerId);
      const corrected = correctedNonVorpValues(player, ctx, correctedModel);
      const legacy = legacyByPlayer?.get(player.playerId);
      return {
        playerId: player.playerId,
        position: player.position,
        positionRank: corrected.positionRank,
        totalPoints: player.totalPoints,
        pointsPerWeek: player.pointsPerWeek,
        maxVorp: maxValue?.bid ?? 0,
        maxVorpStage: maxValue?.teamCount ?? null,
        middleVorp: bidForCalibration(player, middle),
        currentVorp: bidForCalibration(player, current),
        horizon67: bidForCalibration(player, h67),
        horizon50Floor: bidForCalibration(player, floor),
        horizon33: bidForCalibration(player, h33),
        correctedSafe: corrected.safe,
        correctedWeeksStarter: corrected.weeksStarter,
        legacySafe: legacy?.safe ?? null,
        legacyWeeksStarter: legacy?.weeksStarter ?? null,
      };
    });
}

function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function summarizeDistribution(values: number[]): DistributionSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    n: sorted.length,
    positive: sorted.filter((value) => value > 0).length,
    zero: sorted.filter((value) => value === 0).length,
    min: sorted[0] ?? 0,
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    mean: sorted.length ? total / sorted.length : 0,
    p75: quantile(sorted, 0.75),
    max: sorted.at(-1) ?? 0,
    total,
  };
}

export function rankCorrelation(
  rows: OfflinePlayerValues[],
  left: keyof OfflinePlayerValues,
  right: keyof OfflinePlayerValues,
): number | null {
  const pairs = rows.filter((row) => typeof row[left] === 'number' && typeof row[right] === 'number');
  return spearmanCorrelation(
    pairs.map((row) => row[left] as number),
    pairs.map((row) => row[right] as number),
  );
}

export function maxVorpCalibrationFor(
  projections: Map<string, RosPlayerProjection>,
  ctx: LeagueContext,
): MaxVorpCalibration | null {
  return buildMaxVorpCalibration(projections, ctx.startersPerPos, ctx.teamsRemaining, ctx.budget);
}
