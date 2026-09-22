// Waiver bid suggester — implements strategies from docs/REQUIREMENTS.md.
// All values are % of the league's FAAB budget, scaled to the detected budget.
// Ships 4 core strategies + predicted winning bid + budget floor.

import type { League, Roster } from '../api/types';
import type { RosPlayerProjection } from './projections';
import type { BidInfo, EliminationResult } from './elimination';

export type StrategyKey = 'safe' | 'exponential' | 'weeks-starter' | 'vorp';

export interface BidSuggestion {
  strategy: StrategyKey;
  label: string;
  value: number; // suggested bid in $ (scaled to budget)
  pctOfBudget: number;
  note?: string;
}

export interface WaiverPlayerRow {
  playerId: string;
  name: string;
  position: string;
  posRank: number; // league-wide rank at that position (by Sleeper ROS projection)
  rosPoints: number;
  projectedPointsPerWeek: number;
  sourceValue: number;
  starterWeeks: number;
  possibleStarterWeeks: number;
  suggestions: BidSuggestion[];
  predictedWinningBid: number;
  predictedConfidence: 'low' | 'medium' | 'high';
}

// League-shape context needed by strategies
export interface LeagueContext {
  budget: number;
  teamsRemaining: number;
  weeksRemaining: number; // rough estimate to final
  currentWeek: number;
  startersPerPos: { QB: number; RB: number; WR: number; TE: number; FLEX: number; SUPER_FLEX: number };
}

const VORP_WEIGHTS: Record<string, number> = { QB: 0.75, RB: 1.0, WR: 1.0, TE: 0.25, K: 0.1, DEF: 0.1 };

/** Base safe value on a $1000 budget: ~$200/starter, $250 top, QB 0.75x. Scale to budget. */
function safeStrategy(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  const base1000 = 200; // per-starter baseline
  const weight = VORP_WEIGHTS[row.position] ?? 1.0;
  // Rank premium: #1 at position gets ~25% premium, decays toward last starter
  const startersAtPos = starterCountForPos(row.position, ctx);
  const totalStarterSlots = Math.max(1, startersAtPos * ctx.teamsRemaining);
  const premium = row.posRank <= 1 ? 1.25 : Math.max(0, 1.1 - (row.posRank / totalStarterSlots));
  const value1000 = base1000 * weight * premium;
  return scale(value1000, ctx.budget);
}

/** Exponential: front-load. Up to 1/2 budget for a starter in first 8 wks, then 1/4, 1/8. */
function exponentialStrategy(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  if ((VORP_WEIGHTS[row.position] ?? 0) < 0.5) return 0; // starters only
  let cap: number;
  if (ctx.currentWeek <= 8) cap = ctx.budget * 0.5;
  else if (ctx.currentWeek <= 12) cap = ctx.budget * 0.25;
  else cap = ctx.budget * 0.125;
  // Only spend near cap for elite (top ~5) options
  const eliteFactor = Math.max(0.3, 1 - (row.posRank - 1) * 0.12);
  return Math.round(cap * eliteFactor);
}

/** Estimate how many remaining guillotine weeks a player stays above the starter cutoff. */
function projectedStarterWeeks(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  const startersAtPos = starterCountForPos(row.position, ctx);
  // Include the two-team championship week. A positional #1 remains a starter for every
  // possible week; stopping at teams > 2 incorrectly discounted the best player.
  const elimsPerWeek = ctx.teamsRemaining > 16 ? 2 : 1;
  let weeks = 0;
  let teams = ctx.teamsRemaining;
  for (let w = 0; w < ctx.weeksRemaining && teams > 1; w++) {
    const starterCutoff = startersAtPos * teams;
    if (row.posRank <= starterCutoff) weeks++;
    teams = Math.max(1, teams - elimsPerWeek);
  }
  return weeks;
}

/** Weeks-as-starter: value scales with how many remaining weeks the player would start. */
function weeksStarterStrategy(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  const weeks = projectedStarterWeeks(row, ctx);
  const frac = ctx.weeksRemaining > 0 ? weeks / ctx.weeksRemaining : 0;
  // Scale: full-season starter equals safe value; fewer weeks discounts proportionally.
  return Math.round(safeStrategy(row, ctx) * frac);
}

