import type { CanonicalBidEvent } from './biddingProfiles';

export interface CompletedAuction {
  auctionKey: string;
  playerId: string;
  transactionWeek: number;
  decisionWeek: number;
  winner: CanonicalBidEvent;
  legitimateLosses: CanonicalBidEvent[];
  runnerUp: CanonicalBidEvent | null;
  /** Public history has no canonical losing-bid evidence; this never implies a $0 participant. */
  hasIncompleteParticipationEvidence: boolean;
  hasAmbiguousWinnerEvidence: boolean;
}

export interface BiddingHistorySummary {
  auctionCount: number;
  medianWinningBid: number | null;
  totalFaabSpent: number;
  topWinningPrices: number[];
}

/**
 * Builds league-wide auctions exclusively from the canonical bid classifier's output. This layer
 * intentionally does not inspect raw failed transactions, infer missing participants, or turn
 * absent evidence into zero-dollar bids.
 */
export function buildCompletedAuctions(events: readonly CanonicalBidEvent[]): CompletedAuction[] {
  const groups = new Map<string, CanonicalBidEvent[]>();
  for (const event of events) {
    const key = `${event.batchKey}:${event.playerId}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.entries()].flatMap(([auctionKey, grouped]) => {
    const winners = grouped
      .filter((event) => event.outcome === 'won')
      .sort((a, b) => b.actualBid - a.actualBid || a.transactionId.localeCompare(b.transactionId));
    if (winners.length === 0) return [];

    const legitimateLosses = grouped
      .filter((event) => event.outcome === 'legitimate-loss')
      .sort((a, b) => b.actualBid - a.actualBid || a.transactionId.localeCompare(b.transactionId));
    const winner = winners[0];
    return [{
      auctionKey,
      playerId: winner.playerId,
      transactionWeek: winner.transactionWeek,
      decisionWeek: winner.decisionWeek,
      winner,
      legitimateLosses,
      runnerUp: legitimateLosses[0] ?? null,
      hasIncompleteParticipationEvidence: legitimateLosses.length === 0,
      hasAmbiguousWinnerEvidence: winners.length > 1,
    }];
  }).sort((a, b) =>
    b.transactionWeek - a.transactionWeek
    || b.winner.actualBid - a.winner.actualBid
    || b.winner.createdAt - a.winner.createdAt
    || a.playerId.localeCompare(b.playerId));
}

export function summarizeBiddingHistory(auctions: readonly CompletedAuction[]): BiddingHistorySummary {
  const prices = auctions.map((auction) => auction.winner.actualBid).sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const medianWinningBid = prices.length === 0
    ? null
    : prices.length % 2 === 1
      ? prices[middle]
      : (prices[middle - 1] + prices[middle]) / 2;

  return {
    auctionCount: auctions.length,
    medianWinningBid,
    totalFaabSpent: prices.reduce((sum, price) => sum + price, 0),
    topWinningPrices: [...prices].sort((a, b) => b - a).slice(0, 3),
  };
}
