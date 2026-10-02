import type { TeamProjection } from './analytics';
import type { RankedRosterValue } from './playerValues';

export function orderTeamsByValue(
  projections: readonly TeamProjection[],
  rankings: ReadonlyMap<number, RankedRosterValue>,
): TeamProjection[] {
  return [...projections].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (a.eliminated) return a.rosterId - b.rosterId;
    return (rankings.get(a.rosterId)?.rank ?? Number.MAX_SAFE_INTEGER)
      - (rankings.get(b.rosterId)?.rank ?? Number.MAX_SAFE_INTEGER)
      || a.rosterId - b.rosterId;
  });
}
