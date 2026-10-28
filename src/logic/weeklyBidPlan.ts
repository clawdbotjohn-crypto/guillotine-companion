import type { TeamRisk } from './analytics';
import { parseLineupSlots, projectBestLineup, rankActiveTeams } from './analytics';
import type { Roster } from '../api/types';
import { buildRosPositionRankMap, type RosPlayerProjection, type WeeklyScoredPlayer } from './projections';
import type { WaiverPlayerRow } from './waivers';
import { resolveStrategyBid } from './waiverStrategies';

const POSITION_PLAYER_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const STREAMING_POSITIONS = ['DEF', 'K'] as const;
const IMPACT_EPSILON = 1e-9;

export const MAX_POSITION_TARGETS_PER_DROP = 5;
export const MAX_STREAMER_TARGETS_PER_DROP = 5;
export const WEEKLY_LINEUP_GAIN_BANDS = {
  highMinimum: 10,
  midMinimum: 3,
} as const;

export type WeeklyLineupGainBand = 'high' | 'mid' | 'low';

export interface WeeklyBidPlanInput {
  selectedRosterId: number;
  rosters: readonly Roster[];
  activeRosterIds: ReadonlySet<number>;
  lineupPositions: readonly string[];
  weeklyProjections: ReadonlyMap<string, WeeklyScoredPlayer>;
  rosProjections: ReadonlyMap<string, RosPlayerProjection>;
  availableRows: readonly WaiverPlayerRow[];
  availablePlayerIds: readonly string[];
  initialBudget: number;
  eliminationsPerWeek: number;
  maxPositionDrops?: number;
  /** Same-source player values and current-stage positional baselines from existing VORP calibration. */
  valueByPlayerId?: ReadonlyMap<string, number>;
  replacementByPosition?: ReadonlyMap<string, number>;
}

export interface WeeklyBidRecommendation {
  target: WaiverPlayerRow;
  dropPlayerId: string;
  /** User-facing standalone gain from the actual current roster for this displayed transaction. */
  weeklyGain: number;
  /** Internal conditional-scenario gain used only for ordering and bid-band selection. */
  scenarioWeeklyGain: number;
  rosGain: number;
  /** Conditional planning posture; display impact always uses beforeRank/afterRank below. */
  beforeRisk: TeamRisk;
  afterRisk: TeamRisk;
  /** User-facing standalone rank transition from the actual current roster. */
  beforeRank: number;
  afterRank: number;
  theoreticalBid: number;
  suggestedBid: number;
  budgetCapApplied: boolean;
  opponentCapApplied: boolean;
  safeMultiplier: number | null;
}

export interface WeeklyBidDropRow {
  kind: 'position' | 'streamer';
  dropPlayerId: string;
  dropPosition: string;
  recommendations: WeeklyBidRecommendation[];
  scenarioBudgetBefore: number;
}

export interface WeeklyBidPlan {
  rows: WeeklyBidDropRow[];
  startingRisk: TeamRisk;
  startingRank: number;
  activeTeamCount: number;
  initialBudgetRemaining: number;
  richestOtherActiveBudget: number;
}

export interface StableDropCandidate {
  playerId: string;
  position: string;
  /** Raw, intentionally un-floored ROS VORP used only for internal drop ordering. */
  internalVorp: number;
  rosPoints: number;
  weeklyPoints: number;
}

export interface DurableSwapValue {
  /** Net position-adjusted change. Same-position fallback is raw because the baseline cancels. */
  gain: number;
  mode: 'position-adjusted-vorp' | 'same-position-fallback';
}

function remainingBudget(initialBudget: number, roster: Roster | undefined): number {
  if (!roster) return 0;
  return Math.max(0, initialBudget - (roster.settings.waiver_budget_used ?? 0));
}

function scoreFor(
  playerId: string,
  projections: ReadonlyMap<string, WeeklyScoredPlayer>,
): number {
  const score = projections.get(playerId)?.points;
  return Number.isFinite(score) ? score! : 0;
}

