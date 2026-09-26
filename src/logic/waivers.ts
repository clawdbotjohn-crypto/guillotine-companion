// Waiver bid suggester — implements strategies from docs/REQUIREMENTS.md.
// All values are % of the league's FAAB budget, scaled to the detected budget.
// Ships 4 core strategies + predicted winning bid.

import type { League, Roster, SleeperUser } from '../api/types';
import type { RosPlayerProjection } from './projections';
import type { BidInfo, EliminationResult } from './elimination';

export type StrategyKey = 'safe' | 'aggressive' | 'weeks-starter' | 'vorp';

export interface BidSuggestion {
  strategy: StrategyKey;
  label: string;
  /** Suggested bid in league dollars. Null means the strategy is unavailable. */
  value: number | null;
  pctOfBudget: number | null;
  note?: string;
}

export interface RosteredPlayerOwner {
  rosterId: number;
  ownerName: string;
}

export interface WaiverPlayerRow {
  playerId: string;
  name: string;
  position: string;
  posRank: number;
  rosPoints: number;
  projectedPointsPerWeek: number;
  sourceValue: number;
  sourceRank?: number;
  starterWeeks: number;
  possibleStarterWeeks: number;
  suggestions: BidSuggestion[];
  predictedWinningBid: number;
}

export function getWeeksAsStarterBid(
  row: Pick<WaiverPlayerRow, 'suggestions'>,
): number | null {
  return row.suggestions.find((suggestion) => suggestion.strategy === 'weeks-starter')?.value ?? null;
}

export interface StarterPositionCounts {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  SUPER_FLEX: number;
}

// League-shape context needed by strategies
export interface LeagueContext {
  /** Initial league FAAB budget, not any roster's remaining balance. */
  budget: number;
  teamsRemaining: number;
  weeksRemaining: number;
  currentWeek: number;
  startersPerPos: StarterPositionCounts;
}

export interface OptimizedStarterPool {
  players: RosPlayerProjection[];
  requiredSlots: number;
  complete: boolean;
}

export interface VorpCalibration {
  replacementTeamCount: number;
  replacementPool: OptimizedStarterPool;
  championshipPool: OptimizedStarterPool;
  replacementByPosition: Map<string, number>;
  totalChampionshipVorp: number;
  averageChampionshipTeamVorp: number;
  dollarsPerVorp: number;
}

export interface BuildWaiverBoardOptions {
  maxPerPos?: number;
  /** Independent Sleeper ROS point projections used only by calibrated VoRP. */
  sleeperRosProjections?: Map<string, RosPlayerProjection>;
  replacementTeamCount?: number;
  vorpCalibration?: VorpCalibration | null;
}

const VORP_WEIGHTS: Record<string, number> = { QB: 0.75, RB: 1.0, WR: 1.0, TE: 0.25, K: 0.1, DEF: 0.1 };
const BASE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
const FLEX_POSITIONS = new Set(['RB', 'WR', 'TE']);
const SUPER_FLEX_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const FINAL_FOUR_TEAMS = 4;

/** Clamp a replacement-team target to the supported 4..max(4, surviving teams) range. */
export function normalizeReplacementTeamTarget(
  target: number | null | undefined,
  teamsRemaining: number,
): number {
  const max = Math.max(FINAL_FOUR_TEAMS, Math.floor(Number.isFinite(teamsRemaining) ? teamsRemaining : 0));
  if (target == null || !Number.isFinite(target)) return max;
  return Math.min(max, Math.max(FINAL_FOUR_TEAMS, Math.floor(target)));
}

export function getReplacementTeamBounds(teamsRemaining: number): {
  min: number;
  max: number;
  defaultValue: number;
} {
  const max = normalizeReplacementTeamTarget(undefined, teamsRemaining);
  return { min: FINAL_FOUR_TEAMS, max, defaultValue: max };
}

function compareProjection(a: RosPlayerProjection, b: RosPlayerProjection): number {
  return b.totalPoints - a.totalPoints || a.playerId.localeCompare(b.playerId);
}

