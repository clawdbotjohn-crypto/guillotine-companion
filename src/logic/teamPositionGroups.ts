import type { PosGroupRank, ProjectedLineupGroupRank } from './analytics';

export type TeamOrder = 'projected' | 'historical' | 'value';

const STANDARD_VALUE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;
const LINEUP_META_POSITIONS = new Set(['BN', 'IR', 'TAXI']);
const DEFENSIVE_BUCKETS: Record<string, readonly string[]> = {
  DL: ['DL', 'DE', 'DT', 'NT'],
  LB: ['LB', 'ILB', 'OLB'],
  DB: ['DB', 'CB', 'S', 'SS', 'FS'],
};

/**
 * Map each native Sleeper projection position to one league-supported value bucket.
 * Flexible slots expand eligibility but never create a FLEX/SUPER_FLEX bucket, so each player
 * remains exclusive. Broad IDP slots collect their eligible native positions once.
 */
export function buildLeagueValuePositionBuckets(
  rosterPositions: readonly string[] | undefined,
): ReadonlyMap<string, string> {
  const buckets = new Set<string>();
  for (const position of rosterPositions ?? []) {
    if (LINEUP_META_POSITIONS.has(position)) continue;
    if (position === 'FLEX' || position === 'REC_FLEX') {
      ['RB', 'WR', 'TE'].forEach((eligible) => buckets.add(eligible));
    } else if (position === 'WRRB_FLEX') {
      ['RB', 'WR'].forEach((eligible) => buckets.add(eligible));
    } else if (position === 'SUPER_FLEX' || position === 'QB_FLEX' || position === 'OP') {
      ['QB', 'RB', 'WR', 'TE'].forEach((eligible) => buckets.add(eligible));
    } else if (position === 'IDP_FLEX') {
      ['DL', 'LB', 'DB'].forEach((eligible) => buckets.add(eligible));
    } else {
      buckets.add(position);
    }
  }
  if (buckets.size === 0) STANDARD_VALUE_POSITIONS.forEach((position) => buckets.add(position));

  const nativeToBucket = new Map<string, string>();
  for (const bucket of buckets) nativeToBucket.set(bucket, bucket);
  for (const [bucket, nativePositions] of Object.entries(DEFENSIVE_BUCKETS)) {
    if (!buckets.has(bucket)) continue;
    for (const nativePosition of nativePositions) {
      if (!nativeToBucket.has(nativePosition)) nativeToBucket.set(nativePosition, bucket);
    }
  }
  return nativeToBucket;
}

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
