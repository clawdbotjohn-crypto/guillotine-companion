import type { Matchup, Roster, SleeperGame } from '../api/types';
import type { PlayerRecord } from '../store/players';
import type { ActiveStanding } from './analytics';
import { getCurrentElimsPerWeek, rankActiveTeams } from './analytics';
import type { EliminationResult } from './elimination';
import type { WeeklyScoredPlayer } from './projections';

export const LIVE_STALE_MS = 30_000;
export const LIVE_REFRESH_MS = 60_000;
export const LIVE_FRESHNESS_MS = 120_000;
const LIVE_WINDOW_BEFORE_MS = 15 * 60_000;
const LIVE_WINDOW_AFTER_MS = 5 * 60 * 60_000;
const LIVE_WAKE_AHEAD_MS = 6 * 60 * 60_000;

export type LiveFreshness = 'fresh' | 'stale' | 'unavailable';
export type LiveStarterStatus = 'not-started' | 'live' | 'final' | 'bye' | 'unknown';

export interface LiveStarterScore {
  playerId: string;
  name: string;
  fantasyPosition: string;
  lineupPosition: string;
  injuryStatus: string | null;
  currentPoints: number;
  projectedFinal: number | null;
  status: LiveStarterStatus;
  context: string | null;
  hasStarted: boolean;
}

export interface LiveTeamScore {
  rosterId: number;
  displayName: string;
  eliminated: boolean;
  officialPoints: number;
  projectedFinal: number;
  playersRemaining: number;
  playersInProgress: number;
  startersStarted: number;
  starterCount: number;
  starters: LiveStarterScore[];
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

export function isGameComplete(game: SleeperGame): boolean {
  const metadata = gameMetadata(game);
  const status = normalizedStatus(game);
  return bool(metadata.is_over) === true
    || status === 'complete'
    || status === 'final'
    || status === 'closed'
    || status === 'post';
}

function hasGameStarted(game: SleeperGame): boolean {
  const metadata = gameMetadata(game);
  return isGameInProgress(game)
    || isGameComplete(game)
    || bool(metadata.has_started) === true;
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

  const quarter = finite(metadata.quarter_num ?? metadata.quarter ?? metadata.period ?? metadata.qtr);
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
    if (isGameComplete(game)) return false;
    const start = normalizedStartTime(game.start_time);
    return start != null && now >= start - LIVE_WINDOW_BEFORE_MS && now <= start + LIVE_WINDOW_AFTER_MS;
  });
}

/**
 * The Hub banner spans the whole scoring slate: first observed weekly kickoff
 * through the final game's completion. Unlike polling windows, this deliberately
 * remains true between Thursday, Sunday, and Monday game windows.
 */
export function isWeeklyScoringActive(games: readonly SleeperGame[] | undefined, now = Date.now()): boolean {
  if (!games?.length || games.every(isGameComplete)) return false;
  if (games.some(hasGameStarted)) return true;
  const firstKickoff = games
    .map((game) => normalizedStartTime(game.start_time))
    .filter((start): start is number => start != null)
    .sort((left, right) => left - right)[0];
  return firstKickoff != null && now >= firstKickoff;
}

/**
 * Poll once a minute only in a live window. When a kickoff is within six hours,
 * return one one-shot delay to wake the query at the window boundary; games
 * hours or days away do not cause background polling.
 */
export function getLiveRefreshInterval(games: readonly SleeperGame[] | undefined, now = Date.now()): number | false {
  if (isWithinLiveGameWindow(games, now)) return LIVE_REFRESH_MS;
  const nextWindow = (games ?? [])
    .filter((game) => !isGameComplete(game))
    .map((game) => normalizedStartTime(game.start_time))
    .filter((start): start is number => start != null)
    .map((start) => start - LIVE_WINDOW_BEFORE_MS)
    .filter((windowStart) => windowStart > now)
    .sort((left, right) => left - right)[0];
  if (nextWindow == null) return false;
  const delay = nextWindow - now;
  return delay <= LIVE_WAKE_AHEAD_MS ? Math.max(1_000, delay) : false;
}

export function getLiveFreshness(updatedAt: number | null | undefined, now = Date.now()): LiveFreshness {
  if (!updatedAt || updatedAt <= 0) return 'unavailable';
  return now - updatedAt <= LIVE_FRESHNESS_MS ? 'fresh' : 'stale';
}

/** Weekly projections are a baseline, so freshness follows only minute-polled inputs. */
export function getLiveDataUpdatedAt(
  matchupUpdatedAt: number | null | undefined,
  gamesUpdatedAt: number | null | undefined,
): number | null {
  if (
    !matchupUpdatedAt || matchupUpdatedAt <= 0
    || !gamesUpdatedAt || gamesUpdatedAt <= 0
  ) return null;
  return Math.min(matchupUpdatedAt, gamesUpdatedAt);
}

