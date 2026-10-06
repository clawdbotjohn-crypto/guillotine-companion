import type { Transaction } from '../src/api/types.ts';

export const ANALYSIS_POLICY = Object.freeze({
  tokenOriginalFaabFraction: 0.01,
  tokenMinimumDollars: 1,
  ratioGapMinimumRatio: 2,
  ratioGapMinimumOriginalFaabFraction: 0.1,
  robustGapMinimumOriginalFaabFraction: 0.05,
  madMultiplier: 3,
  iqrMultiplier: 1.5,
  bootstrapSeed: 20260927,
  bootstrapIterations: 2_000,
});

export type BidOutcome = 'won' | 'legitimate-loss';
export type FaabReconstruction = 'transaction-ledger' | 'inferred-minimum' | 'uncertain';

export interface ClassifiedBid {
  transactionId: string;
  managerRosterId: number;
  playerId: string;
  transactionWeek: number;
  decisionWeek: number;
  batchKey: string;
  actualBid: number;
  outcome: BidOutcome;
  createdAt: number;
  processedAt: number | null;
  faabAvailableBeforeBid: number;
  faabReconstruction: FaabReconstruction;
  duplicateCount: number;
}

export interface ClassificationAudit {
  rawTransactions: number;
  rawWaivers: number;
  candidateWins: number;
  candidateLegitimateLosses: number;
  canonicalWins: number;
  canonicalLegitimateLosses: number;
  duplicateCandidatePathsRemoved: number;
  completedLedgerSpendRows: number;
  completedLedgerTransferRows: number;
  exclusions: Record<string, number>;
}

interface Candidate {
  transaction: Transaction;
  transactionWeek: number;
  managerRosterId: number;
  playerId: string;
  actualBid: number;
  outcome: BidOutcome;
  batchKey: string;
  createdAt: number;
  processedAt: number | null;
}

