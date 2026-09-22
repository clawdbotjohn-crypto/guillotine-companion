// Waiver bid suggester — implements strategies from docs/REQUIREMENTS.md.
// All values are % of the league's FAAB budget, scaled to the detected budget.
// Ships 4 core strategies + predicted winning bid + budget floor.

import type { League, Roster, Matchup } from '../api/types';
import type { PlayerSeason } from './analytics';
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
  posRank: number; // rank among available at that position (by season avg)
  avgPoints: number;
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
  const premium = row.posRank <= 1 ? 1.25 : Math.max(0.4, 1.1 - (row.posRank / totalStarterSlots));
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

/** Weeks-as-starter: value scales with how many remaining weeks the player would start. */
function weeksStarterStrategy(row: { posRank: number; position: string }, ctx: LeagueContext): number {
  const startersAtPos = starterCountForPos(row.position, ctx);
  // A player who is top (startersAtPos * teamsRemaining) is a starter now; as teams get
  // eliminated (1-2/wk), the required rank tightens. Estimate weeks he stays a starter.
  const elimsPerWeek = ctx.teamsRemaining > 16 ? 2 : 1;
  let weeks = 0;
  let teams = ctx.teamsRemaining;
  for (let w = 0; w < ctx.weeksRemaining && teams > 2; w++) {
    const starterCutoff = startersAtPos * teams;
    if (row.posRank <= starterCutoff) weeks++;
    teams -= elimsPerWeek;
  }
  const frac = ctx.weeksRemaining > 0 ? weeks / ctx.weeksRemaining : 0;
  // Scale: full-season starter ~= safe value; fewer weeks discounts proportionally
  return Math.round(safeStrategy(row, ctx) * frac);
}

/** VoRP: bid = VoRP × multiplier, floored at 0. Uses avg above replacement starter. */
function vorpStrategy(
  row: { position: string; avgPoints: number },
  replacementByPos: Map<string, number>,
  ctx: LeagueContext,
): number {
  const replacement = replacementByPos.get(row.position) ?? 0;
  const vorp = Math.max(0, row.avgPoints - replacement);
  // Multiplier chosen so a ~5 pt/wk edge at RB ~= $150 on $1000
  const mult = scale(30, ctx.budget); // $ per VoRP point
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
 * Predicted winning bid from historical bids in this league at the player's position.
 * Early weeks (little history): assume ~2x the safe value.
 */
function predictWinningBid(
  position: string,
  safeValue: number,
  bids: BidInfo[],
): { value: number; confidence: 'low' | 'medium' | 'high' } {
  const posBids = bids.filter((b) => b.position === position && b.amount > 0);
  if (posBids.length < 3) {
    return { value: Math.round(safeValue * 2), confidence: 'low' };
  }
  // Use the upper quartile of historical winning bids at this position
  const sorted = posBids.map((b) => b.amount).sort((a, b) => a - b);
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const confidence = posBids.length >= 10 ? 'high' : 'medium';
  return { value: Math.round(Math.max(q3, safeValue)), confidence };
}

/** Apply a user budget floor: never let a suggestion drop remaining below the floor. */
export function applyBudgetFloor(value: number, remaining: number, floor: number): number {
  const spendable = Math.max(0, remaining - floor);
  return Math.min(value, spendable);
}

export function buildLeagueContext(
  league: League | undefined,
  elim: EliminationResult,
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
  const currentWeek = elim.currentWeek || 1;
  // Rough: guillotine ends when 1 team left; weeks remaining ≈ teams to eliminate / rate
  const elimsPerWeek = teamsRemaining > 16 ? 2 : 1;
  const weeksRemaining = Math.max(1, Math.ceil((teamsRemaining - 1) / elimsPerWeek));
  return { budget, teamsRemaining, weeksRemaining, currentWeek, startersPerPos };
}

/**
 * Rank available free agents by position and build suggestions for each strategy.
 * `available` are player IDs not currently rostered by any active team.
 */
export function buildWaiverBoard(
  availablePlayerIds: string[],
  seasons: Map<string, PlayerSeason>,
  ctx: LeagueContext,
  bids: BidInfo[],
  getName: (id: string) => string,
  opts?: { budgetFloor?: number; remaining?: number; maxPerPos?: number },
): WaiverPlayerRow[] {
  // Replacement level per position = avg of the "first player past the last starter"
  const replacementByPos = computeReplacementLevels(seasons, ctx);

  // Group available by position
  const byPos = new Map<string, { playerId: string; avg: number }[]>();
  for (const pid of availablePlayerIds) {
    const s = seasons.get(pid);
    if (!s) continue;
    if (!['QB', 'RB', 'WR', 'TE'].includes(s.position)) continue; // ignore K/DEF per spec
    const arr = byPos.get(s.position) ?? [];
    arr.push({ playerId: pid, avg: s.avgPoints });
    byPos.set(s.position, arr);
  }

  const rows: WaiverPlayerRow[] = [];
  const maxPerPos = opts?.maxPerPos ?? 12;
  for (const [pos, arr] of byPos.entries()) {
    arr.sort((a, b) => b.avg - a.avg);
    arr.slice(0, maxPerPos).forEach((p, idx) => {
      const posRank = idx + 1;
      const base = { position: pos, posRank, avgPoints: p.avg };
      const safe = safeStrategy(base, ctx);
      const exp = exponentialStrategy(base, ctx);
      const weeks = weeksStarterStrategy(base, ctx);
      const vorp = vorpStrategy(base, replacementByPos, ctx);
      const pred = predictWinningBid(pos, safe, bids);

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
        avgPoints: p.avg,
        suggestions,
        predictedWinningBid: pred.value,
        predictedConfidence: pred.confidence,
      });
    });
  }
  // Sort board by best safe suggestion desc
  rows.sort((a, b) => (b.suggestions[0].value - a.suggestions[0].value));
  return rows;
}

function mk(strategy: StrategyKey, label: string, value: number, budget: number): BidSuggestion {
  return { strategy, label, value: Math.max(0, value), pctOfBudget: budget > 0 ? (value / budget) * 100 : 0 };
}

/** Replacement level: the season avg of the last "startable" player per position. */
function computeReplacementLevels(seasons: Map<string, PlayerSeason>, ctx: LeagueContext): Map<string, number> {
  const out = new Map<string, number>();
  const byPos = new Map<string, number[]>();
  for (const s of seasons.values()) {
    if (!['QB', 'RB', 'WR', 'TE'].includes(s.position)) continue;
    const arr = byPos.get(s.position) ?? [];
    arr.push(s.avgPoints);
    byPos.set(s.position, arr);
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
  seasons: Map<string, PlayerSeason>,
  elim: EliminationResult,
): string[] {
  const rostered = new Set<string>();
  for (const r of rosters) {
    const info = elim.teams.get(r.roster_id);
    if (info?.eliminatedWeek != null) continue; // eliminated teams' players are free
    (r.players ?? []).forEach((p) => rostered.add(p));
  }
  const avail: string[] = [];
  for (const [pid, s] of seasons.entries()) {
    if (!rostered.has(pid) && s.avgPoints > 0) avail.push(pid);
  }
  return avail;
}

// re-export type used above
export type { Matchup };
