// Analytics engine: projected best-lineup, position-group ranks, safe/at-risk.

import type { Matchup, Roster, League } from '../api/types';
import { getPlayerPosition } from '../store/players';
import type { EliminationResult } from './elimination';
import type { WeeklyScoredPlayer } from './projections';

export function formatCurrentRank(rank: number | undefined, activeTeamCount: number): string {
  return rank == null || activeTeamCount <= 0 ? '—' : `${rank}/${activeTeamCount}`;
}

export type TeamRisk = 'safe' | 'middle' | 'at-risk';

export interface ActiveStanding {
  rosterId: number;
  rank: number;
  outOf: number;
  risk: TeamRisk;
}

interface StandingCandidate {
  rosterId: number;
  value: number;
  eliminated: boolean;
}

/**
 * Rank one current-team metric among survivors and derive guillotine risk from
 * that same order. Eliminated teams never receive a current standing. Equal
 * values use roster ID so API/input ordering cannot change the result.
 */
export function rankActiveTeams(
  candidates: readonly StandingCandidate[],
  elimsPerWeek: number,
): Map<number, ActiveStanding> {
  const active = candidates
    .filter((candidate) => !candidate.eliminated)
    .sort((a, b) => b.value - a.value || a.rosterId - b.rosterId);
  const outOf = active.length;
  const riskWidth = Math.max(1, elimsPerWeek);
  const standings = new Map<number, ActiveStanding>();

  active.forEach((candidate, index) => {
    const rank = index + 1;
    const fromBottom = outOf - rank;
    const risk: TeamRisk = fromBottom < riskWidth
      ? 'at-risk'
      : fromBottom < riskWidth * 2
        ? 'middle'
        : 'safe';
    standings.set(candidate.rosterId, { rosterId: candidate.rosterId, rank, outOf, risk });
  });

  return standings;
}

function currentElimsPerWeek(elim: EliminationResult): number {
  const lastWeek = elim.weeks[elim.weeks.length - 1];
  return Math.max(1, lastWeek?.eliminated.length || 1);
}

/** Parse league roster_positions into slot requirements. FLEX kept as its own category. */
export interface LineupSlots {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number; // RB/WR/TE
  SUPER_FLEX: number; // QB/RB/WR/TE
  K: number;
  DEF: number;
}

const FLEX_ELIGIBLE = ['RB', 'WR', 'TE'];
const SUPERFLEX_ELIGIBLE = ['QB', 'RB', 'WR', 'TE'];

export function parseLineupSlots(rosterPositions: string[] | undefined): LineupSlots {
  const slots: LineupSlots = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0, K: 0, DEF: 0 };
  for (const p of rosterPositions ?? []) {
    if (p === 'QB') slots.QB++;
    else if (p === 'RB') slots.RB++;
    else if (p === 'WR') slots.WR++;
    else if (p === 'TE') slots.TE++;
    else if (p === 'FLEX' || p === 'WRRB_FLEX' || p === 'REC_FLEX') slots.FLEX++;
    else if (p === 'SUPER_FLEX' || p === 'QB_FLEX') slots.SUPER_FLEX++;
    else if (p === 'K') slots.K++;
    else if (p === 'DEF') slots.DEF++;
  }
  // Sensible default if a league omits roster_positions
  if (Object.values(slots).every((v) => v === 0)) {
    slots.QB = 1; slots.RB = 2; slots.WR = 2; slots.TE = 1; slots.FLEX = 1; slots.K = 1; slots.DEF = 1;
  }
  return slots;
}

/**
 * Compute a team's best possible starting lineup from one shared weekly projection map.
 * Greedy fill: fixed positions first, then FLEX from best remaining eligible, then SUPER_FLEX.
 * Missing player projections are worth zero; historical scores are never substituted.
 */
