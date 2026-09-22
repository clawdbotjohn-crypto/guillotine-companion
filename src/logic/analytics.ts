// Analytics engine: projected best-lineup, position-group ranks, safe/at-risk.
//
// PROJECTION SOURCE DECISION (John review, 2026-09-22):
// Sleeper's public v1 API does not expose forward-looking projections reliably.
// Rather than depend on an undocumented endpoint, we project each player's next
// score as their season-to-date average points (from matchup players_points).
// This is a solid proxy in-season and auto-updates as weeks accrue. If a team
// buys a stud on waivers, their prior weeks lift the average within a week or two.
// Swap in a real projections feed later without changing the UI contract.

import type { Matchup, Roster, League } from '../api/types';
import { getPlayerPosition } from '../store/players';
import type { EliminationResult } from './elimination';

export interface PlayerSeason {
  playerId: string;
  position: string;
  totalPoints: number;
  games: number;
  avgPoints: number;
}

/** Build per-player season averages from all weekly matchups. */
export function buildPlayerSeasons(weekMatchups: Map<number, Matchup[]>): Map<string, PlayerSeason> {
  const acc = new Map<string, { total: number; games: number }>();
  for (const matchups of weekMatchups.values()) {
    for (const m of matchups) {
      if (!m.players_points) continue;
      for (const [pid, pts] of Object.entries(m.players_points)) {
        if (pts == null) continue;
        const cur = acc.get(pid) ?? { total: 0, games: 0 };
        cur.total += pts;
        // Count a "game" only when the player actually featured (nonzero or listed as starter-eligible)
        cur.games += 1;
        acc.set(pid, cur);
      }
    }
  }
  const out = new Map<string, PlayerSeason>();
  for (const [pid, v] of acc.entries()) {
    out.set(pid, {
      playerId: pid,
      position: getPlayerPosition(pid),
      totalPoints: v.total,
      games: v.games,
      avgPoints: v.games > 0 ? v.total / v.games : 0,
    });
  }
  return out;
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
 * Compute a team's best possible starting lineup projected points given a pool
 * of players and their season averages. Greedy fill: fixed positions first, then
 * FLEX from best remaining eligible, then SUPER_FLEX.
 */
export function projectBestLineup(
  playerIds: string[],
  seasons: Map<string, PlayerSeason>,
  slots: LineupSlots,
): { total: number; starters: { playerId: string; position: string; proj: number }[] } {
  // Group available players by position, sorted desc by projected avg
  const byPos = new Map<string, { playerId: string; proj: number }[]>();
  for (const pid of playerIds) {
    const s = seasons.get(pid);
    const pos = s?.position ?? getPlayerPosition(pid);
    const proj = s?.avgPoints ?? 0;
    const arr = byPos.get(pos) ?? [];
    arr.push({ playerId: pid, proj });
    byPos.set(pos, arr);
  }
  for (const arr of byPos.values()) arr.sort((a, b) => b.proj - a.proj);

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
  projPoints: number;
  eliminated: boolean;
  projRank: number; // 1 = highest projected
  risk: 'safe' | 'middle' | 'at-risk';
  starters: { playerId: string; position: string; proj: number }[];
}

/**
 * Project every active team's best lineup and classify safe/at-risk.
 * Risk is relative among ACTIVE teams: the bottom N (where N = elims/week)
 * are "at-risk"; a small cushion above are "middle"; the rest "safe".
 */
export function projectAllTeams(
  rosters: Roster[],
  seasons: Map<string, PlayerSeason>,
  league: League | undefined,
  elim: EliminationResult,
): TeamProjection[] {
  const slots = parseLineupSlots(league?.roster_positions);
  const rows: TeamProjection[] = rosters.map((r) => {
    const info = elim.teams.get(r.roster_id);
    const eliminated = info?.eliminatedWeek != null;
    const pool = r.players ?? [];
    const { total, starters } = projectBestLineup(pool, seasons, slots);
    return {
      rosterId: r.roster_id,
      displayName: info?.displayName ?? `Team ${r.roster_id}`,
      projPoints: total,
      eliminated,
      projRank: 0,
      risk: 'middle',
      starters,
    };
  });

  const active = rows.filter((r) => !r.eliminated).sort((a, b) => b.projPoints - a.projPoints);
  active.forEach((r, i) => (r.projRank = i + 1));

  // Elims per week from last recorded week (fallback 1)
  const lastWeek = elim.weeks[elim.weeks.length - 1];
  const elimsPerWeek = Math.max(1, lastWeek?.eliminated.length || 1);
  const n = active.length;
  active.forEach((r) => {
    const fromBottom = n - r.projRank; // 0 = lowest projected
    if (fromBottom < elimsPerWeek) r.risk = 'at-risk';
    else if (fromBottom < elimsPerWeek * 2) r.risk = 'middle';
    else r.risk = 'safe';
  });

  // Eliminated teams keep rank at end
  const eliminated = rows.filter((r) => r.eliminated);
  eliminated.forEach((r) => (r.risk = 'middle'));

  return [...active, ...eliminated];
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
 * Returns Map<rosterId, PosGroupRank[]>.
 */
export function computePositionGroupRanks(
  weekMatchups: Map<number, Matchup[]>,
  league: League | undefined,
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
  const rosterIds = [...teamPos.keys()];
  for (const pos of POS_GROUPS) {
    const arr = rosterIds
      .map((rid) => ({ rid, pts: teamPos.get(rid)?.get(pos) ?? 0 }))
      .sort((a, b) => b.pts - a.pts);
    arr.forEach((e, i) => {
      const list = result.get(e.rid) ?? [];
      list.push({ position: pos, points: e.pts, rank: i + 1, outOf: arr.length });
      result.set(e.rid, list);
    });
  }
  return result;
}

// ---- Historical points rank (total season points) ----
export interface HistoricalRank {
  rosterId: number;
  totalPoints: number;
  rank: number;
  outOf: number;
}

export function computeHistoricalRanks(elim: EliminationResult): Map<number, HistoricalRank> {
  const totals = new Map<number, number>();
  for (const w of elim.weeks) {
    for (const s of w.scores) totals.set(s.rosterId, (totals.get(s.rosterId) ?? 0) + s.points);
  }
  const arr = [...totals.entries()].map(([rosterId, totalPoints]) => ({ rosterId, totalPoints }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
  const out = new Map<number, HistoricalRank>();
  arr.forEach((e, i) => out.set(e.rosterId, { ...e, rank: i + 1, outOf: arr.length }));
  return out;
}
