import type { Matchup, Roster, SleeperGame } from '../api/types';
import type { PlayerRecord } from '../store/players';
import type { ActiveStanding, TeamRisk } from './analytics';
import { getCurrentElimsPerWeek, rankActiveTeams } from './analytics';
import type { EliminationResult } from './elimination';
import type { WeeklyScoredPlayer } from './projections';

export const LIVE_STALE_MS = 30_000;
export const LIVE_REFRESH_MS = 60_000;
export const LIVE_FRESHNESS_MS = 120_000;
const LIVE_WINDOW_BEFORE_MS = 15 * 60_000;
const LIVE_WINDOW_AFTER_MS = 5 * 60 * 60_000;

export type LiveProjectionQuality = 'full' | 'partial' | 'unavailable';
export type LiveFreshness = 'fresh' | 'stale' | 'unavailable';

export interface LiveTeamScore {
  rosterId: number;
  displayName: string;
  eliminated: boolean;
  officialPoints: number | null;
  projectedFinal: number | null;
  projectionQuality: LiveProjectionQuality;
  playersRemaining: number;
  playersInProgress: number;
  standing: ActiveStanding | null;
}

export interface LiveScoringModel {
  teams: LiveTeamScore[];
  activeTeamCount: number;
  projectedCutline: number | null;
  rankingsAvailable: boolean;
}

function finite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function gameMetadata(game: SleeperGame): Record<string, unknown> {
  return game.metadata && typeof game.metadata === 'object' ? game.metadata : {};
}

function normalizedStartTime(value: unknown): number | null {
  const parsed = finite(value);
  if (parsed == null || parsed <= 0) return null;
  return parsed < 10_000_000_000 ? parsed * 1000 : parsed;
}

function normalizedStatus(game: SleeperGame): string {
  return typeof game.status === 'string' ? game.status.toLowerCase().replaceAll('-', '_') : '';
}

export function isGameInProgress(game: SleeperGame): boolean {
  const metadata = gameMetadata(game);
  const status = normalizedStatus(game);
  return bool(metadata.is_in_progress) === true
    || status === 'in_progress'
    || status === 'live';
}

function isGameComplete(game: SleeperGame): boolean {
  const metadata = gameMetadata(game);
  const status = normalizedStatus(game);
  return bool(metadata.is_over) === true
    || status === 'complete'
    || status === 'final'
    || status === 'closed';
}

function isGamePregame(game: SleeperGame): boolean {
  const metadata = gameMetadata(game);
  const status = normalizedStatus(game);
  return bool(metadata.has_started) === false
    || status === 'pre_game'
    || status === 'pregame'
    || status === 'scheduled';
}

/** A bounded fraction is returned only when quarter and clock evidence are coherent. */
export function getRemainingGameFraction(game: SleeperGame): number | null {
  if (!isGameInProgress(game)) return null;
  const metadata = gameMetadata(game);
  const totalRemaining = finite(metadata.game_seconds_remaining);
  if (totalRemaining != null && totalRemaining >= 0 && totalRemaining <= 3600) {
    return Math.min(1, Math.max(0, totalRemaining / 3600));
  }

  const quarter = finite(metadata.quarter ?? metadata.period ?? metadata.qtr);
  const clock = metadata.time_remaining ?? metadata.clock;
  if (quarter == null || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) return null;
  let seconds: number | null = null;
  if (typeof clock === 'string') {
    const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
    if (match) {
      const minutes = Number(match[1]);
      const remainder = Number(match[2]);
      if (minutes <= 15 && remainder < 60) seconds = minutes * 60 + remainder;
    }
  } else {
    const parsed = finite(clock);
    if (parsed != null && parsed >= 0 && parsed <= 900) seconds = parsed;
  }
  if (seconds == null) return null;
  return Math.min(1, Math.max(0, (((4 - quarter) * 900) + seconds) / 3600));
}

function gameTeams(game: SleeperGame): string[] {
  const metadata = gameMetadata(game);
  return [game.home_team, game.away_team, metadata.home_team, metadata.away_team]
    .filter((team): team is string => typeof team === 'string' && team.trim() !== '')
    .map((team) => team.toUpperCase());
}

export function isWithinLiveGameWindow(games: readonly SleeperGame[] | undefined, now = Date.now()): boolean {
  if (!games?.length) return false;
  if (games.some(isGameInProgress)) return true;
  return games.some((game) => {
    const start = normalizedStartTime(game.start_time);
    return start != null && now >= start - LIVE_WINDOW_BEFORE_MS && now <= start + LIVE_WINDOW_AFTER_MS;
  });
}

export function getLiveRefreshInterval(games: readonly SleeperGame[] | undefined, now = Date.now()): number | false {
  return isWithinLiveGameWindow(games, now) ? LIVE_REFRESH_MS : false;
}