export function projectBestLineup(
  playerIds: string[],
  projections: ReadonlyMap<string, WeeklyScoredPlayer>,
  slots: LineupSlots,
): { total: number; starters: { playerId: string; position: string; proj: number }[] } {
  const byPos = new Map<string, { playerId: string; proj: number }[]>();
  for (const pid of playerIds) {
    const projection = projections.get(pid);
    const pos = projection?.position ?? getPlayerPosition(pid);
    const proj = projection?.points ?? 0;
    const arr = byPos.get(pos) ?? [];
    arr.push({ playerId: pid, proj });
    byPos.set(pos, arr);
  }
  for (const arr of byPos.values()) {
    arr.sort((a, b) => b.proj - a.proj || a.playerId.localeCompare(b.playerId));
  }

  const used = new Set<string>();
  const starters: { playerId: string; position: string; proj: number }[] = [];

  const take = (pos: string, n: number) => {
    const arr = byPos.get(pos) ?? [];
    let taken = 0;
    for (const cand of arr) {
      if (taken >= n) break;
      if (used.has(cand.playerId)) continue;
      used.add(cand.playerId);
      starters.push({ playerId: cand.playerId, position: pos, proj: cand.proj });
      taken++;
    }
  };

  take('QB', slots.QB);
  take('RB', slots.RB);
  take('WR', slots.WR);
  take('TE', slots.TE);

  const bestFrom = (eligible: string[]) => {
    let best: { playerId: string; position: string; proj: number } | null = null;
    for (const pos of eligible) {
      for (const cand of byPos.get(pos) ?? []) {
        if (used.has(cand.playerId)) continue;
        if (!best || cand.proj > best.proj) best = { playerId: cand.playerId, position: pos, proj: cand.proj };
        break; // arr sorted desc; first unused is best for this pos
      }
    }
    return best;
  };

  for (let i = 0; i < slots.FLEX; i++) {
    const b = bestFrom(FLEX_ELIGIBLE);
    if (!b) break;
    used.add(b.playerId);
    starters.push({ ...b, position: 'FLEX' });
  }
  for (let i = 0; i < slots.SUPER_FLEX; i++) {
    const b = bestFrom(SUPERFLEX_ELIGIBLE);
    if (!b) break;
    used.add(b.playerId);
    starters.push({ ...b, position: 'SFLEX' });
  }
  take('K', slots.K);
  take('DEF', slots.DEF);

  const total = starters.reduce((s, x) => s + x.proj, 0);
  return { total, starters };
}

export interface TeamProjection {
  rosterId: number;
  displayName: string;
  /** Null when a current Sleeper weekly projection is unavailable. */
  projPoints: number | null;
  eliminated: boolean;
  projRank: number; // 1 = highest projected survivor; 0 when eliminated
  projOutOf: number; // active-team count; 0 when eliminated
  risk: TeamRisk;
  starters: { playerId: string; position: string; proj: number }[];
}

export function formatProjectedCurrentRank(projection: TeamProjection | undefined): string {
  if (!projection || projection.eliminated) return '—';
  return formatCurrentRank(projection.projRank, projection.projOutOf);
}

/**
 * Project every team's optimized lineup from the same Sleeper weekly point map and classify
 * survivors by that score. A null/empty map keeps projection fields unavailable; it never falls
 * back to historical matchup scoring.
 */
export function projectAllTeams(
  rosters: Roster[],
  weeklyProjections: ReadonlyMap<string, WeeklyScoredPlayer> | null,
  league: League | undefined,
  elim: EliminationResult,
): TeamProjection[] {
  const slots = parseLineupSlots(league?.roster_positions);
  const projectionsAvailable = weeklyProjections != null && weeklyProjections.size > 0;
  const rows: TeamProjection[] = rosters.map((r) => {
    const info = elim.teams.get(r.roster_id);
    const eliminated = info?.eliminatedWeek != null;
    const lineup = projectionsAvailable
      ? projectBestLineup(r.players ?? [], weeklyProjections, slots)
      : { total: null, starters: [] };
    return {
      rosterId: r.roster_id,
      displayName: info?.displayName ?? `Team ${r.roster_id}`,
      projPoints: lineup.total,
      eliminated,
      projRank: 0,
      projOutOf: 0,
      risk: 'middle',
      starters: lineup.starters,
    };
  });

  if (projectionsAvailable) {
    const standings = rankActiveTeams(
      rows.map((row) => ({
        rosterId: row.rosterId,
        value: row.projPoints ?? 0,
        eliminated: row.eliminated,
      })),
      currentElimsPerWeek(elim),
    );
    for (const row of rows) {
      const standing = standings.get(row.rosterId);
      if (!standing) continue;
      row.projRank = standing.rank;
      row.projOutOf = standing.outOf;
      row.risk = standing.risk;
    }
  }

  return rows.sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (a.eliminated) return a.rosterId - b.rosterId;
    return a.projRank - b.projRank || a.rosterId - b.rosterId;
  });
}

// ---- Position-group scoring ranks (Teams section) ----

export interface PosGroupRank {
  position: string; // QB, RB, WR, TE, FLEX, K, DEF
  points: number; // this team's starter points at this position (season)
  rank: number; // 1 = best in league
  outOf: number;
}

