import type { Roster } from '../api/types';
import type { RosPlayerProjection } from './projections';
import type { MaxVorpCalibration } from './waivers';

export interface RosterValueSummary {
  rosterId: number;
  /** Sum of modeled Max VORP dollars, or null when no roster player was modeled. */
  total: number | null;
  matched: number;
  missing: number;
  playerCount: number;
}

export interface RankedRosterValue extends RosterValueSummary {
  /** Competition rank among active rosters. Null means the roster total is unavailable. */
  rank: number | null;
  outOf: number;
}


export interface RosterPositionValueRank {
  position: string;
  total: number;
  rank: number;
  outOf: number;
}

export interface SelectedRosterValueDisplay extends RosterValueSummary {
  eliminated: boolean;
  rank: number | null;
  outOf: number;
  /** Highest modeled total among active rosters only. */
  leagueHigh: number | null;
}

/**
 * Expand a valid Max VORP calibration to every player with a real Sleeper ROS projection.
 * Positive players use the calibration's rounded bid. Projected players omitted by the
 * positive-only calibration are honest $0 values; absent projections remain absent.
 */
export function buildMaxVorpPlayerValues(
  projections: ReadonlyMap<string, RosPlayerProjection>,
  calibration: MaxVorpCalibration | null | undefined,
): Map<string, number> | null {
  if (!calibration) return null;
  const values = new Map<string, number>();
  for (const playerId of [...projections.keys()].sort((a, b) => a.localeCompare(b))) {
    values.set(playerId, calibration.playerValues.get(playerId)?.bid ?? 0);
  }
  return values;
}

export function buildModeledPositionRanks(
  values: ReadonlyMap<string, number>,
  projections: ReadonlyMap<string, RosPlayerProjection>,
): Map<string, number> {
  const grouped = new Map<string, Array<{ id: string; value: number }>>();
  for (const [id, value] of values) {
    const position = projections.get(id)?.position;
    if (!position || !Number.isFinite(value)) continue;
    const group = grouped.get(position) ?? [];
    group.push({ id, value });
    grouped.set(position, group);
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
  values: ReadonlyMap<string, number>,
): RosterValueSummary {
  const ids = collectRosterPlayerIds(roster);
  let total = 0;
  let matched = 0;
  for (const id of ids) {
    const value = values.get(id);
    if (value == null || !Number.isFinite(value)) continue;
    total += value;
    matched++;
  }
  return {
    rosterId: roster.roster_id,
    total: matched > 0 || ids.length === 0 ? total : null,
    matched,
    missing: ids.length - matched,
    playerCount: ids.length,
  };
}

/** Rank surviving rosters only using deterministic competition ranks (1, 1, 3). */
export function rankActiveRosterValues(
  rosters: readonly Roster[],
  activeRosterIds: ReadonlySet<number>,
  values: ReadonlyMap<string, number>,
): Map<number, RankedRosterValue> {
  const outOf = activeRosterIds.size;
  const summaries = rosters
    .filter((roster) => activeRosterIds.has(roster.roster_id))
    .map((roster) => summarizeRosterValue(roster, values))
    .sort((a, b) => {
      if (a.total == null && b.total == null) return a.rosterId - b.rosterId;
      if (a.total == null) return 1;
      if (b.total == null) return -1;
      return b.total - a.total || a.rosterId - b.rosterId;
    });

  let previousTotal: number | null = null;
  let previousRank: number | null = null;
  return new Map(summaries.map((summary, index) => {
    let rank: number | null = null;
    if (summary.total != null) {
      rank = previousRank != null && summary.total === previousTotal ? previousRank : index + 1;
      previousTotal = summary.total;
      previousRank = rank;
    }
    return [summary.rosterId, { ...summary, rank, outOf }];
  }));
}

/** Always summarize the selected roster, but attach a rank only while it survives. */
export function buildSelectedRosterValueDisplay(
  selectedRoster: Roster,
  rosters: readonly Roster[],
  activeRosterIds: ReadonlySet<number>,
  values: ReadonlyMap<string, number>,
): SelectedRosterValueDisplay {
  const summary = summarizeRosterValue(selectedRoster, values);
  const activeRankings = rankActiveRosterValues(rosters, activeRosterIds, values);
  const activeRank = activeRosterIds.has(selectedRoster.roster_id)
    ? activeRankings.get(selectedRoster.roster_id)
    : undefined;
  let leagueHigh: number | null = null;
  for (const ranked of activeRankings.values()) {
    if (ranked.total != null && (leagueHigh == null || ranked.total > leagueHigh)) leagueHigh = ranked.total;
  }

  return {
    ...summary,
    eliminated: !activeRosterIds.has(selectedRoster.roster_id),
    rank: activeRank?.rank ?? null,
    outOf: activeRosterIds.size,
    leagueHigh,
  };
}


/**
 * Build exclusive native-position buckets for active rosters. A player contributes to exactly
 * one bucket from the same ROS projection used by Max VORP, so FLEX/SUPER_FLEX lineup
 * eligibility can never double-count them. Empty modeled buckets are honest $0 totals.
 */
export function rankActiveRosterPositionValues(
  rosters: readonly Roster[],
  activeRosterIds: ReadonlySet<number>,
  values: ReadonlyMap<string, number>,
  projections: ReadonlyMap<string, RosPlayerProjection>,
): Map<number, RosterPositionValueRank[]> {
  const positions = [...new Set([...projections.values()]
    .map((projection) => projection.position)
    .filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const totalsByRoster = new Map<number, Map<string, number>>();
  for (const roster of rosters) {
    if (!activeRosterIds.has(roster.roster_id)) continue;
    const totals = new Map(positions.map((position) => [position, 0]));
    for (const playerId of collectRosterPlayerIds(roster)) {
      const projection = projections.get(playerId);
      const value = values.get(playerId);
      if (!projection?.position || value == null || !Number.isFinite(value)) continue;
      totals.set(projection.position, (totals.get(projection.position) ?? 0) + value);
    }
    totalsByRoster.set(roster.roster_id, totals);
  }

  const rowsByRoster = new Map<number, RosterPositionValueRank[]>();
  for (const position of positions) {
    const sorted = [...totalsByRoster].map(([rosterId, totals]) => ({
      rosterId,
      total: totals.get(position) ?? 0,
    })).sort((a, b) => b.total - a.total || a.rosterId - b.rosterId);
    let previousTotal: number | null = null;
    let previousRank = 0;
    sorted.forEach((row, index) => {
      const rank = previousTotal === row.total ? previousRank : index + 1;
      previousTotal = row.total;
      previousRank = rank;
      const rosterRows = rowsByRoster.get(row.rosterId) ?? [];
      rosterRows.push({ position, total: row.total, rank, outOf: activeRosterIds.size });
      rowsByRoster.set(row.rosterId, rosterRows);
    });
  }
  return rowsByRoster;
}