/**
 * Build an optimized N-team starter pool from actual lineup slots. Base positional slots are
 * selected first, then one shared remaining-player FLEX pool, then one shared SUPER_FLEX pool.
 */
export function buildOptimizedStarterPool(
  projections: Map<string, RosPlayerProjection>,
  startersPerPos: StarterPositionCounts,
  teamCount: number,
): OptimizedStarterPool {
  const teams = Math.max(0, Math.floor(teamCount));
  const eligible = [...projections.values()]
    .filter((player) => BASE_POSITIONS.includes(player.position as typeof BASE_POSITIONS[number])
      && Number.isFinite(player.totalPoints))
    .sort(compareProjection);
  const selected: RosPlayerProjection[] = [];
  const selectedIds = new Set<string>();
  const add = (players: RosPlayerProjection[]) => {
    for (const player of players) {
      if (selectedIds.has(player.playerId)) continue;
      selectedIds.add(player.playerId);
      selected.push(player);
    }
  };

  for (const position of BASE_POSITIONS) {
    const slotCount = Math.max(0, startersPerPos[position]) * teams;
    add(eligible.filter((player) => player.position === position).slice(0, slotCount));
  }

  const selectShared = (positions: Set<string>, count: number) => {
    const remaining = eligible.filter((player) =>
      positions.has(player.position) && !selectedIds.has(player.playerId));
    add(remaining.slice(0, Math.max(0, count)));
  };
  selectShared(FLEX_POSITIONS, Math.max(0, startersPerPos.FLEX) * teams);
  selectShared(SUPER_FLEX_POSITIONS, Math.max(0, startersPerPos.SUPER_FLEX) * teams);

  selected.sort(compareProjection);
  const slotsPerTeam = BASE_POSITIONS.reduce(
    (sum, position) => sum + Math.max(0, startersPerPos[position]),
    Math.max(0, startersPerPos.FLEX) + Math.max(0, startersPerPos.SUPER_FLEX),
  );
  const requiredSlots = slotsPerTeam * teams;
  return { players: selected, requiredSlots, complete: selected.length === requiredSlots };
}

/** Last selected starter at each position in an already optimized pool. */
export function computeReplacementBaselines(pool: OptimizedStarterPool): Map<string, number> {
  const replacement = new Map<string, number>();
  for (const player of pool.players) {
    const current = replacement.get(player.position);
    if (current == null || player.totalPoints < current) {
      replacement.set(player.position, player.totalPoints);
    }
  }
  return replacement;
}

export function calculatePlayerVorp(
  player: RosPlayerProjection | undefined,
  replacementByPosition: Map<string, number>,
): number | null {
  if (!player || !Number.isFinite(player.totalPoints)) return null;
  const replacement = replacementByPosition.get(player.position);
  if (replacement == null || !Number.isFinite(replacement)) return null;
  return Math.max(0, player.totalPoints - replacement);
}

/** Correct FAAB conversion: budget / average championship-team VoRP, never its inverse. */
export function calculateDollarsPerVorp(
  initialLeagueFaab: number,
  averageChampionshipTeamVorp: number,
): number | null {
  if (!Number.isFinite(initialLeagueFaab) || initialLeagueFaab < 0
    || !Number.isFinite(averageChampionshipTeamVorp) || averageChampionshipTeamVorp <= 0) {
    return null;
  }
  return initialLeagueFaab / averageChampionshipTeamVorp;
}

export function calculateCalibratedVorpBid(
  playerVorp: number,
  initialLeagueFaab: number,
  averageChampionshipTeamVorp: number,
): number | null {
  const dollarsPerVorp = calculateDollarsPerVorp(initialLeagueFaab, averageChampionshipTeamVorp);
  if (dollarsPerVorp == null || !Number.isFinite(playerVorp) || playerVorp < 0) return null;
  return Math.round(playerVorp * dollarsPerVorp);
}

/**
 * Calibrate Sleeper ROS point-based VoRP to one full initial FAAB budget by valuing the optimized
 * final-four starter pool against the selected N-team replacement baselines.
 */