/** VoRP: bid = projected weekly ROS value above replacement × multiplier, floored at 0. */
function vorpStrategy(
  row: { position: string; projectedPointsPerWeek: number },
  replacementByPos: Map<string, number>,
  ctx: LeagueContext,
): number {
  const replacement = replacementByPos.get(row.position) ?? 0;
  const vorp = Math.max(0, row.projectedPointsPerWeek - replacement);
  // Multiplier chosen so a ~5 projected pt/wk edge at RB ~= $150 on $1000
  const mult = scale(30, ctx.budget); // $ per weekly VoRP point
  return Math.round(vorp * mult);
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

/**
 * Market-deflation curve for a standard 17-week fantasy season.
 * Multiplier = 2 × season fraction remaining, giving exact anchors:
 * Week 1 = 2x, Week 9 = 1x, Week 13 = 0.5x, Week 15 = 0.25x, Week 17 = 0x.
 */
export function predictedBidMultiplier(currentWeek: number): number {
  const seasonProgress = Math.min(1, Math.max(0, (currentWeek - 1) / 16));
  return 2 * (1 - seasonProgress);
}

function predictWinningBid(
  modeledValue: number,
  currentWeek: number,
): { value: number; confidence: 'low' | 'medium' | 'high' } {
  return {
    value: Math.round(modeledValue * predictedBidMultiplier(currentWeek)),
    confidence: 'medium',
  };
}

/** Remaining FAAB for the selected roster, based on the league budget and Sleeper spend. */
export function calculateRemainingFaab(budget: number, roster: Roster | undefined): number | null {
  if (!roster) return null;
  return Math.max(0, budget - (roster.settings.waiver_budget_used ?? 0));
}

/** Apply a user budget floor: never let a suggestion drop remaining below the floor. */
export function applyBudgetFloor(value: number, remaining: number, floor: number): number {
  const spendable = Math.max(0, remaining - floor);
  return Math.min(value, spendable);
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
  const teamsRemaining = elim.weeks[elim.weeks.length - 1]?.teamsRemaining
    ?? league?.total_rosters ?? 12;
  const currentWeek = projectionStartWeek ?? (elim.currentWeek || 1);
  // Do not estimate value beyond either the guillotine final or Sleeper's week-18 projections.
  const elimsPerWeek = teamsRemaining > 16 ? 2 : 1;
  const weeksToFinal = Math.max(1, Math.ceil((teamsRemaining - 1) / elimsPerWeek));
  const nflWeeksRemaining = Math.max(1, 19 - currentWeek);
  const weeksRemaining = Math.min(weeksToFinal, nflWeeksRemaining);
  return { budget, teamsRemaining, weeksRemaining, currentWeek, startersPerPos };
}

/**
 * Rank available free agents by position and build suggestions for each strategy.
 * `available` are player IDs not currently rostered by any active team.
 */
export function buildWaiverBoard(
  availablePlayerIds: string[],
  projections: Map<string, RosPlayerProjection>,
  ctx: LeagueContext,
  _bids: BidInfo[],
  getName: (id: string) => string,
  opts?: { budgetFloor?: number; remaining?: number; maxPerPos?: number },
): WaiverPlayerRow[] {
  // Rank against every projected player before filtering for availability. Availability
  // determines which rows are shown, never the Sleeper ROS rank/value basis.
  const leagueWideRanks = computeLeagueWidePositionRanks(projections);

  // Replacement level per position = projected weekly value of the first player past the last starter.
  const replacementByPos = computeReplacementLevels(projections, ctx);

  // Group available by position
  const byPos = new Map<string, { playerId: string; rosPoints: number; pointsPerWeek: number }[]>();
  for (const pid of availablePlayerIds) {
    const projection = projections.get(pid);
    if (!projection) continue;
    if (!['QB', 'RB', 'WR', 'TE'].includes(projection.position)) continue; // ignore K/DEF per spec
    const arr = byPos.get(projection.position) ?? [];
    arr.push({
      playerId: pid,
      rosPoints: projection.totalPoints,
      pointsPerWeek: projection.pointsPerWeek,
    });
    byPos.set(projection.position, arr);
  }

  const rows: WaiverPlayerRow[] = [];
  const maxPerPos = opts?.maxPerPos ?? 12;
  for (const [pos, arr] of byPos.entries()) {
    arr.sort((a, b) => b.pointsPerWeek - a.pointsPerWeek || a.playerId.localeCompare(b.playerId));
    arr.slice(0, maxPerPos).forEach((p) => {
      const posRank = leagueWideRanks.get(p.playerId);
      if (posRank == null) return;
      const base = { position: pos, posRank, projectedPointsPerWeek: p.pointsPerWeek };
      const safe = safeStrategy(base, ctx);
      const exp = exponentialStrategy(base, ctx);
      const starterWeeks = projectedStarterWeeks(base, ctx);
      const weeks = weeksStarterStrategy(base, ctx);
      const vorp = vorpStrategy(base, replacementByPos, ctx);
      const pred = predictWinningBid(weeks, ctx.currentWeek);

      const clamp = (v: number) =>
        opts?.budgetFloor != null && opts?.remaining != null
          ? applyBudgetFloor(v, opts.remaining, opts.budgetFloor)
          : v;

      const suggestions: BidSuggestion[] = [
        mk('safe', 'Safe', clamp(safe), ctx.budget),
        mk('exponential', 'Exp. Starter', clamp(exp), ctx.budget),
        mk('weeks-starter', 'Weeks-as-Starter', clamp(weeks), ctx.budget),
        mk('vorp', 'VoRP', clamp(vorp), ctx.budget),
      ];

      rows.push({
        playerId: p.playerId,
        name: getName(p.playerId),
        position: pos,
        posRank,
        rosPoints: p.rosPoints,
        projectedPointsPerWeek: p.pointsPerWeek,
        sourceValue: projections.get(p.playerId)?.sourceValue ?? p.rosPoints,
        starterWeeks,
        possibleStarterWeeks: ctx.weeksRemaining,
        suggestions,
        predictedWinningBid: pred.value,
        predictedConfidence: pred.confidence,
      });
    });
  }
  return sortWaiverRowsByStrategy(rows, 'safe');
}

/** Return a copy sorted by the strategy currently displayed in the Waivers UI. */
export function sortWaiverRowsByStrategy(
  rows: WaiverPlayerRow[],
  strategy: StrategyKey,
): WaiverPlayerRow[] {
  const valueFor = (row: WaiverPlayerRow) =>
    row.suggestions.find((suggestion) => suggestion.strategy === strategy)?.value ?? 0;
  return [...rows].sort(
    (a, b) => valueFor(b) - valueFor(a)
      || b.rosPoints - a.rosPoints
      || a.name.localeCompare(b.name),
  );
}

function mk(strategy: StrategyKey, label: string, value: number, budget: number): BidSuggestion {
  return { strategy, label, value: Math.max(0, value), pctOfBudget: budget > 0 ? (value / budget) * 100 : 0 };
}

/** League-wide positional ranks from every player's Sleeper ROS projection. */
function computeLeagueWidePositionRanks(
  projections: Map<string, RosPlayerProjection>,
): Map<string, number> {
  const byPos = new Map<string, { playerId: string; pointsPerWeek: number }[]>();
  for (const [playerId, projection] of projections.entries()) {
    if (!['QB', 'RB', 'WR', 'TE'].includes(projection.position)) continue;
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

/** Replacement level: projected weekly ROS value of the first player past the startable pool. */
function computeReplacementLevels(
  projections: Map<string, RosPlayerProjection>,
  ctx: LeagueContext,
): Map<string, number> {
  const out = new Map<string, number>();
  const byPos = new Map<string, number[]>();
  for (const projection of projections.values()) {
    if (!['QB', 'RB', 'WR', 'TE'].includes(projection.position)) continue;
    const arr = byPos.get(projection.position) ?? [];
    arr.push(projection.pointsPerWeek);
    byPos.set(projection.position, arr);
  }
  for (const [pos, arr] of byPos.entries()) {
    arr.sort((a, b) => b - a);
    let starters = 1;
    if (pos === 'QB') starters = (ctx.startersPerPos.QB + ctx.startersPerPos.SUPER_FLEX) * ctx.teamsRemaining;
    else if (pos === 'RB') starters = (ctx.startersPerPos.RB + ctx.startersPerPos.FLEX) * ctx.teamsRemaining;
    else if (pos === 'WR') starters = (ctx.startersPerPos.WR + ctx.startersPerPos.FLEX) * ctx.teamsRemaining;
    else if (pos === 'TE') starters = (ctx.startersPerPos.TE + ctx.startersPerPos.FLEX) * ctx.teamsRemaining;
    const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(starters)));
    out.set(pos, arr[idx] ?? 0);
  }
  return out;
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
    if (info?.eliminatedWeek != null) continue; // eliminated teams' players are free
    (r.players ?? []).forEach((p) => rostered.add(p));
  }
  const avail: string[] = [];
  for (const [pid, projection] of projections.entries()) {
    if (!rostered.has(pid) && projection.totalPoints > 0) avail.push(pid);
  }
  return avail;
}