export function getLiveFreshness(updatedAt: number | null | undefined, now = Date.now()): LiveFreshness {
  if (!updatedAt || updatedAt <= 0) return 'unavailable';
  return now - updatedAt <= LIVE_FRESHNESS_MS ? 'fresh' : 'stale';
}

export function formatLiveUpdatedAt(updatedAt: number | null | undefined): string {
  if (!updatedAt || updatedAt <= 0) return 'Update time unavailable';
  return `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

interface BuildLiveScoringInput {
  rosters: readonly Roster[];
  matchups: readonly Matchup[] | undefined;
  weeklyProjections: ReadonlyMap<string, WeeklyScoredPlayer> | null;
  games: readonly SleeperGame[] | undefined;
  players: ReadonlyMap<string, PlayerRecord> | undefined;
  elimination: EliminationResult;
}

export function buildLiveScoringModel(input: BuildLiveScoringInput): LiveScoringModel {
  const matchupByRoster = new Map((input.matchups ?? []).map((matchup) => [matchup.roster_id, matchup]));
  const gameByTeam = new Map<string, SleeperGame>();
  for (const game of input.games ?? []) {
    for (const team of gameTeams(game)) gameByTeam.set(team, game);
  }

  const teams: LiveTeamScore[] = input.rosters.map((roster) => {
    const matchup = matchupByRoster.get(roster.roster_id);
    const teamInfo = input.elimination.teams.get(roster.roster_id);
    const eliminated = teamInfo?.eliminatedWeek != null;
    const starters = matchup?.starters ?? [];
    const officialPoints = finite(matchup?.points);
    let additions = 0;
    let resolved = 0;
    let playersRemaining = 0;
    let playersInProgress = 0;

    for (const playerId of starters) {
      const player = input.players?.get(playerId);
      if (!player?.team) continue;
      const game = gameByTeam.get(player.team.toUpperCase());
      // A mapped NFL team missing from a non-empty schedule is a bye/no-game.
      // An empty schedule cannot establish that fact, so fail closed instead.
      if (!game) {
        if ((input.games?.length ?? 0) > 0) resolved += 1;
        continue;
      }
      if (isGameComplete(game)) {
        resolved += 1;
        continue;
      }
      const projection = input.weeklyProjections?.get(playerId)?.points;
      if (isGamePregame(game)) {
        playersRemaining += 1;
        if (projection != null && Number.isFinite(projection)) {
          additions += projection;
          resolved += 1;
        }
        continue;
      }
      if (isGameInProgress(game)) {
        playersRemaining += 1;
        playersInProgress += 1;
        const fraction = getRemainingGameFraction(game);
        if (fraction != null && projection != null && Number.isFinite(projection)) {
          additions += projection * fraction;
          resolved += 1;
        }
      }
    }

    const projectedFinal = officialPoints != null && starters.length > 0 && resolved > 0
      ? officialPoints + additions
      : null;
    const projectionQuality: LiveProjectionQuality = projectedFinal == null
      ? 'unavailable'
      : resolved === starters.length ? 'full' : 'partial';
    return {
      rosterId: roster.roster_id,
      displayName: teamInfo?.displayName ?? `Team ${roster.roster_id}`,
      eliminated,
      officialPoints,
      projectedFinal,
      projectionQuality,
      playersRemaining,
      playersInProgress,
      standing: null,
    };
  });

  const activeTeams = teams.filter((team) => !team.eliminated);
  const rankingsAvailable = activeTeams.length > 0
    && activeTeams.every((team) => team.projectedFinal != null);
  let projectedCutline: number | null = null;
  if (rankingsAvailable) {
    const standings = rankActiveTeams(
      teams.map((team) => ({
        rosterId: team.rosterId,
        value: team.projectedFinal ?? 0,
        eliminated: team.eliminated,
      })),
      getCurrentElimsPerWeek(input.elimination),
    );
    for (const team of teams) team.standing = standings.get(team.rosterId) ?? null;
    const eliminationCount = Math.min(getCurrentElimsPerWeek(input.elimination), activeTeams.length);
    const ordered = activeTeams
      .map((team) => team.projectedFinal!)
      .sort((a, b) => a - b);
    projectedCutline = ordered[eliminationCount - 1] ?? null;
  }

  teams.sort((left, right) => {
    if (left.eliminated !== right.eliminated) return left.eliminated ? 1 : -1;
    if (!left.eliminated && rankingsAvailable) {
      return (left.standing?.rank ?? Number.MAX_SAFE_INTEGER) - (right.standing?.rank ?? Number.MAX_SAFE_INTEGER);
    }
    return right.officialPoints! - left.officialPoints! || left.rosterId - right.rosterId;
  });

  return { teams, activeTeamCount: activeTeams.length, projectedCutline, rankingsAvailable };
}

export function riskLabel(risk: TeamRisk): string {
  return risk === 'at-risk' ? 'Danger' : risk === 'warning' ? 'Watch' : 'Safe';
}