function rosFor(
  playerId: string,
  projections: ReadonlyMap<string, RosPlayerProjection>,
): number {
  const score = projections.get(playerId)?.totalPoints;
  return Number.isFinite(score) ? score! : 0;
}

function positionFor(input: WeeklyBidPlanInput, playerId: string): string | undefined {
  return input.weeklyProjections.get(playerId)?.position
    ?? input.rosProjections.get(playerId)?.position;
}

function finitePlayerValue(input: WeeklyBidPlanInput, playerId: string): number | null {
  if (input.valueByPlayerId) {
    const explicit = input.valueByPlayerId.get(playerId);
    return Number.isFinite(explicit) ? explicit! : null;
  }
  const ros = input.rosProjections.get(playerId)?.totalPoints;
  return Number.isFinite(ros) ? ros! : null;
}

/**
 * Compare durable values without mixing gross cross-position points with net VORP. When both
 * native-position baselines are present, the transaction delta is:
 *   (targetValue - targetReplacement) - (dropValue - dropReplacement).
 * If calibration is incomplete, only same-position swaps are comparable because the unknown
 * shared baseline cancels exactly. Cross-position swaps fail closed.
 */
export function durableSwapValue(
  input: WeeklyBidPlanInput,
  dropPlayerId: string,
  targetPlayerId: string,
): DurableSwapValue | null {
  const dropPosition = positionFor(input, dropPlayerId);
  const targetPosition = positionFor(input, targetPlayerId);
  const dropValue = finitePlayerValue(input, dropPlayerId);
  const targetValue = finitePlayerValue(input, targetPlayerId);
  if (!dropPosition || !targetPosition || dropValue == null || targetValue == null) return null;

  const dropReplacement = input.replacementByPosition?.get(dropPosition);
  const targetReplacement = input.replacementByPosition?.get(targetPosition);
  if (Number.isFinite(dropReplacement) && Number.isFinite(targetReplacement)) {
    return {
      gain: (targetValue - targetReplacement!) - (dropValue - dropReplacement!),
      mode: 'position-adjusted-vorp',
    };
  }
  if (dropPosition === targetPosition) {
    return { gain: targetValue - dropValue, mode: 'same-position-fallback' };
  }
  return null;
}

function classifyScenario(
  input: WeeklyBidPlanInput,
  selectedPlayerIds: readonly string[],
): { risk: TeamRisk; rank: number; outOf: number; projectedTotal: number } {
  const slots = parseLineupSlots([...input.lineupPositions]);
  let selectedProjectedTotal = 0;
  const standings = rankActiveTeams(
    input.rosters.map((roster) => {
      const projectedTotal = projectBestLineup(
        roster.roster_id === input.selectedRosterId
          ? [...selectedPlayerIds]
          : roster.players ?? [],
        input.weeklyProjections,
        slots,
      ).total;
      if (roster.roster_id === input.selectedRosterId) selectedProjectedTotal = projectedTotal;
      return {
        rosterId: roster.roster_id,
        value: projectedTotal,
        eliminated: !input.activeRosterIds.has(roster.roster_id),
      };
    }),
    input.eliminationsPerWeek,
  );
  const selected = standings.get(input.selectedRosterId);
  return selected
    ? { ...selected, projectedTotal: selectedProjectedTotal }
    : {
        risk: 'warning',
        rank: 0,
        outOf: input.activeRosterIds.size,
        projectedTotal: selectedProjectedTotal,
      };
}

/**
 * Stable original-roster drop queue. Same-source player values and current-stage positional
 * baselines from the existing VORP calibration supply scarcity context; mixing ROS-point and market-
 * value units would not. The internal subtraction deliberately does not floor negative VORP at zero:
 * a below-replacement player should sort ahead of a merely low-ROS player at a scarce position.
 * Raw ROS is the fallback when calibration is unavailable and the first tiebreaker, so temporary
 * weekly injuries/byes cannot outweigh season-long keep value. Scenario acquisitions are impossible
 * here because the queue is built once from originalPlayerIds.
 */