interface LedgerAdjustment {
  rosterId: number;
  amount: number;
  effectiveAt: number;
  reliableTimestamp: boolean;
  id: string;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function extractShape(transaction: Transaction): {
  rosterId: number | null;
  playerId: string | null;
  bid: number | null;
  createdAt: number | null;
} {
  const rosterId = transaction.roster_ids.length === 1 && Number.isInteger(transaction.roster_ids[0])
    && transaction.roster_ids[0] > 0 ? transaction.roster_ids[0] : null;
  const added = Object.keys(transaction.adds ?? {});
  const playerId = added.length === 1 && added[0] ? added[0] : null;
  return {
    rosterId,
    playerId,
    bid: finiteNonNegative(transaction.settings?.waiver_bid) ? transaction.settings!.waiver_bid! : null,
    createdAt: finiteNonNegative(transaction.created) ? transaction.created : null,
  };
}

function proofKey(transaction: Transaction, week: number, playerId: string): string | null {
  if (!finiteNonNegative(transaction.status_updated)) return null;
  return `${week}:${transaction.leg}:${transaction.status_updated}:${playerId}`;
}

function batchKey(transaction: Transaction, week: number): string {
  return `${week}:${transaction.leg}:${finiteNonNegative(transaction.status_updated)
    ? transaction.status_updated : `transaction-${transaction.transaction_id}`}`;
}

function claimedByAnotherOwner(transaction: Transaction): boolean {
  return typeof transaction.metadata?.notes === 'string'
    && /player was claimed by another owner/i.test(transaction.metadata.notes);
}

/**
 * Public-Sleeper-only classifier. A failed bid is retained only when a different roster completed
 * a claim for the same player, leg, week, and status_updated processing batch. Candidate paths are
 * then collapsed on manager + player + batch, retaining the highest bid deterministically.
 */
export function classifyTransactionsWithAudit(
  transactionsByWeek: Map<number, Transaction[]>,
  initialFaab: number,
): { events: ClassifiedBid[]; audit: ClassificationAudit } {
  const exclusions: Record<string, number> = {};
  let rawTransactions = 0;
  let rawWaivers = 0;
  const completedWinners = new Map<string, Set<number>>();

  for (const [week, transactions] of [...transactionsByWeek].sort(([a], [b]) => a - b)) {
    rawTransactions += transactions.length;
    for (const transaction of transactions) {
      if (transaction.type !== 'waiver') continue;
      rawWaivers += 1;
      if (transaction.status !== 'complete') continue;
      const shape = extractShape(transaction);
      if (shape.rosterId == null || !shape.playerId || shape.bid == null) continue;
      const key = proofKey(transaction, week, shape.playerId);
      if (!key) continue;
      const rosters = completedWinners.get(key) ?? new Set<number>();
      rosters.add(shape.rosterId);
      completedWinners.set(key, rosters);
    }
  }

  const candidates: Candidate[] = [];
  for (const [week, transactions] of [...transactionsByWeek].sort(([a], [b]) => a - b)) {
    for (const transaction of transactions) {
      if (transaction.type !== 'waiver') {
        increment(exclusions, `non-waiver:${transaction.type}`);
        continue;
      }
      const shape = extractShape(transaction);
      if (shape.rosterId == null) { increment(exclusions, 'waiver:invalid-roster-shape'); continue; }
      if (!shape.playerId) { increment(exclusions, 'waiver:not-single-player-add'); continue; }
      if (shape.bid == null) { increment(exclusions, 'waiver:invalid-bid'); continue; }
      if (shape.createdAt == null) { increment(exclusions, 'waiver:invalid-created-at'); continue; }

      let outcome: BidOutcome | null = null;
      if (transaction.status === 'complete') {
        outcome = 'won';
      } else if (transaction.status === 'failed' && claimedByAnotherOwner(transaction)) {
        const key = proofKey(transaction, week, shape.playerId);
        const winners = key ? completedWinners.get(key) : undefined;
        if (winners && [...winners].some((rosterId) => rosterId !== shape.rosterId)) {
          outcome = 'legitimate-loss';
        } else {
          increment(exclusions, 'waiver:failed-claim-without-same-batch-winner');
        }
      } else if (transaction.status === 'failed') {
        increment(exclusions, 'waiver:failed-without-claimed-by-other-proof');
      } else {
        increment(exclusions, `waiver:status-${transaction.status}`);
      }
      if (!outcome) continue;
      candidates.push({
        transaction,
        transactionWeek: week,
        managerRosterId: shape.rosterId,
        playerId: shape.playerId,
        actualBid: shape.bid,
        outcome,
        batchKey: batchKey(transaction, week),
        createdAt: shape.createdAt,
        processedAt: finiteNonNegative(transaction.status_updated) ? transaction.status_updated : null,
      });
    }
  }

  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const key = `${candidate.managerRosterId}:${candidate.playerId}:${candidate.batchKey}`;
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }
  const deduped = [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) =>
      b.actualBid - a.actualBid
      || Number(b.outcome === 'won') - Number(a.outcome === 'won')
      || a.createdAt - b.createdAt
      || a.transaction.transaction_id.localeCompare(b.transaction.transaction_id));
    return { ...sorted[0], duplicateCount: group.length };
  });

  const adjustments: LedgerAdjustment[] = [];
  const seen = new Set<string>();
  let completedLedgerSpendRows = 0;
  let completedLedgerTransferRows = 0;
  for (const transactions of transactionsByWeek.values()) {
    for (const transaction of transactions) {
      if (transaction.status !== 'complete' || seen.has(transaction.transaction_id)) continue;
      seen.add(transaction.transaction_id);
      const reliableTimestamp = finiteNonNegative(transaction.status_updated);
      const effectiveAt = reliableTimestamp ? transaction.status_updated! : transaction.created;
      if (!finiteNonNegative(effectiveAt)) continue;
      const shape = extractShape(transaction);
      if (transaction.type === 'waiver' && shape.rosterId != null && shape.bid != null && shape.bid > 0) {
        adjustments.push({ rosterId: shape.rosterId, amount: -shape.bid, effectiveAt, reliableTimestamp, id: `${transaction.transaction_id}:spend` });
        completedLedgerSpendRows += 1;
      }
      for (const [index, transfer] of (transaction.waiver_budget ?? []).entries()) {
        if (!Number.isInteger(transfer.sender) || !Number.isInteger(transfer.receiver)
          || !finiteNonNegative(transfer.amount) || transfer.amount === 0) continue;
        adjustments.push({ rosterId: transfer.sender, amount: -transfer.amount, effectiveAt, reliableTimestamp, id: `${transaction.transaction_id}:transfer:${index}:sender` });
        adjustments.push({ rosterId: transfer.receiver, amount: transfer.amount, effectiveAt, reliableTimestamp, id: `${transaction.transaction_id}:transfer:${index}:receiver` });
        completedLedgerTransferRows += 1;
      }
    }
  }
  adjustments.sort((a, b) => a.effectiveAt - b.effectiveAt || a.id.localeCompare(b.id));

  const budget = finiteNonNegative(initialFaab) ? initialFaab : 0;
  const events = deduped.map((candidate): ClassifiedBid => {
    const prior = adjustments.filter((adjustment) => adjustment.rosterId === candidate.managerRosterId
      && adjustment.effectiveAt < candidate.createdAt);
    const rawAvailable = Math.max(0, budget + prior.reduce((sum, adjustment) => sum + adjustment.amount, 0));
    const inferredMinimum = rawAvailable < candidate.actualBid;
    return {
      transactionId: candidate.transaction.transaction_id,
      managerRosterId: candidate.managerRosterId,
      playerId: candidate.playerId,
      transactionWeek: candidate.transactionWeek,
      decisionWeek: candidate.transactionWeek + 1,
      batchKey: candidate.batchKey,
      actualBid: candidate.actualBid,
      outcome: candidate.outcome,
      createdAt: candidate.createdAt,
      processedAt: candidate.processedAt,
      faabAvailableBeforeBid: inferredMinimum ? candidate.actualBid : rawAvailable,
      faabReconstruction: inferredMinimum ? 'inferred-minimum'
        : prior.some((adjustment) => !adjustment.reliableTimestamp) ? 'uncertain' : 'transaction-ledger',
      duplicateCount: candidate.duplicateCount,
    };
  }).sort((a, b) => a.createdAt - b.createdAt || a.transactionId.localeCompare(b.transactionId));

  return {
    events,
    audit: {
      rawTransactions,
      rawWaivers,
      candidateWins: candidates.filter((row) => row.outcome === 'won').length,
      candidateLegitimateLosses: candidates.filter((row) => row.outcome === 'legitimate-loss').length,
      canonicalWins: events.filter((row) => row.outcome === 'won').length,
      canonicalLegitimateLosses: events.filter((row) => row.outcome === 'legitimate-loss').length,
      duplicateCandidatePathsRemoved: candidates.length - events.length,
      completedLedgerSpendRows,
      completedLedgerTransferRows,
      exclusions: Object.fromEntries(Object.entries(exclusions).sort(([a], [b]) => a.localeCompare(b))),
    },
  };
}