const POS_GROUPS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'];

/**
 * For each team, compute season starter points by position group vs the league.
 * Uses actual starters_points from matchups (historical). FLEX is its own group:
 * a started RB/WR/TE beyond the fixed slots is credited to FLEX.
 * Only active roster IDs participate in the current standings. Eliminated
 * rosters retain their historical matchup data, but are excluded from both the
 * result and every position's comparison pool.
 * Returns Map<active rosterId, PosGroupRank[]>.
 */
export function computePositionGroupRanks(
  weekMatchups: Map<number, Matchup[]>,
  league: League | undefined,
  activeRosterIds: ReadonlySet<number>,
): Map<number, PosGroupRank[]> {
  const slots = parseLineupSlots(league?.roster_positions);
  // rosterId -> pos -> total points
  const teamPos = new Map<number, Map<string, number>>();

  for (const matchups of weekMatchups.values()) {
    for (const m of matchups) {
      if (!m.starters || !m.starters_points) continue;
      const posCount: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 };
      const map = teamPos.get(m.roster_id) ?? new Map<string, number>();
      m.starters.forEach((pid, i) => {
        const pts = m.starters_points?.[i] ?? 0;
        if (!pid || pid === '0') return;
        const pos = getPlayerPosition(pid);
        // Determine if this fills a fixed slot or overflows to FLEX
        let group = pos;
        if (['RB', 'WR', 'TE'].includes(pos)) {
          const fixed = pos === 'RB' ? slots.RB : pos === 'WR' ? slots.WR : slots.TE;
          if (posCount[pos] >= fixed) group = 'FLEX';
        }
        posCount[pos] = (posCount[pos] ?? 0) + 1;
        map.set(group, (map.get(group) ?? 0) + pts);
      });
      teamPos.set(m.roster_id, map);
    }
  }

  // Rank each position group across teams
  const result = new Map<number, PosGroupRank[]>();
  const rosterIds = [...activeRosterIds];
  for (const pos of POS_GROUPS) {
    const arr = rosterIds
      .map((rid) => ({ rid, pts: teamPos.get(rid)?.get(pos) ?? 0 }))
      .sort((a, b) => b.pts - a.pts || a.rid - b.rid);
    arr.forEach((e, i) => {
      const list = result.get(e.rid) ?? [];
      list.push({ position: pos, points: e.pts, rank: i + 1, outOf: arr.length });
      result.set(e.rid, list);
    });
  }
  return result;
}

// ---- Historical points rank (total season points) ----
export interface HistoricalRank extends ActiveStanding {
  totalPoints: number;
}

/** Cumulative points standings for current survivors only. */
export function computeHistoricalRanks(elim: EliminationResult): Map<number, HistoricalRank> {
  const activeRosterIds = new Set(
    [...elim.teams.values()]
      .filter((team) => team.eliminatedWeek == null)
      .map((team) => team.rosterId),
  );
  const totals = new Map<number, number>(
    [...activeRosterIds].map((rosterId) => [rosterId, 0]),
  );
  for (const week of elim.weeks) {
    for (const score of week.scores) {
      if (!activeRosterIds.has(score.rosterId)) continue;
      totals.set(score.rosterId, (totals.get(score.rosterId) ?? 0) + score.points);
    }
  }

  const standings = rankActiveTeams(
    [...totals.entries()].map(([rosterId, totalPoints]) => ({
      rosterId,
      value: totalPoints,
      eliminated: false,
    })),
    currentElimsPerWeek(elim),
  );
  const historical = new Map<number, HistoricalRank>();
  for (const [rosterId, totalPoints] of totals) {
    const standing = standings.get(rosterId);
    if (standing) historical.set(rosterId, { ...standing, totalPoints });
  }
  return historical;
}

export function orderTeamProjections(
  projections: readonly TeamProjection[],
  historicalRanks: ReadonlyMap<number, HistoricalRank>,
  orderBy: 'projected' | 'historical',
): TeamProjection[] {
  return [...projections].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (a.eliminated) return a.rosterId - b.rosterId;
    if (orderBy === 'projected') return a.projRank - b.projRank;
    return (historicalRanks.get(a.rosterId)?.rank ?? Number.MAX_SAFE_INTEGER)
      - (historicalRanks.get(b.rosterId)?.rank ?? Number.MAX_SAFE_INTEGER)
      || a.rosterId - b.rosterId;
  });
}