export function buildStablePositionDropQueue(
  input: WeeklyBidPlanInput,
  originalPlayerIds: readonly string[],
): StableDropCandidate[] {
  const candidates = originalPlayerIds
    .map((playerId) => {
      const position = positionFor(input, playerId);
      if (!position || !POSITION_PLAYER_POSITIONS.has(position)) return null;
      return {
        playerId,
        position,
        rosPoints: rosFor(playerId, input.rosProjections),
        weeklyPoints: scoreFor(playerId, input.weeklyProjections),
      };
    })
    .filter((candidate): candidate is Omit<StableDropCandidate, 'internalVorp'> => candidate != null);
  // Never compare calibrated net VORP for some players against gross ROS for others. A partial
  // calibration falls back to ROS for the entire stable queue.
  const useVorp = candidates.length > 0 && candidates.every(({ playerId, position }) =>
    Number.isFinite(input.valueByPlayerId?.get(playerId))
      && Number.isFinite(input.replacementByPosition?.get(position)));

  return candidates
    .map((candidate): StableDropCandidate => ({
      ...candidate,
      internalVorp: useVorp
        ? input.valueByPlayerId!.get(candidate.playerId)!
          - input.replacementByPosition!.get(candidate.position)!
        : candidate.rosPoints,
    }))
    .sort((a, b) => a.internalVorp - b.internalVorp
      || a.rosPoints - b.rosPoints
      || a.weeklyPoints - b.weeklyPoints
      || a.playerId.localeCompare(b.playerId));
}

/** Named/testable pragmatic V1 bands; league-normalized or VORP-derived calibration is deferred. */
export function classifyWeeklyLineupGain(gain: number): WeeklyLineupGainBand {
  if (gain >= WEEKLY_LINEUP_GAIN_BANDS.highMinimum) return 'high';
  if (gain >= WEEKLY_LINEUP_GAIN_BANDS.midMinimum) return 'mid';
  return 'low';
}

/** Preserve strictly-positive gains that would otherwise round to a misleading +0.0. */
export function formatWeeklyLineupGain(gain: number): string {
  if (gain > 0 && gain < 0.01) return '<+0.01 pts';
  if (gain > 0 && gain < 0.1) return `+${gain.toFixed(2)} pts`;
  return `${gain >= 0 ? '+' : ''}${gain.toFixed(1)} pts`;
}

/**
 * Safe bidding gets cheaper by cut-sized rank bands above the Warning boundary. The first full
 * safe band is 1.0x, followed by 0.1 reductions to the approved 0.5 floor.
 */
export function safeCutDistanceMultiplier(
  rank: number,
  outOf: number,
  eliminationsPerWeek: number,
): number {
  const flaggedWidth = Math.min(outOf, Math.max(4, Math.ceil(outOf / 3)));
  const firstSafeRank = outOf - flaggedWidth;
  const cutSize = Math.max(1, eliminationsPerWeek);
  const ranksIntoSafe = Math.max(0, firstSafeRank - rank);
  const additionalBands = Math.floor(ranksIntoSafe / cutSize);
  return Math.max(0.5, 1 - (0.1 * additionalBands));
}

/**
 * Merit pricing starts from the actual current roster's risk maximum, then steps down by standalone lineup-gain band:
 * Danger: 1.5 Aggressive -> 1 Aggressive -> 1 Safe.
 * Warning: 1 Aggressive -> 1 Safe -> 0.5 Safe.
 * Safe: its existing cut-distance Safe multiplier -> 0.5 Safe -> 0.5 Safe (the floor).
 * The resulting standalone class affects recommendation ordering, but assumed prior wins do not affect price.
 */
