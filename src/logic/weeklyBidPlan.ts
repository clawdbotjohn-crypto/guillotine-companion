import type { TeamRisk } from './analytics';
import { parseLineupSlots, projectBestLineup, rankActiveTeams } from './analytics';
import type { Roster } from '../api/types';
import type { RosPlayerProjection, WeeklyScoredPlayer } from './projections';
import type { WaiverPlayerRow } from './waivers';
import { resolveStrategyBid } from './waiverStrategies';

const POSITION_PLAYER_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const STREAMING_POSITIONS = ['DEF', 'K'] as const;

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
}

export interface WeeklyBidRecommendation {
  target: WaiverPlayerRow;
  dropPlayerId: string;
  weeklyGain: number;
  rosGain: number;
  beforeRisk: TeamRisk;
  afterRisk: TeamRisk;
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

function remainingBudget(initialBudget: number, roster: Roster | undefined): number {
  return Math.max(0, initialBudget - (roster?.settings.waiver_budget_used ?? initialBudget));
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

function classifyScenario(
  input: WeeklyBidPlanInput,
  selectedPlayerIds: readonly string[],
): { risk: TeamRisk; rank: number; outOf: number } {
  const slots = parseLineupSlots([...input.lineupPositions]);
  const standings = rankActiveTeams(
    input.rosters.map((roster) => ({
      rosterId: roster.roster_id,
      value: projectBestLineup(
        roster.roster_id === input.selectedRosterId
          ? [...selectedPlayerIds]
          : roster.players ?? [],
        input.weeklyProjections,
        slots,
      ).total,
      eliminated: !input.activeRosterIds.has(roster.roster_id),
    })),
    input.eliminationsPerWeek,
  );
  const selected = standings.get(input.selectedRosterId);
  return selected ?? { risk: 'warning', rank: 0, outOf: input.activeRosterIds.size };
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

function theoreticalBid(
  row: WaiverPlayerRow,
  before: { risk: TeamRisk; rank: number; outOf: number },
  after: { risk: TeamRisk },
  eliminationsPerWeek: number,
): { value: number; safeMultiplier: number | null } {
  const safe = Math.max(0, resolveStrategyBid(row, 'safe') ?? 0);
  const aggressive = Math.max(0, resolveStrategyBid(row, 'aggressive') ?? 0);
  if (before.risk === 'at-risk') {
    return {
      value: Math.round(after.risk === 'at-risk' ? aggressive : aggressive * 1.5),
      safeMultiplier: null,
    };
  }
  if (before.risk === 'warning') {
    return { value: after.risk === 'safe' ? aggressive : safe, safeMultiplier: null };
  }
  const multiplier = safeCutDistanceMultiplier(
    before.rank,
    before.outOf,
    eliminationsPerWeek,
  );
  return { value: Math.round(safe * multiplier), safeMultiplier: multiplier };
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

  let scenarioPlayers = [...(selectedRoster.players ?? [])];
  let scenarioBudget = remainingBudget(input.initialBudget, selectedRoster);
  const opponentBudgets = input.rosters
    .filter((roster) => roster.roster_id !== input.selectedRosterId
      && input.activeRosterIds.has(roster.roster_id))
    .map((roster) => remainingBudget(input.initialBudget, roster));
  const richestOtherActiveBudget = Math.max(0, ...opponentBudgets);
  const opponentHardCap = richestOtherActiveBudget + 1;
  const initialStanding = classifyScenario(input, scenarioPlayers);
  const rows: WeeklyBidDropRow[] = [];
  const acquired = new Set<string>();
  const usedDrops = new Set<string>();
  const availableRows = input.availableRows.filter((row) =>
    POSITION_PLAYER_POSITIONS.has(row.position));
  const maxRows = Math.min(5, Math.max(0, input.maxPositionDrops ?? 5));

  for (let round = 0; round < maxRows; round++) {
    const before = classifyScenario(input, scenarioPlayers);
    const qualifyingDrops = scenarioPlayers
      .filter((playerId) => {
        const position = input.weeklyProjections.get(playerId)?.position
          ?? input.rosProjections.get(playerId)?.position;
        return !!position && POSITION_PLAYER_POSITIONS.has(position)
          && !acquired.has(playerId) && !usedDrops.has(playerId);
      })
      .map((dropPlayerId) => {
        const dropWeek = scoreFor(dropPlayerId, input.weeklyProjections);
        const dropRos = rosFor(dropPlayerId, input.rosProjections);
        const recommendations = availableRows
          .filter((target) => !scenarioPlayers.includes(target.playerId)
            && scoreFor(target.playerId, input.weeklyProjections) > dropWeek
            && rosFor(target.playerId, input.rosProjections) > dropRos)
          .map((target): WeeklyBidRecommendation => {
            const replaced = scenarioPlayers
              .filter((playerId) => playerId !== dropPlayerId)
              .concat(target.playerId);
            const after = classifyScenario(input, replaced);
            const priced = theoreticalBid(target, before, after, input.eliminationsPerWeek);
            const suggestedBid = Math.max(0, Math.min(
              priced.value,
              scenarioBudget,
              opponentHardCap,
            ));
            return {
              target,
              dropPlayerId,
              weeklyGain: scoreFor(target.playerId, input.weeklyProjections) - dropWeek,
              rosGain: rosFor(target.playerId, input.rosProjections) - dropRos,
              beforeRisk: before.risk,
              afterRisk: after.risk,
              beforeRank: before.rank,
              afterRank: after.rank,
              theoreticalBid: priced.value,
              suggestedBid,
              budgetCapApplied: suggestedBid < priced.value && scenarioBudget <= opponentHardCap,
              opponentCapApplied: suggestedBid < priced.value && opponentHardCap < scenarioBudget,
              safeMultiplier: priced.safeMultiplier,
            };
          })
          .sort(recommendationComparator);
        return { dropPlayerId, dropWeek, dropRos, recommendations };
      })
      .filter((candidate) => candidate.recommendations.length > 0)
      .sort((a, b) => a.dropRos - b.dropRos
        || a.dropWeek - b.dropWeek
        || a.dropPlayerId.localeCompare(b.dropPlayerId));

    const weakest = qualifyingDrops[0];
    if (!weakest) break;
    rows.push({
      kind: 'position',
      dropPlayerId: weakest.dropPlayerId,
      dropPosition: input.weeklyProjections.get(weakest.dropPlayerId)?.position
        ?? input.rosProjections.get(weakest.dropPlayerId)?.position ?? '—',
      recommendations: weakest.recommendations,
      scenarioBudgetBefore: scenarioBudget,
    });
    usedDrops.add(weakest.dropPlayerId);

    // The next row is a new scenario: assume the best prior target was won at its displayed bid.
    const assumedWin = weakest.recommendations[0];
    scenarioPlayers = scenarioPlayers
      .filter((playerId) => playerId !== weakest.dropPlayerId)
      .concat(assumedWin.target.playerId);
    acquired.add(assumedWin.target.playerId);
    scenarioBudget = Math.max(0, scenarioBudget - assumedWin.suggestedBid);
  }

  for (const position of STREAMING_POSITIONS) {
    const current = scenarioPlayers
      .filter((playerId) => (input.weeklyProjections.get(playerId)?.position
        ?? input.rosProjections.get(playerId)?.position) === position)
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
    rows.push({
      kind: 'streamer',
      dropPlayerId: current,
      dropPosition: position,
      scenarioBudgetBefore: scenarioBudget,
      recommendations: [{
        target: baseRow,
        dropPlayerId: current,
        weeklyGain: scoreFor(bestId, input.weeklyProjections) - scoreFor(current, input.weeklyProjections),
        rosGain: rosFor(bestId, input.rosProjections) - rosFor(current, input.rosProjections),
        beforeRisk: standing.risk,
        afterRisk: standing.risk,
        beforeRank: standing.rank,
        afterRank: standing.rank,
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
