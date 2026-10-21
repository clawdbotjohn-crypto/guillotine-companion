import type { TeamRisk } from './analytics';
import { parseLineupSlots, projectBestLineup, rankActiveTeams } from './analytics';
import type { Roster } from '../api/types';
import type { RosPlayerProjection, WeeklyScoredPlayer } from './projections';
import type { WaiverPlayerRow } from './waivers';
import { resolveStrategyBid } from './waiverStrategies';

const POSITION_PLAYER_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const STREAMING_POSITIONS = ['DEF', 'K'] as const;

export const MAX_POSITION_TARGETS_PER_DROP = 5;
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
 * Merit pricing starts at the current scenario's maximum, then steps down by lineup-gain band:
 * Danger: 1.5 Aggressive -> 1 Aggressive -> 1 Safe.
 * Warning: 1 Aggressive -> 1 Safe -> 0.5 Safe.
 * Safe: its existing cut-distance Safe multiplier -> 0.5 Safe -> 0.5 Safe (the floor).
 * The resulting class is intentionally absent: it affects ordering and the next round only.
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
    || b.scenarioWeeklyGain - a.scenarioWeeklyGain
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
  const availableRows = input.availableRows.filter((row) =>
    POSITION_PLAYER_POSITIONS.has(row.position));
  const maxRows = Math.min(5, Math.max(0, input.maxPositionDrops ?? 5));
  const dropQueue = buildStablePositionDropQueue(input, originalPlayers);

  for (const drop of dropQueue) {
    if (rows.filter((row) => row.kind === 'position').length >= maxRows) break;
    if (!scenarioPlayers.includes(drop.playerId)) continue;

    const before = classifyScenario(input, scenarioPlayers);
    const dropWeek = scoreFor(drop.playerId, input.weeklyProjections);
    const dropRos = rosFor(drop.playerId, input.rosProjections);
    const meritRecommendations = availableRows
      .filter((target) => !scenarioPlayers.includes(target.playerId)
        && scoreFor(target.playerId, input.weeklyProjections) > dropWeek
        && rosFor(target.playerId, input.rosProjections) > dropRos)
      .map((target): WeeklyBidRecommendation => {
        const scenarioRosterAfter = scenarioPlayers
          .filter((playerId) => playerId !== drop.playerId)
          .concat(target.playerId);
        const scenarioAfter = classifyScenario(input, scenarioRosterAfter);
        const scenarioWeeklyGain = scenarioAfter.projectedTotal - before.projectedTotal;
        const currentRosterAfter = originalPlayers
          .filter((playerId) => playerId !== drop.playerId)
          .concat(target.playerId);
        const standaloneAfter = classifyScenario(input, currentRosterAfter);
        const priced = theoreticalBid(
          target,
          before,
          scenarioWeeklyGain,
          input.eliminationsPerWeek,
        );
        return {
          target,
          dropPlayerId: drop.playerId,
          weeklyGain: standaloneAfter.projectedTotal - initialStanding.projectedTotal,
          scenarioWeeklyGain,
          rosGain: rosFor(target.playerId, input.rosProjections) - dropRos,
          beforeRisk: before.risk,
          afterRisk: scenarioAfter.risk,
          beforeRank: initialStanding.rank,
          afterRank: standaloneAfter.rank,
          theoreticalBid: priced.value,
          suggestedBid: priced.value,
          budgetCapApplied: false,
          opponentCapApplied: false,
          safeMultiplier: priced.safeMultiplier,
        };
      })
      // Positive ROS/raw-week upgrades that do no conditional-scenario lineup harm remain useful.
      .filter((recommendation) => recommendation.scenarioWeeklyGain >= 0)
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
    const current = scenarioPlayers
      .filter((playerId) => positionFor(input, playerId) === position)
      .sort((a, b) => scoreFor(a, input.weeklyProjections) - scoreFor(b, input.weeklyProjections)
        || a.localeCompare(b))[0];
    if (!current) continue;
    const bestId = input.availablePlayerIds
      .filter((playerId) => input.weeklyProjections.get(playerId)?.position === position)
      .sort((a, b) => scoreFor(b, input.weeklyProjections) - scoreFor(a, input.weeklyProjections)
        || a.localeCompare(b))[0];
    if (!bestId || scoreFor(bestId, input.weeklyProjections) <= scoreFor(current, input.weeklyProjections)) continue;
    const baseRow = input.availableRows.find((row) => row.playerId === bestId) ?? {
      playerId: bestId,
      name: bestId,
      position,
      posRank: 0,
      rosPoints: rosFor(bestId, input.rosProjections),
      projectedPointsPerWeek: scoreFor(bestId, input.weeklyProjections),
      sourceValue: rosFor(bestId, input.rosProjections),
      starterWeeks: 0,
      possibleStarterWeeks: 0,
      suggestions: [],
      predictedWinningBid: 0,
    };
    const standing = classifyScenario(input, scenarioPlayers);
    const standaloneAfter = classifyScenario(
      input,
      originalPlayers.filter((playerId) => playerId !== current).concat(bestId),
    );
    const standaloneWeeklyGain = standaloneAfter.projectedTotal - initialStanding.projectedTotal;
    rows.push({
      kind: 'streamer',
      dropPlayerId: current,
      dropPosition: position,
      scenarioBudgetBefore: scenarioBudget,
      recommendations: [{
        target: baseRow,
        dropPlayerId: current,
        weeklyGain: standaloneWeeklyGain,
        scenarioWeeklyGain: scoreFor(bestId, input.weeklyProjections) - scoreFor(current, input.weeklyProjections),
        rosGain: rosFor(bestId, input.rosProjections) - rosFor(current, input.rosProjections),
        beforeRisk: standing.risk,
        afterRisk: standing.risk,
        beforeRank: initialStanding.rank,
        afterRank: standaloneAfter.rank,
        theoreticalBid: 0,
        suggestedBid: 0,
        budgetCapApplied: false,
        opponentCapApplied: false,
        safeMultiplier: null,
      }],
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
