import type { BidInfo, TeamInfo } from '../logic/elimination';

export interface BidChartPoint extends BidInfo {
  plotWeek: number;
  teamName: string;
}

export interface BidWeekSummary {
  week: number;
  count: number;
}

/**
 * Preserve every observed bid as one point. Small deterministic horizontal offsets make dense
 * same-week data inspectable without moving a point into another week's visual band.
 */
export function buildBidChartData(
  bids: BidInfo[],
  weeks: number[],
  teams: Map<number, TeamInfo>,
  positions?: readonly string[],
): { points: BidChartPoint[]; summary: BidWeekSummary[] } {
  const allowedPositions = positions ? new Set(positions) : null;
  const filteredBids = allowedPositions
    ? bids.filter((bid) => allowedPositions.has(bid.position))
    : bids;
  const bidsByWeek = new Map<number, BidInfo[]>();

  for (const bid of filteredBids) {
    const weekBids = bidsByWeek.get(bid.week) ?? [];
    weekBids.push(bid);
    bidsByWeek.set(bid.week, weekBids);
  }

  const points: BidChartPoint[] = [];
  for (const week of weeks) {
    const weekBids = bidsByWeek.get(week) ?? [];
    weekBids.forEach((bid, index) => {
      const offset = weekBids.length <= 1
        ? 0
        : ((index / (weekBids.length - 1)) - 0.5) * 0.56;
      points.push({
        ...bid,
        plotWeek: week + offset,
        teamName: teams.get(bid.rosterId)?.displayName ?? `Team ${bid.rosterId}`,
      });
    });
  }

  return {
    points,
    summary: weeks.map((week) => ({ week, count: bidsByWeek.get(week)?.length ?? 0 })),
  };
}
