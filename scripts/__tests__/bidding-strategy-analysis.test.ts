import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../src/api/types.ts';
import {
  bootstrapMaeInterval,
  classifyTransactionsWithAudit,
  computeErrorMetrics,
  flagIsolatedOutliers,
  isTokenBid,
  spearmanCorrelation,
  type EvaluatedBid,
} from '../bidding-strategy-analysis.ts';

function transaction(overrides: Partial<Transaction> & Pick<Transaction, 'transaction_id'>): Transaction {
  return {
    type: 'waiver',
    status: 'complete',
    roster_ids: [1],
    adds: { player: 1 },
    drops: null,
    settings: { waiver_bid: 25 },
    metadata: null,
    waiver_budget: null,
    leg: 1,
    created: 100,
    status_updated: 200,
    ...overrides,
  };
}

describe('canonical transaction classifier', () => {
  it('keeps completed wins and only same-batch/player proven losses', () => {
    const winner = transaction({ transaction_id: 'winner', roster_ids: [1], adds: { p1: 1 }, status_updated: 500 });
    const provenLoss = transaction({
      transaction_id: 'loss', status: 'failed', roster_ids: [2], adds: { p1: 2 },
      settings: { waiver_bid: 20 }, metadata: { notes: 'Player was claimed by another owner' }, status_updated: 500,
    });
    const wrongBatch = transaction({
      transaction_id: 'wrong-batch', status: 'failed', roster_ids: [3], adds: { p1: 3 },
      metadata: { notes: 'Player was claimed by another owner' }, status_updated: 501,
    });
    const wrongPlayer = transaction({
      transaction_id: 'wrong-player', status: 'failed', roster_ids: [4], adds: { p2: 4 },
      metadata: { notes: 'Player was claimed by another owner' }, status_updated: 500,
    });
    const result = classifyTransactionsWithAudit(new Map([[1, [winner, provenLoss, wrongBatch, wrongPlayer]]]), 500);
    expect(result.events.map((event) => [event.transactionId, event.outcome, event.decisionWeek])).toEqual([
      ['loss', 'legitimate-loss', 2], ['winner', 'won', 2],
    ]);
    expect(result.audit.exclusions['waiver:failed-claim-without-same-batch-winner']).toBe(2);
  });

  it('deduplicates contingency/drop paths by max bid and reconstructs prior spend and transfers', () => {
    const priorSpend = transaction({ transaction_id: 'prior', roster_ids: [2], adds: { old: 2 }, settings: { waiver_bid: 100 }, created: 10, status_updated: 20 });
    const transfer = transaction({ transaction_id: 'trade', type: 'trade', roster_ids: [2, 3], adds: null, settings: null, created: 30, status_updated: 40, waiver_budget: [{ sender: 2, receiver: 3, amount: 50 }] });
    const pathA = transaction({ transaction_id: 'path-a', roster_ids: [2], adds: { target: 2 }, drops: { a: 2 }, settings: { waiver_bid: 60 }, created: 100, status_updated: 200 });
    const pathB = transaction({ transaction_id: 'path-b', roster_ids: [2], adds: { target: 2 }, drops: { b: 2 }, settings: { waiver_bid: 70 }, created: 101, status_updated: 200 });
    const result = classifyTransactionsWithAudit(new Map([[1, [priorSpend, transfer, pathA, pathB]]]), 500);
    const target = result.events.find((event) => event.playerId === 'target')!;
    expect(target.actualBid).toBe(70);
    expect(target.duplicateCount).toBe(2);
    expect(target.faabAvailableBeforeBid).toBe(350);
    expect(target.faabReconstruction).toBe('transaction-ledger');
    expect(result.audit.duplicateCandidatePathsRemoved).toBe(1);
    expect(result.audit.completedLedgerTransferRows).toBe(1);
  });

  it('labels lower-bound repair and uncertain timestamp rather than hiding them', () => {
    const untimedPrior = transaction({ transaction_id: 'untimed', roster_ids: [1], adds: { old: 1 }, settings: { waiver_bid: 40 }, created: 10, status_updated: undefined });
    const normal = transaction({ transaction_id: 'normal', roster_ids: [1], adds: { p1: 1 }, settings: { waiver_bid: 50 }, created: 100, status_updated: 200 });
    const impossible = transaction({ transaction_id: 'impossible', roster_ids: [2], adds: { p2: 2 }, settings: { waiver_bid: 120 }, created: 100, status_updated: 200 });
    const result = classifyTransactionsWithAudit(new Map([[1, [untimedPrior, normal, impossible]]]), 100);
    expect(result.events.find((event) => event.transactionId === 'normal')?.faabReconstruction).toBe('uncertain');
    expect(result.events.find((event) => event.transactionId === 'impossible')).toMatchObject({ faabAvailableBeforeBid: 120, faabReconstruction: 'inferred-minimum' });
  });
});

describe('metrics and fixed sensitivity rules', () => {
  const rows: EvaluatedBid[] = [
    { eventId: 'a', clusterId: 'x', strategy: 's', actual: 10, predicted: 12, originalFaab: 100, preBidFaab: 50 },
    { eventId: 'b', clusterId: 'y', strategy: 's', actual: 20, predicted: 16, originalFaab: 100, preBidFaab: 80 },
    { eventId: 'c', clusterId: 'y', strategy: 's', actual: 30, predicted: 28, originalFaab: 100, preBidFaab: 100 },
  ];

  it('computes errors, tied ranks, ranges, and normalized errors', () => {
    expect(computeErrorMetrics(rows)).toMatchObject({ n: 3, mae: 8 / 3, medianAbsoluteError: 2, signedBias: -4 / 3, actualMin: 10, actualMax: 30, predictedMin: 12, predictedMax: 28 });
    expect(spearmanCorrelation([1, 2, 2], [1, 2, 3])).toBeCloseTo(0.8660254);
    expect(spearmanCorrelation([1, 1], [2, 3])).toBeNull();
  });

  it('uses deterministic cluster bootstrap output', () => {
    expect(bootstrapMaeInterval(rows, 100)).toEqual(bootstrapMaeInterval(rows, 100));
  });

  it('separates token bids and flags independent robust isolated tops', () => {
    expect(isTokenBid(5, 500)).toBe(true);
    expect(isTokenBid(6, 500)).toBe(false);
    const flags = flagIsolatedOutliers([
      { eventId: 'top', clusterId: 'c', actualBid: 300, originalFaab: 500 },
      { eventId: 'b', clusterId: 'c', actualBid: 100, originalFaab: 500 },
      { eventId: 'c', clusterId: 'c', actualBid: 90, originalFaab: 500 },
      { eventId: 'd', clusterId: 'c', actualBid: 80, originalFaab: 500 },
      { eventId: 'other', clusterId: 'd', actualBid: 200, originalFaab: 500 },
    ]);
    expect([...flags.ratioGap]).toEqual(['top']);
    expect([...flags.mad]).toEqual(['top']);
    expect([...flags.iqr]).toEqual(['top']);
  });
});
