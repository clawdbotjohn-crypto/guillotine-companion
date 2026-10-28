import type { TeamProjection } from './analytics';
import type { EliminationResult } from './elimination';

export type BiddingTeamStatusKind = 'eliminated' | 'safe' | 'warning' | 'danger' | 'unavailable';

export interface BiddingTeamStatus {
  kind: BiddingTeamStatusKind;
  label: 'Eliminated' | 'Safe' | 'Warning' | 'Danger' | 'Active · projection unavailable';
}

export const UNAVAILABLE_BIDDING_TEAM_STATUS: BiddingTeamStatus = {
  kind: 'unavailable',
  label: 'Active · projection unavailable',
};

/**
 * Builds one status for every known roster. Historical elimination is authoritative;
 * otherwise the existing weekly projection risk classification is reused.
 */
export function buildBiddingTeamStatusMap(
  elimination: EliminationResult,
  projections: readonly TeamProjection[],
): ReadonlyMap<number, BiddingTeamStatus> {
  const projectionsByRosterId = new Map(projections.map((projection) => [projection.rosterId, projection]));
  const rosterIds = new Set<number>([
    ...elimination.teams.keys(),
    ...projections.map((projection) => projection.rosterId),
  ]);
  const statuses = new Map<number, BiddingTeamStatus>();

  for (const rosterId of [...rosterIds].sort((a, b) => a - b)) {
    const team = elimination.teams.get(rosterId);
    const projection = projectionsByRosterId.get(rosterId);
    if (team?.eliminatedWeek != null || projection?.eliminated) {
      statuses.set(rosterId, { kind: 'eliminated', label: 'Eliminated' });
      continue;
    }
    if (projection?.projPoints == null || projection.projRank <= 0 || projection.projOutOf <= 0) {
      statuses.set(rosterId, UNAVAILABLE_BIDDING_TEAM_STATUS);
      continue;
    }
    if (projection.risk === 'safe') statuses.set(rosterId, { kind: 'safe', label: 'Safe' });
    else if (projection.risk === 'warning') statuses.set(rosterId, { kind: 'warning', label: 'Warning' });
    else statuses.set(rosterId, { kind: 'danger', label: 'Danger' });
  }

  return statuses;
}
