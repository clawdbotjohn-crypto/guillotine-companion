import type { Roster } from '../api/types';
import type { RosPlayerProjection } from './projections';

export interface PlayerValueDisplay {
  value: number | null;
  positionRank: number | null;
}

export interface RosterValueSummary {
  rosterId: number;
  total: number;
  matched: number;
  missing: number;
  playerCount: number;
}

export interface RankedRosterValue extends RosterValueSummary {
  rank: number;
  outOf: number;
}

export interface SelectedRosterValueDisplay extends RosterValueSummary {
  eliminated: boolean;
  rank: number | null;
  outOf: number;
}

export function selectedPlayerValue(value: RosPlayerProjection | undefined): number | null {
  const raw = value?.sourceValue ?? value?.totalPoints;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function buildPositionRanks(values: ReadonlyMap<string, RosPlayerProjection>): Map<string, number> {
  const grouped = new Map<string, Array<{ id: string; value: number }>>();
  for (const [id, projection] of values) {
    const value = selectedPlayerValue(projection);
    if (value == null) continue;
    const group = grouped.get(projection.position) ?? [];
    group.push({ id, value });
    grouped.set(projection.position, group);
  }
  const ranks = new Map<string, number>();
  for (const group of grouped.values()) {
    group.sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
    group.forEach((player, index) => ranks.set(player.id, index + 1));
  }
  return ranks;
}

/** Includes defensive reserve/taxi coordinates and counts each stable player ID once. */
export function collectRosterPlayerIds(roster: Roster): string[] {
  const extended = roster as Roster & { reserve?: string[] | null; taxi?: string[] | null };
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of [...(roster.players ?? []), ...(extended.reserve ?? []), ...(extended.taxi ?? [])]) {
    if (!id || id === '0' || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function summarizeRosterValue(
  roster: Roster,
  values: ReadonlyMap<string, RosPlayerProjection>,
): RosterValueSummary {
  const ids = collectRosterPlayerIds(roster);
  let total = 0;
  let matched = 0;
  for (const id of ids) {
    const value = selectedPlayerValue(values.get(id));
    if (value == null) continue;
    total += value;
    matched++;
  }
  return { rosterId: roster.roster_id, total, matched, missing: ids.length - matched, playerCount: ids.length };
}

/** Rank surviving rosters only; total then stable roster ID provides deterministic ties. */
export function rankActiveRosterValues(
  rosters: readonly Roster[],
  activeRosterIds: ReadonlySet<number>,
  values: ReadonlyMap<string, RosPlayerProjection>,
): Map<number, RankedRosterValue> {
  const summaries = rosters
    .filter((roster) => activeRosterIds.has(roster.roster_id))
    .map((roster) => summarizeRosterValue(roster, values))
    .sort((a, b) => b.total - a.total || a.rosterId - b.rosterId);
  return new Map(summaries.map((summary, index) => [
    summary.rosterId,
    { ...summary, rank: index + 1, outOf: summaries.length },
  ]));
}

/** Always summarize the selected roster, but attach a rank only while it survives. */
export function buildSelectedRosterValueDisplay(
  selectedRoster: Roster,
  rosters: readonly Roster[],
  activeRosterIds: ReadonlySet<number>,
  values: ReadonlyMap<string, RosPlayerProjection>,
): SelectedRosterValueDisplay {
  const summary = summarizeRosterValue(selectedRoster, values);
  const activeRankings = rankActiveRosterValues(rosters, activeRosterIds, values);
  const activeRank = activeRosterIds.has(selectedRoster.roster_id)
    ? activeRankings.get(selectedRoster.roster_id)
    : undefined;

  return {
    ...summary,
    eliminated: !activeRosterIds.has(selectedRoster.roster_id),
    rank: activeRank?.rank ?? null,
    outOf: activeRankings.size,
  };
}
