// Elimination detection algorithm
// Pure logic — no React dependencies

import type { Matchup } from '../api/types';

export interface WeekData {
  week: number;
  teamsRemaining: number;
  scores: Array<{ rosterId: number; points: number; rank: number }>;
  topScore: number;
  avgScore: number;
  cutoffScore: number;
  eliminated: number[];
}

export interface EliminationResult {
  weekData: WeekData[];
  eliminationOrder: Map<number, number>; // rosterId -> week eliminated
  champion: number | null;
  runnerUp: number | null;
  isComplete: boolean;
}

/**
 * Determine how many teams get eliminated per week based on remaining count.
 * Most guillotine leagues eliminate 2/week when >16 teams, 1/week after.
 * We detect the actual pattern from team count progression.
 */
function getElimsPerWeek(remaining: number): number {
  if (remaining > 16) return 2;
  if (remaining > 2) return 1;
  return 0; // Finals — no elimination
}

/**
 * Compute full elimination timeline from weekly matchup data.
 */
export function computeEliminations(
  weekMatchups: Map<number, Matchup[]>,
  maxWeek: number
): EliminationResult {
  const active = new Set<number>();
  const weekData: WeekData[] = [];
  const eliminationOrder = new Map<number, number>();

  // Initialize active set from week 1
  const wk1 = weekMatchups.get(1);
  if (wk1) {
    wk1.forEach((m) => active.add(m.roster_id));
  }

  for (let week = 1; week <= maxWeek; week++) {
    const matchups = weekMatchups.get(week);
    if (!matchups) break;

    // Get scores for active teams only
    const scores: Array<{ rosterId: number; points: number; rank: number }> = [];
    for (const m of matchups) {
      if (active.has(m.roster_id) && m.points != null) {
        scores.push({ rosterId: m.roster_id, points: m.points, rank: 0 });
      }
    }

    if (scores.length === 0) break;

    // Sort descending for ranking
    scores.sort((a, b) => b.points - a.points);
    scores.forEach((s, i) => (s.rank = i + 1));

    const teamsRemaining = scores.length;
    const elimCount = getElimsPerWeek(teamsRemaining);
    const eliminated: number[] = [];

    if (elimCount > 0 && teamsRemaining > 2) {
      // Bottom N teams eliminated
      const sortedAsc = [...scores].sort((a, b) => a.points - b.points);
      for (let i = 0; i < elimCount && i < sortedAsc.length - 2; i++) {
        eliminated.push(sortedAsc[i].rosterId);
        active.delete(sortedAsc[i].rosterId);
        eliminationOrder.set(sortedAsc[i].rosterId, week);
      }
    }

    const topScore = scores[0]?.points ?? 0;
    const avgScore = scores.reduce((sum, s) => sum + s.points, 0) / scores.length;
    const cutoffScore = eliminated.length > 0
      ? Math.max(...eliminated.map((id) => scores.find((s) => s.rosterId === id)!.points))
      : scores[scores.length - 1]?.points ?? 0;

    weekData.push({
      week,
      teamsRemaining,
      scores,
      topScore,
      avgScore,
      cutoffScore,
      eliminated,
    });
  }

  // Determine champion and runner-up
  const finalWeek = weekData[weekData.length - 1];
  let champion: number | null = null;
  let runnerUp: number | null = null;
  const isComplete = active.size <= 2 && weekData.length > 0;

  if (isComplete && finalWeek && finalWeek.scores.length === 2) {
    const sorted = [...finalWeek.scores].sort((a, b) => b.points - a.points);
    champion = sorted[0].rosterId;
    runnerUp = sorted[1].rosterId;
  }

  return { weekData, eliminationOrder, champion, runnerUp, isComplete };
}
