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
  /** Raw metric supplied by the active season-long source (ROS points, market value, or VoRP). */
  sourceValue?: number;
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
