// Elimination detection engine for guillotine leagues

import type { Matchup, Roster, SleeperUser } from '../api/types';

export interface WeekResult {
  week: number;
  teamsRemaining: number;
  scores: TeamScore[];
  topScore: number;
  avgScore: number;
  lowScore: number;
  cutoffScore: number;
  eliminated: number[];
  isFinals: boolean;
}

export interface TeamScore {
  rosterId: number;
  points: number;
  rank: number;
}

export interface TeamInfo {
  rosterId: number;
  userId: string;
  displayName: string;
  eliminatedWeek: number | null;
  isChampion: boolean;
  isRunnerUp: boolean;
}

export interface EliminationResult {
  weeks: WeekResult[];
  teams: Map<number, TeamInfo>;
  champion: number | null;
  runnerUp: number | null;
  isComplete: boolean;
  currentWeek: number;
}

/**
 * Determine how many teams get eliminated per week based on remaining count.
 * Standard guillotine: 2/week when >16 teams, 1/week otherwise.
 * Some leagues always do 1/week. We detect from actual data patterns.
 */
function getElimsPerWeek(remaining: number): number {
  // Most guillotine leagues:
  // - 2 per week when > 16 teams
  // - 1 per week when <= 16
  // But we'll be conservative: 2 when > 4, 1 when <= 4
  // The actual detection happens by comparing week-to-week team counts
  if (remaining > 16) return 2;
  if (remaining > 2) return 1;
  return 0;
}

/**
 * Auto-detect elimination rate from actual matchup data.
 * Returns eliminations per week or null if can't determine.
 */
function detectElimRate(weekMatchups: Map<number, Matchup[]>): number | null {
  const weeks = [...weekMatchups.keys()].sort((a, b) => a - b);
  if (weeks.length < 2) return null;

  const counts: number[] = [];
  for (const w of weeks) {
    const m = weekMatchups.get(w)!;
    const active = m.filter((x) => x.points != null && x.points > 0);
    counts.push(active.length);
  }

  // Check transitions
  const diffs: number[] = [];
  for (let i = 1; i < counts.length; i++) {
    const diff = counts[i - 1] - counts[i];
    if (diff > 0) diffs.push(diff);
  }

  if (diffs.length === 0) return 1;

  // If most diffs are 2, it's 2-per-week
  const twos = diffs.filter((d) => d === 2).length;
  return twos > diffs.length / 2 ? 2 : 1;
}

export function computeEliminations(
  weekMatchups: Map<number, Matchup[]>,
  rosters: Roster[],
  users: SleeperUser[],
): EliminationResult {
  // Build team map
  const userMap = new Map(users.map((u) => [u.user_id, u.display_name]));
  const teams = new Map<number, TeamInfo>();
  for (const r of rosters) {
    teams.set(r.roster_id, {
      rosterId: r.roster_id,
      userId: r.owner_id,
      displayName: userMap.get(r.owner_id) || `Team ${r.roster_id}`,
      eliminatedWeek: null,
      isChampion: false,
      isRunnerUp: false,
    });
  }

  const active = new Set<number>();
  const wk1 = weekMatchups.get(1);
  if (wk1) wk1.forEach((m) => active.add(m.roster_id));

  // Detect elim rate from data or fall back to heuristic
  const detectedRate = detectElimRate(weekMatchups);

  const weeks: WeekResult[] = [];
  const sortedWeekNums = [...weekMatchups.keys()].sort((a, b) => a - b);

  for (const week of sortedWeekNums) {
    const matchups = weekMatchups.get(week)!;
    const scores: TeamScore[] = [];

    for (const m of matchups) {
      if (active.has(m.roster_id) && m.points != null) {
        scores.push({ rosterId: m.roster_id, points: m.points, rank: 0 });
      }
    }

    if (scores.length === 0) break;

    // Rank descending
    scores.sort((a, b) => b.points - a.points);
    scores.forEach((s, i) => (s.rank = i + 1));

    const teamsRemaining = scores.length;
    const topScore = scores[0]?.points || 0;
    const avgScore = scores.reduce((s, x) => s + x.points, 0) / scores.length;
    const lowScore = scores[scores.length - 1]?.points || 0;

    const isFinals = teamsRemaining === 2;
    const elimCount = isFinals ? 0 : (detectedRate ?? getElimsPerWeek(teamsRemaining));
    const eliminated: number[] = [];

    if (elimCount > 0 && teamsRemaining > 2) {
      const sorted = [...scores].sort((a, b) => a.points - b.points);
      for (let i = 0; i < elimCount && i < sorted.length; i++) {
        eliminated.push(sorted[i].rosterId);
        active.delete(sorted[i].rosterId);
        const team = teams.get(sorted[i].rosterId);
        if (team) team.eliminatedWeek = week;
      }
    }

    const cutoffScore =
      eliminated.length > 0
        ? Math.max(...eliminated.map((id) => scores.find((s) => s.rosterId === id)?.points || 0))
        : lowScore;

    weeks.push({
      week,
      teamsRemaining,
      scores,
      topScore,
      avgScore,
      lowScore,
      cutoffScore,
      eliminated,
      isFinals,
    });

    if (isFinals || active.size <= 1) break;
  }

  // Determine champion & runner-up
  let champion: number | null = null;
  let runnerUp: number | null = null;
  const lastWeek = weeks[weeks.length - 1];
  if (lastWeek?.isFinals && lastWeek.scores.length === 2) {
    champion = lastWeek.scores[0].rosterId; // highest score
    runnerUp = lastWeek.scores[1].rosterId; // lower score
    const champTeam = teams.get(champion);
    if (champTeam) champTeam.isChampion = true;
    const ruTeam = teams.get(runnerUp);
    if (ruTeam) ruTeam.isRunnerUp = true;
  }

  return {
    weeks,
    teams,
    champion,
    runnerUp,
    isComplete: champion !== null,
    currentWeek: weeks.length,
  };
}

/**
 * Extract FAAB bids from transactions
 */
export interface BidInfo {
  week: number;
  rosterId: number;
  playerId: string;
  playerName: string;
  position: string;
  amount: number;
  status: string;
}

import { getPlayerName as getPlayerNameFromStore, getPlayerPosition } from '../store/players';
import type { Transaction } from '../api/types';

export function extractBids(weekTransactions: Map<number, Transaction[]>): BidInfo[] {
  const bids: BidInfo[] = [];
  for (const [week, txns] of weekTransactions.entries()) {
    for (const t of txns) {
      if (t.type === 'waiver' && t.status === 'complete' && t.adds && t.settings?.waiver_bid != null) {
        for (const [playerId, rosterId] of Object.entries(t.adds)) {
          bids.push({
            week,
            rosterId,
            playerId,
            playerName: getPlayerNameFromStore(playerId),
            position: getPlayerPosition(playerId),
            amount: t.settings!.waiver_bid!,
            status: 'complete',
          });
        }
      }
    }
  }
  return bids.sort((a, b) => a.week - b.week || b.amount - a.amount);
}

/**
 * Check if a league is a guillotine format.
 * Guillotine leagues: no playoffs, teams get eliminated each week.
 */
export function isGuillotineLeague(league: { settings: Record<string, number>; roster_positions?: string[] }): boolean {
  // Guillotine leagues typically have:
  // - playoff_weeks = 0 (no playoffs)
  // - type = 0 (redraft) — but we don't filter by this per spec
  // Best heuristic: no playoff teams
  const playoffTeams = league.settings?.playoff_teams ?? 0;
  return playoffTeams === 0;
}