export interface EvaluatedBid {
  eventId: string;
  clusterId: string;
  strategy: string;
  actual: number;
  predicted: number;
  originalFaab: number;
  preBidFaab: number;
}

export interface ErrorMetrics {
  n: number;
  mae: number;
  medianAbsoluteError: number;
  signedBias: number;
  spearman: number | null;
  withinToleranceRate: number;
  actualMin: number;
  actualMax: number;
  predictedMin: number;
  predictedMax: number;
  originalFaabNormalizedMae: number;
  preBidFaabNormalizedMae: number;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
}

export function median(values: number[]): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function averageRanks(values: number[]): number[] {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value || a.index - b.index);
  const ranks = Array(values.length).fill(0) as number[];
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end += 1;
    const rank = (start + 1 + end) / 2;
    for (let index = start; index < end; index += 1) ranks[sorted[index].index] = rank;
    start = end;
  }
  return ranks;
}

export function spearmanCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const x = averageRanks(xs);
  const y = averageRanks(ys);
  const mx = mean(x), my = mean(y);
  const numerator = x.reduce((sum, value, index) => sum + (value - mx) * (y[index] - my), 0);
  const dx = Math.sqrt(x.reduce((sum, value) => sum + (value - mx) ** 2, 0));
  const dy = Math.sqrt(y.reduce((sum, value) => sum + (value - my) ** 2, 0));
  return dx > 0 && dy > 0 ? numerator / (dx * dy) : null;
}

