import { describe, expect, it } from 'vitest';
import { biddingProfileTransactionFixture } from '../__fixtures__/biddingProfileTransactions';
import { classifyCanonicalBidEvents, type CanonicalBidEvent } from '../biddingProfiles';
import { buildCompletedAuctions, summarizeBiddingHistory } from '../biddingHistory';

function bid(overrides: Partial<CanonicalBidEvent> = {}): CanonicalBidEvent {
  return {
    transactionId: 'winner',
    managerRosterId: 1,
    playerId: 'player-a',
    transactionWeek: 3,
    decisionWeek: 4,
    batchKey: '3:1:5000',
    actualBid: 100,
    outcome: 'won',
    createdAt: 1_000,
    processedAt: 5_000,
    faabAvailableBeforeBid: 1_000,
    faabReconstruction: 'transaction-ledger',
    duplicateCount: 1,
    ...overrides,
  };
}

describe('league-wide bidding history', () => {
  it('groups canonical wins with legitimate losses and identifies the runner-up', () => {
    const auctions = buildCompletedAuctions([
      bid(),
      bid({ transactionId: 'loss-low', managerRosterId: 2, actualBid: 40, outcome: 'legitimate-loss' }),
      bid({ transactionId: 'loss-high', managerRosterId: 3, actualBid: 90, outcome: 'legitimate-loss', duplicateCount: 2 }),
    ]);

    expect(auctions).toHaveLength(1);
    expect(auctions[0]).toMatchObject({
      playerId: 'player-a',
      hasIncompleteParticipationEvidence: false,
      runnerUp: { transactionId: 'loss-high', actualBid: 90 },
    });
    expect(auctions[0].legitimateLosses.map((event) => event.transactionId)).toEqual(['loss-high', 'loss-low']);
  });

  it('retains a true $0 winning claim while leaving missing losing evidence unknown', () => {
    const [auction] = buildCompletedAuctions([bid({ actualBid: 0 })]);
    expect(auction.winner.actualBid).toBe(0);
    expect(auction.runnerUp).toBeNull();
    expect(auction.hasIncompleteParticipationEvidence).toBe(true);
  });

  it('never resurrects duplicate alternatives, roster-full failures, or unmatched failures excluded by the canonical parser', () => {
    const events = classifyCanonicalBidEvents(biddingProfileTransactionFixture, 1_000);
    const auctions = buildCompletedAuctions(events);
    expect(auctions).toHaveLength(2);
    expect(events.map((event) => event.transactionId)).not.toContain('invalid-roster-failure');
    expect(events.map((event) => event.transactionId)).not.toContain('unmatched-failure');
    expect(events.map((event) => event.transactionId)).not.toContain('duplicate-drop-path-player-a');
    expect(auctions.find((auction) => auction.playerId === 'playerA')?.runnerUp).toMatchObject({
      actualBid: 90,
      duplicateCount: 2,
    });
  });

  it('computes auction count, median, total, and top winning prices from wins only', () => {
    const auctions = buildCompletedAuctions([
      bid({ transactionId: 'a', playerId: 'a', batchKey: 'a', actualBid: 0 }),
      bid({ transactionId: 'b', playerId: 'b', batchKey: 'b', actualBid: 50 }),
      bid({ transactionId: 'c', playerId: 'c', batchKey: 'c', actualBid: 200 }),
      bid({ transactionId: 'c-loss', playerId: 'c', batchKey: 'c', managerRosterId: 4, actualBid: 175, outcome: 'legitimate-loss' }),
      bid({ transactionId: 'd', playerId: 'd', batchKey: 'd', actualBid: 100 }),
    ]);
    expect(summarizeBiddingHistory(auctions)).toEqual({
      auctionCount: 4,
      medianWinningBid: 75,
      totalFaabSpent: 350,
      topWinningPrices: [200, 100, 50],
    });
  });
});