function theoreticalBid(
  row: WaiverPlayerRow,
  before: { risk: TeamRisk; rank: number; outOf: number },
  weeklyGain: number,
  eliminationsPerWeek: number,
): { value: number; safeMultiplier: number | null } {
  const safe = Math.max(0, resolveStrategyBid(row, 'safe') ?? 0);
  const aggressive = Math.max(0, resolveStrategyBid(row, 'aggressive') ?? 0);
  const band = classifyWeeklyLineupGain(weeklyGain);
  let value: number;
  let roundMaximum: number;
  let safeMultiplier: number | null = null;

  if (before.risk === 'at-risk') {
    roundMaximum = aggressive * 1.5;
    value = band === 'high' ? roundMaximum : band === 'mid' ? aggressive : safe;
  } else if (before.risk === 'warning') {
    roundMaximum = aggressive;
    value = band === 'high' ? aggressive : band === 'mid' ? safe : safe * 0.5;
  } else {
    safeMultiplier = safeCutDistanceMultiplier(
      before.rank,
      before.outOf,
      eliminationsPerWeek,
    );
    roundMaximum = safe * safeMultiplier;
    value = band === 'high' ? roundMaximum : safe * 0.5;
  }

  // A zero-lineup-gain recommendation is a bench/ROS upgrade and may never exceed 1x Safe.
  if (weeklyGain === 0) value = Math.min(value, safe);
  return { value: Math.round(Math.min(roundMaximum, value)), safeMultiplier };
}

function recommendationComparator(a: WeeklyBidRecommendation, b: WeeklyBidRecommendation): number {
  const transitionA = a.afterRisk === 'safe' ? 2 : a.afterRisk === 'warning' ? 1 : 0;
  const transitionB = b.afterRisk === 'safe' ? 2 : b.afterRisk === 'warning' ? 1 : 0;
  return transitionB - transitionA
    || b.weeklyGain - a.weeklyGain
    || b.rosGain - a.rosGain
    || a.target.playerId.localeCompare(b.target.playerId);
}