export function buildVorpCalibration(
  sleeperRosProjections: Map<string, RosPlayerProjection>,
  startersPerPos: StarterPositionCounts,
  replacementTeamCount: number,
  initialLeagueFaab: number,
): VorpCalibration | null {
  if (sleeperRosProjections.size === 0) return null;
  const replacementTeams = Math.max(FINAL_FOUR_TEAMS, Math.floor(replacementTeamCount));
  const replacementPool = buildOptimizedStarterPool(
    sleeperRosProjections,
    startersPerPos,
    replacementTeams,
  );
  const championshipPool = buildOptimizedStarterPool(
    sleeperRosProjections,
    startersPerPos,
    FINAL_FOUR_TEAMS,
  );
  if (!replacementPool.complete || !championshipPool.complete) return null;

  const replacementByPosition = computeReplacementBaselines(replacementPool);
  let totalChampionshipVorp = 0;
  for (const player of championshipPool.players) {
    const vorp = calculatePlayerVorp(player, replacementByPosition);
    if (vorp == null) return null;
    totalChampionshipVorp += vorp;
  }
  const averageChampionshipTeamVorp = totalChampionshipVorp / FINAL_FOUR_TEAMS;
  const dollarsPerVorp = calculateDollarsPerVorp(initialLeagueFaab, averageChampionshipTeamVorp);
  if (dollarsPerVorp == null) return null;

  return {
    replacementTeamCount: replacementTeams,
    replacementPool,
    championshipPool,
    replacementByPosition,
    totalChampionshipVorp,
    averageChampionshipTeamVorp,
    dollarsPerVorp,
  };
}

/** Base safe value on a $1000 budget: ~$200/starter, $250 top, QB 0.75x. */
function safeStrategy(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  const base1000 = 200;
  const weight = VORP_WEIGHTS[row.position] ?? 1.0;
  const startersAtPos = starterCountForPos(row.position, ctx);
  const totalStarterSlots = Math.max(1, startersAtPos * ctx.teamsRemaining);
  const premium = row.posRank <= 1 ? 1.25 : Math.max(0, 1.1 - (row.posRank / totalStarterSlots));
  return scale(base1000 * weight * premium, ctx.budget);
}

/** Estimate how many remaining guillotine weeks a player stays above the starter cutoff. */
function projectedStarterWeeks(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  const startersAtPos = starterCountForPos(row.position, ctx);
  const elimsPerWeek = ctx.teamsRemaining > 16 ? 2 : 1;
  let weeks = 0;
  let teams = ctx.teamsRemaining;
  for (let w = 0; w < ctx.weeksRemaining && teams > 1; w++) {
    if (row.posRank <= startersAtPos * teams) weeks++;
    teams = Math.max(1, teams - elimsPerWeek);
  }
  return weeks;
}

function weeksStarterStrategy(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  const weeks = projectedStarterWeeks(row, ctx);
  const frac = ctx.weeksRemaining > 0 ? weeks / ctx.weeksRemaining : 0;
  return Math.round(safeStrategy(row, ctx) * frac);
}

function starterCountForPos(pos: string, ctx: LeagueContext): number {
  const s = ctx.startersPerPos;
  switch (pos) {
    case 'QB': return s.QB + s.SUPER_FLEX;
    case 'RB': return s.RB + s.FLEX;
    case 'WR': return s.WR + s.FLEX;
    case 'TE': return s.TE + s.FLEX;
    default: return 1;
  }
}

function scale(value1000: number, budget: number): number {
  return Math.round((value1000 / 1000) * budget);
}

/** Market-deflation curve for a standard 17-week fantasy season. */
export function predictedBidMultiplier(currentWeek: number): number {
  const seasonProgress = Math.min(1, Math.max(0, (currentWeek - 1) / 16));
  return 2 * (1 - seasonProgress);
}

function predictWinningBid(modeledValue: number, currentWeek: number): number {
  return Math.round(modeledValue * predictedBidMultiplier(currentWeek));
}

export function calculateRemainingFaab(budget: number, roster: Roster | undefined): number | null {
  if (!roster) return null;
  return Math.max(0, budget - (roster.settings.waiver_budget_used ?? 0));
}

