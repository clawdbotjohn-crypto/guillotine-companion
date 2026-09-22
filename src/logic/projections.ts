import type { NflState, SleeperProjection, WeeklyProjectionMap } from '../api/types';

export type ProjectionScoring = 'ppr' | 'half-ppr' | 'standard';

export interface RosPlayerProjection {
  playerId: string;
  position: string;
  /** Sum of Sleeper's selected scoring projection across every requested remaining week. */
  totalPoints: number;
  /** totalPoints divided by all requested weeks, including bye/zero-projection weeks. */
  pointsPerWeek: number;
  projectedWeeks: number;
  /** Raw metric supplied by the active season-long source (ROS points or market value). */
  sourceValue?: number;
  /** Original rank supplied by a rank-based source such as FantasyPros ECR. */
  sourceRank?: number;
}

export interface WeeklyPlayerProjection {
  playerId: string;
  position: string;
  points: number;
  positionRank: number;
}

/** Match Sleeper's three projection totals to the league's reception scoring. */
export function getProjectionScoring(receptions: number | undefined): ProjectionScoring {
  if (receptions === 1) return 'ppr';
  if (receptions === 0.5) return 'half-ppr';
  return 'standard';
}

export function getProjectionPoints(
  projection: SleeperProjection | undefined,
  scoring: ProjectionScoring,
): number | null {
  if (!projection) return null;
  const value = scoring === 'ppr'
    ? projection.pts_ppr
    : scoring === 'half-ppr'
      ? projection.pts_half_ppr
      : projection.pts_std;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The state `week` is Sleeper's current NFL week. `display_week` is the last completed week.
 * Taking the greater of current week and display_week + 1 includes an in-progress/current week,
 * while advancing if Sleeper reports that week as completed.
 */
export function getRestOfSeasonStartWeek(state: NflState): number {
  return Math.max(1, state.week, state.display_week + 1);
}

/**
 * Sum the chosen Sleeper weekly scoring total into a complete ROS map. A missing projection in a
 * requested week contributes zero (bye/inactive), and a player with no selected scoring value in
 * any week is omitted rather than receiving a historical fallback.
 */
export function sumRestOfSeasonProjections(
  weekly: Map<number, WeeklyProjectionMap>,
  scoring: ProjectionScoring,
  getPosition: (playerId: string) => string | undefined,
): Map<string, RosPlayerProjection> {
  const projectedWeeks = weekly.size;
  const totals = new Map<string, number>();

  for (const projections of weekly.values()) {
    for (const [playerId, projection] of Object.entries(projections)) {
      const points = getProjectionPoints(projection, scoring);
      if (points == null) continue;
      totals.set(playerId, (totals.get(playerId) ?? 0) + points);
    }
  }

  const result = new Map<string, RosPlayerProjection>();
  if (projectedWeeks === 0) return result;

  for (const [playerId, totalPoints] of totals.entries()) {
    const position = getPosition(playerId);
    if (!position) continue;
    result.set(playerId, {
      playerId,
      position,
      totalPoints,
      pointsPerWeek: totalPoints / projectedWeeks,
      projectedWeeks,
    });
  }
  return result;
}

/**
 * Build next-week context from every scored player in Sleeper's payload before any roster or
 * availability filtering. Ties are deterministic by player ID.
 */
export function buildWeeklyProjectionContext(
  projections: WeeklyProjectionMap,
  scoring: ProjectionScoring,
  getPosition: (playerId: string) => string | undefined,
): Map<string, WeeklyPlayerProjection> {
  const byPosition = new Map<string, Array<{ playerId: string; points: number }>>();
  for (const [playerId, projection] of Object.entries(projections)) {
    const position = getPosition(playerId);
    const points = getProjectionPoints(projection, scoring);
    if (!position || points == null || !['QB', 'RB', 'WR', 'TE'].includes(position)) continue;
    const players = byPosition.get(position) ?? [];
    players.push({ playerId, points });
    byPosition.set(position, players);
  }

  const context = new Map<string, WeeklyPlayerProjection>();
  for (const [position, players] of byPosition.entries()) {
    players
      .sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId))
      .forEach((player, index) => context.set(player.playerId, {
        ...player,
        position,
        positionRank: index + 1,
      }));
  }
  return context;
}

// Official 2026 NFL schedule release: https://www.nfl.com/news/2026-nfl-schedule-release-every-team-bye-week
const BYE_WEEKS_BY_SEASON: Record<string, Record<string, number>> = {
  '2026': {
    CAR: 5, KC: 5,
    CIN: 6, DET: 6, MIA: 6, MIN: 6,
    BUF: 7, JAX: 7, LAC: 7, WAS: 7,
    HOU: 8, NO: 8, NYG: 8, SF: 8,
    PIT: 9, TEN: 9,
    CHI: 10, DEN: 10, PHI: 10, TB: 10,
    ATL: 11, CLE: 11, GB: 11, LAR: 11, NE: 11, SEA: 11,
    BAL: 13, IND: 13, LV: 13, NYJ: 13,
    ARI: 14, DAL: 14,
  },
};

/** Exact season/team bye week, or null when the season/team is unsupported. */
export function getTeamByeWeek(season: string, team: string | null | undefined): number | null {
  if (!team) return null;
  return BYE_WEEKS_BY_SEASON[season]?.[team.toUpperCase()] ?? null;
}