/** Build the advisory-only, sequential weekly scenario. No persistence or provider writes occur. */
export function buildWeeklyBidPlan(input: WeeklyBidPlanInput): WeeklyBidPlan | null {
  const selectedRoster = input.rosters.find((roster) => roster.roster_id === input.selectedRosterId);
  if (!selectedRoster || !input.activeRosterIds.has(input.selectedRosterId)
    || input.weeklyProjections.size === 0 || input.rosProjections.size === 0) return null;

  const originalPlayers = [...(selectedRoster.players ?? [])];
  let scenarioPlayers = [...originalPlayers];
  let scenarioBudget = remainingBudget(input.initialBudget, selectedRoster);
  const opponentBudgets = input.rosters
    .filter((roster) => roster.roster_id !== input.selectedRosterId
      && input.activeRosterIds.has(roster.roster_id))
    .map((roster) => remainingBudget(input.initialBudget, roster));
  const richestOtherActiveBudget = Math.max(0, ...opponentBudgets);
  const opponentHardCap = richestOtherActiveBudget + 1;
  const initialStanding = classifyScenario(input, scenarioPlayers);
  const rows: WeeklyBidDropRow[] = [];
  const earliestDisplayedBid = new Map<string, number>();
  const rosPositionRanks = buildRosPositionRankMap(input.rosProjections);
  const availableRows = input.availableRows.filter((row) =>
    POSITION_PLAYER_POSITIONS.has(row.position));
  const maxRows = Math.min(5, Math.max(0, input.maxPositionDrops ?? 5));
  const dropQueue = buildStablePositionDropQueue(input, originalPlayers);

  for (const drop of dropQueue) {
    if (rows.filter((row) => row.kind === 'position').length >= maxRows) break;
    if (!scenarioPlayers.includes(drop.playerId)) continue;

    const before = classifyScenario(input, scenarioPlayers);
    const meritRecommendations = availableRows
      .filter((target) => !originalPlayers.includes(target.playerId))
      .map((target): WeeklyBidRecommendation | null => {
        const durable = durableSwapValue(input, drop.playerId, target.playerId);
        // A displayed swap must preserve durable position-adjusted value. Requiring at least one
        // strict weekly/durable improvement below also avoids useless equal-for-equal cards.
        if (!durable || durable.gain < -IMPACT_EPSILON) return null;

        const currentRosterAfter = originalPlayers
          .filter((playerId) => playerId !== drop.playerId)
          .concat(target.playerId);
        const standaloneAfter = classifyScenario(input, currentRosterAfter);
        const weeklyGain = standaloneAfter.projectedTotal - initialStanding.projectedTotal;
        if (weeklyGain < -IMPACT_EPSILON || standaloneAfter.rank > initialStanding.rank) return null;
        if (weeklyGain <= IMPACT_EPSILON && durable.gain <= IMPACT_EPSILON) return null;

        const scenarioRosterAfter = scenarioPlayers
          .filter((playerId) => playerId !== drop.playerId && playerId !== target.playerId)
          .concat(target.playerId);
        const scenarioAfter = classifyScenario(input, scenarioRosterAfter);
        const scenarioWeeklyGain = scenarioAfter.projectedTotal - before.projectedTotal;
        // Merit and price are always standalone from the actual roster. The optimistic scenario is
        // retained only for sequential budget planning after this independently-safe card exists.
        const priced = theoreticalBid(
          target,
          initialStanding,
          Math.max(0, weeklyGain),
          input.eliminationsPerWeek,
        );
        return {
          target,
          dropPlayerId: drop.playerId,
          weeklyGain: Math.max(0, weeklyGain),
          scenarioWeeklyGain,
          rosGain: durable.gain,
          beforeRisk: initialStanding.risk,
          afterRisk: standaloneAfter.risk,
          beforeRank: initialStanding.rank,
          afterRank: standaloneAfter.rank,
          theoreticalBid: priced.value,
          suggestedBid: priced.value,
          budgetCapApplied: false,
          opponentCapApplied: false,
          safeMultiplier: priced.safeMultiplier,
        };
      })
      .filter((recommendation): recommendation is WeeklyBidRecommendation => recommendation != null)
      .sort(recommendationComparator)
      .slice(0, MAX_POSITION_TARGETS_PER_DROP);

    if (meritRecommendations.length === 0) continue;

    const recommendations = meritRecommendations.map((recommendation) => {
      const duplicateCap = earliestDisplayedBid.get(recommendation.target.playerId)
        ?? Number.POSITIVE_INFINITY;
      // Each target keeps its own strategy value. Only scenario budget, opponent budget, and the
      // same-player-across-rounds invariant may cap it; ordinal position within this group may not.
      const suggestedBid = Math.max(0, Math.min(
        recommendation.theoreticalBid,
        scenarioBudget,
        opponentHardCap,
        duplicateCap,
      ));
      const budgetCapApplied = suggestedBid < recommendation.theoreticalBid
        && scenarioBudget <= opponentHardCap
        && scenarioBudget <= duplicateCap;
      const opponentCapApplied = suggestedBid < recommendation.theoreticalBid
        && opponentHardCap < scenarioBudget
        && opponentHardCap <= duplicateCap;
      return {
        ...recommendation,
        suggestedBid,
        budgetCapApplied,
        opponentCapApplied,
      };
    });

    rows.push({
      kind: 'position',
      dropPlayerId: drop.playerId,
      dropPosition: drop.position,
      recommendations,
      scenarioBudgetBefore: scenarioBudget,
    });

    for (const recommendation of recommendations) {
      if (!earliestDisplayedBid.has(recommendation.target.playerId)) {
        earliestDisplayedBid.set(recommendation.target.playerId, recommendation.suggestedBid);
      }
    }

    // Re-optimize with the designated top-impact win, but reserve the costliest displayed
    // alternative. This conservative path keeps every one-win-per-drop combination feasible.
    const assumedWin = recommendations[0];
    const roundReservation = Math.max(0, ...recommendations.map((item) => item.suggestedBid));
    scenarioPlayers = scenarioPlayers
      .filter((playerId) => playerId !== drop.playerId)
      .concat(assumedWin.target.playerId);
    scenarioBudget = Math.max(0, scenarioBudget - roundReservation);
  }

  for (const position of STREAMING_POSITIONS) {
    const current = originalPlayers
      .filter((playerId) => positionFor(input, playerId) === position)
      .sort((a, b) => scoreFor(a, input.weeklyProjections) - scoreFor(b, input.weeklyProjections)
        || a.localeCompare(b))[0];
    if (!current) continue;

    const currentProjection = scoreFor(current, input.weeklyProjections);
    const improvingCandidates = [...new Set(input.availablePlayerIds)]
      .filter((playerId) => input.weeklyProjections.get(playerId)?.position === position
        && scoreFor(playerId, input.weeklyProjections) > currentProjection)
      .sort((a, b) => scoreFor(b, input.weeklyProjections) - scoreFor(a, input.weeklyProjections)
        || a.localeCompare(b));
    const targetLimit = Math.min(
      MAX_STREAMER_TARGETS_PER_DROP,
      initialStanding.outOf,
      improvingCandidates.length,
    );
    const improvingIds = improvingCandidates.slice(0, targetLimit);
    if (improvingIds.length === 0) continue;

    const recommendations = improvingIds.map((targetId): WeeklyBidRecommendation => {
      const existingTarget = input.availableRows.find((row) => row.playerId === targetId);
      const target: WaiverPlayerRow = {
        ...(existingTarget ?? {
          playerId: targetId,
          name: targetId,
          position,
          rosPoints: rosFor(targetId, input.rosProjections),
          projectedPointsPerWeek: scoreFor(targetId, input.weeklyProjections),
          sourceValue: rosFor(targetId, input.rosProjections),
          starterWeeks: 0,
          possibleStarterWeeks: 0,
          suggestions: [],
          predictedWinningBid: 0,
        }),
        posRank: rosPositionRanks.get(targetId) ?? existingTarget?.posRank ?? 0,
      };
      const standaloneAfter = classifyScenario(
        input,
        originalPlayers.filter((playerId) => playerId !== current).concat(targetId),
      );
      return {
        target,
        dropPlayerId: current,
        weeklyGain: standaloneAfter.projectedTotal - initialStanding.projectedTotal,
        scenarioWeeklyGain: scoreFor(targetId, input.weeklyProjections) - currentProjection,
        rosGain: rosFor(targetId, input.rosProjections) - rosFor(current, input.rosProjections),
        beforeRisk: initialStanding.risk,
        afterRisk: standaloneAfter.risk,
        beforeRank: initialStanding.rank,
        afterRank: standaloneAfter.rank,
        theoreticalBid: 0,
        suggestedBid: 0,
        budgetCapApplied: false,
        opponentCapApplied: false,
        safeMultiplier: null,
      };
    });
    const independentlySafe = recommendations.filter((recommendation) =>
      recommendation.weeklyGain >= -IMPACT_EPSILON
      && recommendation.afterRank <= recommendation.beforeRank);
    if (independentlySafe.length === 0) continue;
    rows.push({
      kind: 'streamer',
      dropPlayerId: current,
      dropPosition: position,
      scenarioBudgetBefore: scenarioBudget,
      recommendations: independentlySafe,
    });
  }

  return {
    rows,
    startingRisk: initialStanding.risk,
    startingRank: initialStanding.rank,
    activeTeamCount: initialStanding.outOf,
    initialBudgetRemaining: remainingBudget(input.initialBudget, selectedRoster),
    richestOtherActiveBudget,
  };
}

export function isFinalBiddingRound(
  settings: Record<string, number> | undefined,
  currentWeek: number,
  teamsRemaining: number,
  finalTeamCount = 2,
): boolean {
  const explicit = settings?.waiver_last_week ?? settings?.last_waiver_week
    ?? settings?.waiver_final_week;
  if (Number.isFinite(explicit)) return currentWeek === explicit;
  return teamsRemaining - Math.max(1, teamsRemaining > 16 ? 2 : 1) <= finalTeamCount;
}

export function shouldShowWeeklyBidPlan(input: {
  leagueStatus: string | undefined;
  liveScoringActive: boolean;
  playingWeek: number | null;
}): boolean {
  return input.leagueStatus === 'in_season'
    && input.playingWeek != null
    && !input.liveScoringActive;
}
