import type { BidInfo, TeamInfo } from '../logic/elimination';

export interface BidChartPoint extends BidInfo {
  plotWeek: number;
  teamName: string;
}

export interface BidWeekSummary {
  week: number;
  count: number;
}

const BID_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});

export function formatBidTimestamp(createdAt: number): string {
  return BID_TIME_FORMATTER.format(new Date(createdAt));
}

/**
 * Preserve every observed bid as one point while keeping NFL weeks as the chart's only x buckets.
 * Transaction timestamps remain point metadata for detail views; they never affect x geometry.
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
    for (const bid of weekBids) {
      points.push({
        ...bid,
        plotWeek: week,
        teamName: teams.get(bid.rosterId)?.displayName ?? `Team ${bid.rosterId}`,
      });
    }
  }

  return {
    points,
    summary: weeks.map((week) => ({ week, count: bidsByWeek.get(week)?.length ?? 0 })),
  };
}
