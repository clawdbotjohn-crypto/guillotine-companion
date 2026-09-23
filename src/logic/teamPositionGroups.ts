import type { PosGroupRank, ProjectedLineupGroupRank } from './analytics';

export type TeamOrder = 'projected' | 'historical';

/** Keep expanded team-card details on the same model as the selected team ordering. */
export function getTeamPositionGroups(
  rosterId: number,
  orderBy: TeamOrder,
  projectedRanks: ReadonlyMap<number, ProjectedLineupGroupRank[]>,
  historicalRanks: ReadonlyMap<number, PosGroupRank[]>,
): PosGroupRank[] {
  if (orderBy === 'historical') return historicalRanks.get(rosterId) ?? [];
  return (projectedRanks.get(rosterId) ?? []).map((row) => ({
    position: row.group,
    points: row.points,
    rank: row.rank,
    outOf: row.outOf,
  }));
}