export function buildLeagueContext(
  league: League | undefined,
  elim: EliminationResult,
  projectionStartWeek?: number,
): LeagueContext {
  const budget = league?.settings?.waiver_budget ?? 1000;
  const rp = league?.roster_positions ?? [];
  const count = (p: string) => rp.filter((x) => x === p).length;
  const startersPerPos = {
    QB: count('QB'),
    RB: count('RB'),
    WR: count('WR'),
    TE: count('TE'),
    FLEX: count('FLEX') + count('WRRB_FLEX') + count('REC_FLEX'),
    SUPER_FLEX: count('SUPER_FLEX') + count('QB_FLEX'),
  };
  const teamsRemaining = elim.activeTeamCount > 0
    ? elim.activeTeamCount
    : (league?.total_rosters ?? 12);
  const currentWeek = projectionStartWeek ?? (elim.currentWeek || 1);
  const elimsPerWeek = teamsRemaining > 16 ? 2 : 1;
  const weeksToFinal = Math.max(1, Math.ceil((teamsRemaining - 1) / elimsPerWeek));
  const nflWeeksRemaining = Math.max(1, 19 - currentWeek);
  const weeksRemaining = Math.min(weeksToFinal, nflWeeksRemaining);
  return { budget, teamsRemaining, weeksRemaining, currentWeek, startersPerPos };
}

/** Rank available free agents using the selected display source and attach strategy suggestions. */
export function buildWaiverBoard(
  availablePlayerIds: string[],
  displayProjections: Map<string, RosPlayerProjection>,
  ctx: LeagueContext,
  _bids: BidInfo[],
  getName: (id: string) => string,
  opts: BuildWaiverBoardOptions = {},
): WaiverPlayerRow[] {
  const leagueWideRanks = computeLeagueWidePositionRanks(displayProjections);
  const sleeperRos = opts.sleeperRosProjections;
  const replacementTeamCount = normalizeReplacementTeamTarget(
    opts.replacementTeamCount,
    ctx.teamsRemaining,
  );
  const calibration = opts.vorpCalibration !== undefined
    ? opts.vorpCalibration
    : sleeperRos
      ? buildVorpCalibration(sleeperRos, ctx.startersPerPos, replacementTeamCount, ctx.budget)
      : null;

  const byPos = new Map<string, { playerId: string; rosPoints: number; pointsPerWeek: number }[]>();
  for (const pid of availablePlayerIds) {
    const projection = displayProjections.get(pid);
    if (!projection || !BASE_POSITIONS.includes(projection.position as typeof BASE_POSITIONS[number])) continue;
    const arr = byPos.get(projection.position) ?? [];
    arr.push({ playerId: pid, rosPoints: projection.totalPoints, pointsPerWeek: projection.pointsPerWeek });
    byPos.set(projection.position, arr);
  }

  const rows: WaiverPlayerRow[] = [];
  const maxPerPos = opts.maxPerPos ?? 12;
  for (const [pos, arr] of byPos.entries()) {
    arr.sort((a, b) => b.pointsPerWeek - a.pointsPerWeek || a.playerId.localeCompare(b.playerId));
    arr.slice(0, maxPerPos).forEach((p) => {
      const posRank = leagueWideRanks.get(p.playerId);
      if (posRank == null) return;
      const base = { position: pos, posRank };
      const safe = safeStrategy(base, ctx);
      const starterWeeks = projectedStarterWeeks(base, ctx);
      const weeks = weeksStarterStrategy(base, ctx);
      const predictedWinningBid = predictWinningBid(weeks, ctx.currentWeek);
      const playerVorp = calibration
        ? calculatePlayerVorp(sleeperRos?.get(p.playerId), calibration.replacementByPosition)
        : null;
      const vorp = playerVorp == null || !calibration
        ? null
        : Math.round(playerVorp * calibration.dollarsPerVorp);

      rows.push({
        playerId: p.playerId,
        name: getName(p.playerId),
        position: pos,
        posRank,
        rosPoints: p.rosPoints,
        projectedPointsPerWeek: p.pointsPerWeek,
        sourceValue: displayProjections.get(p.playerId)?.sourceValue ?? p.rosPoints,
        sourceRank: displayProjections.get(p.playerId)?.sourceRank,
        starterWeeks,
        possibleStarterWeeks: ctx.weeksRemaining,
        suggestions: [
          mk('weeks-starter', 'Weeks-as-Starter', weeks, ctx.budget),
          mk('safe', 'Safe', safe, ctx.budget),
          mk('aggressive', 'Aggressive', predictedWinningBid, ctx.budget),
          mk('vorp', 'VoRP', vorp, ctx.budget),
        ],
        predictedWinningBid,
      });
    });
  }
  return sortWaiverRowsByStrategy(rows, 'weeks-starter');
}

