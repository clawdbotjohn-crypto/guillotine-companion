import type { Matchup, Roster, Transaction, User } from './api';
import { getPlayerName, getPlayerInfo } from './api';

export interface WeekData {
  week: number;
  teamsRemaining: number;
  scores: { rosterId: number; points: number; rank: number }[];
  topScore: number;
  avgScore: number;
  cutoffScore: number;
  eliminated: number[];
}

export interface TeamInfo {
  rosterId: number;
  userId: string;
  displayName: string;
  eliminatedWeek: number | null;
}

export interface BidInfo {
  week: number;
  rosterId: number;
  playerId: string;
  playerName: string;
  position: string;
  amount: number;
  status: string;
}

export function buildTeamMap(rosters: Roster[], users: User[]): Map<number, TeamInfo> {
  const userMap = new Map(users.map(u => [u.user_id, u.display_name]));
  const map = new Map<number, TeamInfo>();
  for (const r of rosters) {
    map.set(r.roster_id, {
      rosterId: r.roster_id,
      userId: r.owner_id,
      displayName: userMap.get(r.owner_id) || `Team ${r.roster_id}`,
      eliminatedWeek: null,
    });
  }
  return map;
}

export function computeEliminations(
  weekMatchups: Map<number, Matchup[]>,
  _totalTeams: number,
  maxWeek: number
): { weekData: WeekData[]; elimOrder: Map<number, number> } {
  const active = new Set<number>();
  // Init from week 1 matchups
  const wk1 = weekMatchups.get(1);
  if (wk1) wk1.forEach(m => active.add(m.roster_id));

  const weekData: WeekData[] = [];
  const elimOrder = new Map<number, number>();

  // Determine eliminations per week based on team count
  function getElimsPerWeek(remaining: number): number {
    if (remaining > 4) return 2;
    if (remaining > 2) return 1;
    return 1;
  }

  for (let week = 1; week <= maxWeek; week++) {
    const matchups = weekMatchups.get(week);
    if (!matchups) break;

    const scores: { rosterId: number; points: number; rank: number }[] = [];
    for (const m of matchups) {
      if (active.has(m.roster_id) && m.points != null) {
        scores.push({ rosterId: m.roster_id, points: m.points, rank: 0 });
      }
    }

    if (scores.length === 0) break;

    // Sort by score descending for ranking
    scores.sort((a, b) => b.points - a.points);
    scores.forEach((s, i) => (s.rank = i + 1));

    const teamsRemaining = scores.length;
    const topScore = scores[0]?.points || 0;
    const avgScore = scores.reduce((s, x) => s + x.points, 0) / scores.length;

    // Finals: 2 teams remain — no elimination, just champion vs runner-up
    const isFinals = teamsRemaining === 2;
    const elimCount = isFinals ? 0 : getElimsPerWeek(teamsRemaining);
    const eliminated: number[] = [];

    if (elimCount > 0 && teamsRemaining > 2) {
      // Bottom N scores get eliminated
      const sorted = [...scores].sort((a, b) => a.points - b.points);
      for (let i = 0; i < elimCount && i < sorted.length; i++) {
        eliminated.push(sorted[i].rosterId);
        active.delete(sorted[i].rosterId);
        elimOrder.set(sorted[i].rosterId, week);
      }
    }

    const cutoffScore = eliminated.length > 0
      ? Math.max(...eliminated.map(id => scores.find(s => s.rosterId === id)?.points || 0))
      : scores[scores.length - 1]?.points || 0;

    weekData.push({ week, teamsRemaining, scores, topScore, avgScore, cutoffScore, eliminated });

    // Stop after finals (2 teams played, winner is champion, loser is runner-up)
    if (isFinals || active.size <= 1) break;
  }

  return { weekData, elimOrder };
}

export function extractBids(weekTransactions: Map<number, Transaction[]>): BidInfo[] {
  const bids: BidInfo[] = [];
  for (const [week, txns] of weekTransactions.entries()) {
    for (const t of txns) {
      if (t.type === 'waiver' && t.status === 'complete' && t.adds && t.settings?.waiver_bid != null) {
        for (const [playerId, rosterId] of Object.entries(t.adds)) {
          const info = getPlayerInfo(playerId);
          bids.push({
            week,
            rosterId,
            playerId,
            playerName: getPlayerName(playerId),
            position: info?.pos || 'UNK',
            amount: t.settings!.waiver_bid!,
            status: 'complete',
          });
        }
      }
    }
  }
  return bids;
}

export function getTeamBids(bids: BidInfo[], rosterId: number): BidInfo[] {
  return bids.filter(b => b.rosterId === rosterId);
}

export function getTopBidByWeek(bids: BidInfo[]): { week: number; amount: number; playerName: string; position: string }[] {
  const byWeek = new Map<number, BidInfo>();
  for (const b of bids) {
    const existing = byWeek.get(b.week);
    if (!existing || b.amount > existing.amount) {
      byWeek.set(b.week, b);
    }
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, bid]) => ({ week, amount: bid.amount, playerName: bid.playerName, position: bid.position }));
}