export function formatLiveUpdatedAt(updatedAt: number | null | undefined): string {
  if (!updatedAt || updatedAt <= 0) return 'Update time unavailable';
  return `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

interface BuildLiveScoringInput {
  rosters: readonly Roster[];
  matchups: readonly Matchup[];
  weeklyProjections: ReadonlyMap<string, WeeklyScoredPlayer> | null;
  games: readonly SleeperGame[];
  players: ReadonlyMap<string, PlayerRecord> | undefined;
  elimination: EliminationResult;
  lineupPositions?: readonly string[];
}

function validStarterIds(matchup: Matchup | undefined): string[] {
  return (matchup?.starters ?? []).filter((playerId) => (
    typeof playerId === 'string' && playerId.trim() !== '' && playerId !== '0'
  ));
}

function displayLineupPosition(position: string | undefined, fallback: string): string {
  if (!position) return fallback;
  if (position === 'WRRB_FLEX' || position === 'REC_FLEX') return 'FLEX';
  if (position === 'SUPER_FLEX' || position === 'QB_FLEX') return 'SUPER FLEX';
  return position.replaceAll('_', ' ');
}

function starterLineupPositions(positions: readonly string[] | undefined): string[] {
  return (positions ?? []).filter((position) => ![
    'BN', 'BENCH', 'IR', 'RESERVE', 'TAXI',
  ].includes(position));
}

function starterCurrentPoints(matchup: Matchup | undefined, playerId: string, index: number): number {
  return finite(matchup?.players_points?.[playerId])
    ?? finite(matchup?.starters_points?.[index])
    ?? 0;
}

export function buildLiveScoringModel(input: BuildLiveScoringInput): LiveScoringModel {
  const matchupByRoster = new Map(input.matchups.map((matchup) => [matchup.roster_id, matchup]));
  const gameByTeam = new Map<string, SleeperGame>();
  for (const game of input.games) {
    for (const team of gameTeams(game)) gameByTeam.set(team, game);
  }
  const lineupPositions = starterLineupPositions(input.lineupPositions);

  const teams: LiveTeamScore[] = input.rosters.map((roster) => {
    const matchup = matchupByRoster.get(roster.roster_id);
    const teamInfo = input.elimination.teams.get(roster.roster_id);
    const eliminated = teamInfo?.eliminatedWeek != null;
    const starterIds = validStarterIds(matchup);
    const officialPoints = finite(matchup?.points) ?? 0;
    let additions = 0;
    let playersRemaining = 0;
    let playersInProgress = 0;
    let startersStarted = 0;

    const starters = starterIds.map((playerId, index): LiveStarterScore => {
      const player = input.players?.get(playerId);
      const fantasyPosition = player?.position || 'UNK';
      const injuryStatus = player?.injury_status
        || (player?.status && player.status !== 'Active' ? player.status : null);
      const currentPoints = starterCurrentPoints(matchup, playerId, index);
      const projection = finite(input.weeklyProjections?.get(playerId)?.points);
      const game = player?.team ? gameByTeam.get(player.team.toUpperCase()) : undefined;
      let projectedFinal: number | null = null;
      let status: LiveStarterStatus = 'unknown';
      let context: string | null = null;
      let hasStarted = false;

      if (!game) {
        if (player?.team && input.games.length > 0) {
          status = 'bye';
          context = 'Bye / no game';
          projectedFinal = currentPoints;
        }
      } else if (isGameComplete(game)) {
        status = 'final';
        context = 'Final';
        hasStarted = true;
        projectedFinal = currentPoints;
      } else if (isGameInProgress(game)) {
        status = 'live';
        context = 'Live';
        hasStarted = true;
        playersRemaining += 1;
        playersInProgress += 1;
        const fraction = getRemainingGameFraction(game);
        if (fraction != null && projection != null) {
          const remaining = projection * fraction;
          additions += remaining;
          projectedFinal = currentPoints + remaining;
        }
      } else if (isGamePregame(game)) {
        status = 'not-started';
        context = 'Not started';
        playersRemaining += 1;
        if (projection != null) {
          additions += projection;
          projectedFinal = currentPoints + projection;
        }
      } else if (hasGameStarted(game)) {
        status = 'live';
        context = 'Started';
        hasStarted = true;
        playersRemaining += 1;
        playersInProgress += 1;
      }

      if (hasStarted) startersStarted += 1;
      return {
        playerId,
        name: player?.full_name || playerId,
        fantasyPosition,
        lineupPosition: displayLineupPosition(lineupPositions[index], fantasyPosition),
        injuryStatus,
        currentPoints,
        projectedFinal,
        status,
        context,
        hasStarted,
      };
    });

    return {
      rosterId: roster.roster_id,
      displayName: teamInfo?.displayName ?? `Team ${roster.roster_id}`,
      eliminated,
      officialPoints,
      projectedFinal: officialPoints + additions,
      playersRemaining,
      playersInProgress,
      startersStarted,
      starterCount: starterIds.length,
      starters,
      standing: null,
    };
  });

  const activeTeams = teams.filter((team) => !team.eliminated);
  const rankingsAvailable = activeTeams.length > 0;
  const standings = rankActiveTeams(
    teams.map((team) => ({
      rosterId: team.rosterId,
      value: team.projectedFinal,
      eliminated: team.eliminated,
    })),
    getCurrentElimsPerWeek(input.elimination),
  );
  for (const team of teams) team.standing = standings.get(team.rosterId) ?? null;

  const eliminationCount = Math.min(getCurrentElimsPerWeek(input.elimination), activeTeams.length);
  const orderedActiveScores = activeTeams
    .map((team) => team.projectedFinal)
    .sort((left, right) => left - right);
  const projectedCutline = orderedActiveScores[eliminationCount - 1] ?? null;

  // Scores is a survival board: lowest projected active team first. Roster ID
  // is the stable tie-breaker, and eliminated teams remain visible at the end.
  teams.sort((left, right) => {
    if (left.eliminated !== right.eliminated) return left.eliminated ? 1 : -1;
    return left.projectedFinal - right.projectedFinal || left.rosterId - right.rosterId;
  });

  return { teams, activeTeamCount: activeTeams.length, projectedCutline, rankingsAvailable };
}