export function sortWaiverRowsByStrategy(
  rows: WaiverPlayerRow[],
  strategy: StrategyKey,
): WaiverPlayerRow[] {
  const valueFor = (row: WaiverPlayerRow) =>
    row.suggestions.find((suggestion) => suggestion.strategy === strategy)?.value ?? Number.NEGATIVE_INFINITY;
  return [...rows].sort(
    (a, b) => valueFor(b) - valueFor(a)
      || b.rosPoints - a.rosPoints
      || a.name.localeCompare(b.name),
  );
}

function mk(
  strategy: StrategyKey,
  label: string,
  value: number | null,
  budget: number,
): BidSuggestion {
  if (value == null || !Number.isFinite(value)) return { strategy, label, value: null, pctOfBudget: null };
  const normalized = Math.max(0, value);
  return {
    strategy,
    label,
    value: normalized,
    pctOfBudget: budget > 0 ? (normalized / budget) * 100 : 0,
  };
}

/** League-wide positional ranks from every player in the selected display source. */
function computeLeagueWidePositionRanks(
  projections: Map<string, RosPlayerProjection>,
): Map<string, number> {
  const byPos = new Map<string, { playerId: string; pointsPerWeek: number }[]>();
  for (const [playerId, projection] of projections.entries()) {
    if (!BASE_POSITIONS.includes(projection.position as typeof BASE_POSITIONS[number])) continue;
    const players = byPos.get(projection.position) ?? [];
    players.push({ playerId, pointsPerWeek: projection.pointsPerWeek });
    byPos.set(projection.position, players);
  }
  const ranks = new Map<string, number>();
  for (const players of byPos.values()) {
    players
      .sort((a, b) => b.pointsPerWeek - a.pointsPerWeek || a.playerId.localeCompare(b.playerId))
      .forEach((player, index) => ranks.set(player.playerId, index + 1));
  }
  return ranks;
}

/** Resolve current active-roster ownership for display without changing any valuation pool. */
export function computeRosteredPlayerOwners(
  rosters: Roster[],
  users: SleeperUser[],
  elim: EliminationResult,
): Map<string, RosteredPlayerOwner> {
  const namesByUserId = new Map(users.map((user) => [user.user_id, user.display_name]));
  const ownership = new Map<string, RosteredPlayerOwner>();
  for (const roster of rosters) {
    const info = elim.teams.get(roster.roster_id);
    if (info?.eliminatedWeek != null) continue;
    const ownerName = namesByUserId.get(roster.owner_id) || `Team ${roster.roster_id}`;
    for (const playerId of roster.players ?? []) {
      if (!playerId || playerId === '0') continue;
      ownership.set(playerId, { rosterId: roster.roster_id, ownerName });
    }
  }
  return ownership;
}

/** Determine which players are available (not rostered by any active team). */
export function computeAvailablePlayers(
  rosters: Roster[],
  projections: Map<string, RosPlayerProjection>,
  elim: EliminationResult,
): string[] {
  const rostered = new Set<string>();
  for (const r of rosters) {
    const info = elim.teams.get(r.roster_id);
    if (info?.eliminatedWeek != null) continue;
    (r.players ?? []).forEach((p) => rostered.add(p));
  }
  const avail: string[] = [];
  for (const [pid, projection] of projections.entries()) {
    if (!rostered.has(pid) && projection.totalPoints > 0) avail.push(pid);
  }
  return avail;
}
