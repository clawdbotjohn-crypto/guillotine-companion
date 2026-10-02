import type { League, Roster } from '../api/types';
import type { EliminationResult } from './elimination';
import type { WeeklyScoredPlayer } from './projections';
import { collectRosterPlayerIds } from './playerValues';
import {
  computeProjectedLineupGroupRanks,
  parseLineupSlots,
  projectAllTeams,
  projectBestLineup,
} from './analytics';

export interface TeamImpactMetric {
  before: number;
  after: number;
  outOf: number;
}

export interface AvailableFreeAgentTeamImpact {
  status: 'available';
  overallRank: TeamImpactMetric;
  positionRank: TeamImpactMetric;
  lineupPoints: Omit<TeamImpactMetric, 'outOf'>;
  position: string;
  incomingPlayerStarts: boolean;
  displacedStarterIds: string[];
  assumedDropPlayerId: string | null;
  dropReason: 'lowest-projected-non-starter' | 'lowest-projected-roster-player' | null;
}

export interface UnavailableFreeAgentTeamImpact {
  status: 'unavailable';
  reason:
    | 'Select your team to calculate impact.'
    | 'Your selected team is unavailable.'
    | 'Team impact is unavailable for an eliminated team.'
    | 'This player is already rostered.'
    | 'Next-week Sleeper projections are unavailable.'
    | 'This player has no next-week Sleeper projection.'
    | 'The league lineup configuration cannot produce this position rank.'
    | 'A required roster drop could not be modeled safely.';
}

export type FreeAgentTeamImpact = AvailableFreeAgentTeamImpact | UnavailableFreeAgentTeamImpact;

function unavailable(reason: UnavailableFreeAgentTeamImpact['reason']): UnavailableFreeAgentTeamImpact {
  return { status: 'unavailable', reason };
}

function uniquePlayerIds(roster: Roster): string[] {
  return [...new Set((roster.players ?? []).filter(Boolean))];
}

/**
 * Build one acquisition scenario from the exact weekly optimizer/rank model used by Hub and Teams.
 * This function deliberately has no bid input: FAAB affects budget, never projected lineup points.
 */
export function buildFreeAgentTeamImpact({
  playerId,
  playerPosition,
  selectedRosterId,
  rosters,
  league,
  elimination,
  weeklyProjections,
}: {
  playerId: string;
  playerPosition: string;
  selectedRosterId: number | null | undefined;
  rosters: readonly Roster[];
  league: League | undefined;
  elimination: EliminationResult;
  weeklyProjections: ReadonlyMap<string, WeeklyScoredPlayer> | null;
}): FreeAgentTeamImpact {
  if (selectedRosterId == null) return unavailable('Select your team to calculate impact.');
  const selectedRoster = rosters.find((roster) => roster.roster_id === selectedRosterId);
  if (!selectedRoster) return unavailable('Your selected team is unavailable.');
  if (elimination.teams.get(selectedRosterId)?.eliminatedWeek != null) {
    return unavailable('Team impact is unavailable for an eliminated team.');
  }
  const rosteredPlayerIds = new Set(rosters.flatMap(collectRosterPlayerIds));
  if (rosteredPlayerIds.has(playerId)) {
    return unavailable('This player is already rostered.');
  }
  if (!weeklyProjections?.size) return unavailable('Next-week Sleeper projections are unavailable.');
  const incomingProjection = weeklyProjections.get(playerId);
  if (!incomingProjection) {
    return unavailable('This player has no next-week Sleeper projection.');
  }
  const nativePosition = incomingProjection.position || playerPosition;

  const currentPlayerIds = uniquePlayerIds(selectedRoster);
  const slots = parseLineupSlots(league?.roster_positions);
  const currentLineup = projectBestLineup(currentPlayerIds, weeklyProjections, slots);
  const currentStarterIds = new Set(currentLineup.starters.map((starter) => starter.playerId));
  const configuredRosterSize = league?.roster_positions?.length ?? 0;
  const dropRequired = configuredRosterSize > 0 && currentPlayerIds.length >= configuredRosterSize;
  let assumedDropPlayerId: string | null = null;
  let dropReason: AvailableFreeAgentTeamImpact['dropReason'] = null;

  if (dropRequired) {
    const candidates = currentPlayerIds
      .map((candidateId) => ({
        playerId: candidateId,
        starter: currentStarterIds.has(candidateId),
        points: weeklyProjections.get(candidateId)?.points ?? 0,
      }))
      .sort((a, b) => Number(a.starter) - Number(b.starter)
        || a.points - b.points
        || a.playerId.localeCompare(b.playerId));
    const candidate = candidates[0];
    if (!candidate) return unavailable('A required roster drop could not be modeled safely.');
    assumedDropPlayerId = candidate.playerId;
    dropReason = candidate.starter
      ? 'lowest-projected-roster-player'
      : 'lowest-projected-non-starter';
  }

  const scenarioPlayerIds = currentPlayerIds
    .filter((candidateId) => candidateId !== assumedDropPlayerId)
    .concat(playerId);
  const scenarioRosters = rosters.map((roster) => roster.roster_id === selectedRosterId
    ? { ...roster, players: scenarioPlayerIds }
    : roster);
  const beforeTeams = projectAllTeams([...rosters], weeklyProjections, league, elimination);
  const afterTeams = projectAllTeams(scenarioRosters, weeklyProjections, league, elimination);
  const beforeTeam = beforeTeams.find((team) => team.rosterId === selectedRosterId);
  const afterTeam = afterTeams.find((team) => team.rosterId === selectedRosterId);
  if (!beforeTeam || !afterTeam || beforeTeam.projPoints == null || afterTeam.projPoints == null
    || beforeTeam.projRank <= 0 || afterTeam.projRank <= 0) {
    return unavailable('Next-week Sleeper projections are unavailable.');
  }

  const beforePosition = computeProjectedLineupGroupRanks(
    beforeTeams,
    weeklyProjections,
    league,
  ).byRosterId.get(selectedRosterId)?.find((row) => row.group === nativePosition);
  const afterPosition = computeProjectedLineupGroupRanks(
    afterTeams,
    weeklyProjections,
    league,
  ).byRosterId.get(selectedRosterId)?.find((row) => row.group === nativePosition);
  if (!beforePosition || !afterPosition) {
    return unavailable('The league lineup configuration cannot produce this position rank.');
  }

  const afterStarterIds = new Set(afterTeam.starters.map((starter) => starter.playerId));
  return {
    status: 'available',
    overallRank: {
      before: beforeTeam.projRank,
      after: afterTeam.projRank,
      outOf: beforeTeam.projOutOf,
    },
    positionRank: {
      before: beforePosition.rank,
      after: afterPosition.rank,
      outOf: beforePosition.outOf,
    },
    lineupPoints: { before: beforeTeam.projPoints, after: afterTeam.projPoints },
    position: nativePosition,
    incomingPlayerStarts: afterStarterIds.has(playerId),
    displacedStarterIds: beforeTeam.starters
      .filter((starter) => !afterStarterIds.has(starter.playerId))
      .map((starter) => starter.playerId),
    assumedDropPlayerId,
    dropReason,
  };
}