export function computeErrorMetrics(rows: EvaluatedBid[]): ErrorMetrics | null {
  if (!rows.length) return null;
  const errors = rows.map((row) => row.predicted - row.actual);
  const absolute = errors.map(Math.abs);
  return {
    n: rows.length,
    mae: mean(absolute),
    medianAbsoluteError: median(absolute),
    signedBias: mean(errors),
    spearman: spearmanCorrelation(rows.map((row) => row.actual), rows.map((row) => row.predicted)),
    withinToleranceRate: mean(rows.map((row) => Math.abs(row.predicted - row.actual) <= Math.max(5, row.actual * 0.2) ? 1 : 0)),
    actualMin: Math.min(...rows.map((row) => row.actual)),
    actualMax: Math.max(...rows.map((row) => row.actual)),
    predictedMin: Math.min(...rows.map((row) => row.predicted)),
    predictedMax: Math.max(...rows.map((row) => row.predicted)),
    originalFaabNormalizedMae: mean(rows.map((row) => Math.abs(row.predicted - row.actual) / row.originalFaab)),
    preBidFaabNormalizedMae: mean(rows.map((row) => Math.abs((row.predicted / row.preBidFaab) - (row.actual / row.preBidFaab)))),
  };
}

export function isTokenBid(actualBid: number, originalFaab: number): boolean {
  return actualBid <= Math.max(ANALYSIS_POLICY.tokenMinimumDollars, originalFaab * ANALYSIS_POLICY.tokenOriginalFaabFraction);
}

export interface ClusterBid { eventId: string; clusterId: string; actualBid: number; originalFaab: number }
export interface OutlierFlags { ratioGap: Set<string>; mad: Set<string>; iqr: Set<string> }

function quantile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return Number.NaN;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** Rules are fixed in ANALYSIS_POLICY and applied independently; no winner inspection/tuning. */
export function flagIsolatedOutliers(rows: ClusterBid[]): OutlierFlags {
  const result: OutlierFlags = { ratioGap: new Set(), mad: new Set(), iqr: new Set() };
  const groups = new Map<string, ClusterBid[]>();
  for (const row of rows) {
    const group = groups.get(row.clusterId) ?? [];
    group.push(row);
    groups.set(row.clusterId, group);
  }
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => b.actualBid - a.actualBid || a.eventId.localeCompare(b.eventId));
    if (sorted.length < 2 || sorted[0].actualBid === sorted[1].actualBid) continue;
    const top = sorted[0], second = sorted[1];
    const ratioGap = second.actualBid === 0 ? (top.actualBid > 0 ? Number.POSITIVE_INFINITY : 1) : top.actualBid / second.actualBid;
    if (ratioGap >= ANALYSIS_POLICY.ratioGapMinimumRatio
      && top.actualBid - second.actualBid >= top.originalFaab * ANALYSIS_POLICY.ratioGapMinimumOriginalFaabFraction) {
      result.ratioGap.add(top.eventId);
    }
    const normalized = sorted.map((row) => row.actualBid / row.originalFaab);
    const robustGap = top.originalFaab * ANALYSIS_POLICY.robustGapMinimumOriginalFaabFraction;
    if (sorted.length >= 3) {
      const center = median(normalized);
      const mad = median(normalized.map((value) => Math.abs(value - center)));
      const threshold = center + ANALYSIS_POLICY.madMultiplier * 1.4826 * mad;
      if (normalized[0] > threshold && top.actualBid - second.actualBid >= robustGap) result.mad.add(top.eventId);
    }
    if (sorted.length >= 4) {
      const q1 = quantile(normalized, 0.25), q3 = quantile(normalized, 0.75);
      if (normalized[0] > q3 + ANALYSIS_POLICY.iqrMultiplier * (q3 - q1)
        && top.actualBid - second.actualBid >= robustGap) result.iqr.add(top.eventId);
    }
  }
  return result;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

/** Deterministic cluster bootstrap so bids from one player/batch stay together. */
export function bootstrapMaeInterval(rows: EvaluatedBid[], iterations: number = ANALYSIS_POLICY.bootstrapIterations): [number, number] | null {
  if (!rows.length) return null;
  const grouped = new Map<string, EvaluatedBid[]>();
  for (const row of rows) {
    const group = grouped.get(row.clusterId) ?? [];
    group.push(row);
    grouped.set(row.clusterId, group);
  }
  const groups = [...grouped.values()];
  const random = seededRandom(ANALYSIS_POLICY.bootstrapSeed);
  const estimates: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sample = Array.from({ length: groups.length }, () => groups[Math.floor(random() * groups.length)]).flat();
    estimates.push(mean(sample.map((row) => Math.abs(row.predicted - row.actual))));
  }
  estimates.sort((a, b) => a - b);
  return [quantile(estimates, 0.025), quantile(estimates, 0.975)];
}
