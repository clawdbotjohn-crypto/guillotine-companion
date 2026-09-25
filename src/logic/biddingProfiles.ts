import type {
  League,
  ProjectionSnapshotResponse,
  ProjectionSnapshotProvenance,
  ProjectionSnapshotRow,
  Transaction,
} from '../api/types';
import type { ProjectionScoring, RosPlayerProjection } from './projections';
import { buildWaiverBoard, type LeagueContext } from './waivers';

export const BIDDING_PROFILE_MODEL_V1 = Object.freeze({
  version: 'bidding-profile-v1',
  maxEvidence: 3,
  minimumUsableBaseline: 1,
  constrainedThreshold: 0.9,
  conservativeBelow: 0.85,
  aggressiveAbove: 1.15,
});

export type BidOutcome = 'won' | 'legitimate-loss';
export type FaabReconstruction = 'transaction-ledger' | 'inferred-minimum' | 'uncertain';
export type ManagerBidStyle = 'conservative' | 'standard' | 'aggressive' | 'insufficient';
export type ManagerBidConfidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface CanonicalBidEvent {
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

export interface HistoricalBaselineEvidence {
  baseline: number | null;
  provenance: ProjectionSnapshotProvenance | null;
  captureProvenance: ProjectionSnapshotProvenance | null;
  matchesRequestedDecisionWeek: boolean | null;
  snapshotDecisionWeek: number | null;
  unavailableReason?: string;
}

export interface ManagerBidEvidence extends CanonicalBidEvent, HistoricalBaselineEvidence {
  effectiveBaseline: number | null;
  eventRatio: number | null;
  usableForMultiplier: boolean;
  budgetConstrained: boolean;
}

export interface ManagerBiddingProfile {
  managerRosterId: number;
  evidence: ManagerBidEvidence[];
  managerMultiplier: number | null;
  style: ManagerBidStyle;
  confidence: ManagerBidConfidence;
  usableEvidenceCount: number;
}

export interface ManagerBidPrediction {
  rawBaseline: number;
  managerMultiplier: number;
  predictedWillingness: number;
  feasiblePredictedBid: number;
  currentFaab: number;
  cappedByFaab: boolean;
}

interface RawBidCandidate {
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

function singleAddedPlayer(transaction: Transaction): string | null {
  if (!transaction.adds) return null;
  const players = Object.keys(transaction.adds);
  return players.length === 1 ? players[0] : null;
}

function managerRosterId(transaction: Transaction): number | null {
  const rosterId = transaction.roster_ids[0];
  return Number.isInteger(rosterId) && rosterId > 0 ? rosterId : null;
}

function processKey(transaction: Transaction, week: number): string {
  const processed = finiteNonNegative(transaction.status_updated)
    ? transaction.status_updated
    : `transaction-${transaction.transaction_id}`;
  return `${week}:${transaction.leg}:${processed}`;
}

function winnerProofKey(transaction: Transaction, week: number, playerId: string): string | null {
  if (!finiteNonNegative(transaction.status_updated)) return null;
  return `${week}:${transaction.leg}:${transaction.status_updated}:${playerId}`;
}

function isClaimedByAnotherOwner(transaction: Transaction): boolean {
  const note = transaction.metadata?.notes;
  return typeof note === 'string' && /player was claimed by another owner/i.test(note);
}

function collectRawCandidates(transactionsByWeek: Map<number, Transaction[]>): RawBidCandidate[] {
  const completedWinners = new Map<string, Set<number>>();

  for (const [week, transactions] of transactionsByWeek) {
    for (const transaction of transactions) {
      if (transaction.type !== 'waiver' || transaction.status !== 'complete') continue;
      const rosterId = managerRosterId(transaction);
      const playerId = singleAddedPlayer(transaction);
      if (rosterId == null || !playerId || !finiteNonNegative(transaction.settings?.waiver_bid)) continue;
      const key = winnerProofKey(transaction, week, playerId);
      if (!key) continue;
      const winners = completedWinners.get(key) ?? new Set<number>();
      winners.add(rosterId);
      completedWinners.set(key, winners);
    }
  }

  const candidates: RawBidCandidate[] = [];
  for (const [week, transactions] of transactionsByWeek) {
    for (const transaction of transactions) {
      if (transaction.type !== 'waiver') continue;
      const rosterId = managerRosterId(transaction);
      const playerId = singleAddedPlayer(transaction);
      const actualBid = transaction.settings?.waiver_bid;
      if (rosterId == null || !playerId || !finiteNonNegative(actualBid) || !finiteNonNegative(transaction.created)) continue;

      let outcome: BidOutcome | null = null;
      if (transaction.status === 'complete') {
        outcome = 'won';
      } else if (transaction.status === 'failed' && isClaimedByAnotherOwner(transaction)) {
        const key = winnerProofKey(transaction, week, playerId);
        const winners = key ? completedWinners.get(key) : undefined;
        if (winners && [...winners].some((winnerRosterId) => winnerRosterId !== rosterId)) {
          outcome = 'legitimate-loss';
        }
      }
      if (!outcome) continue;

      candidates.push({
        transaction,
        transactionWeek: week,
        managerRosterId: rosterId,
        playerId,
        actualBid,
        outcome,
        batchKey: processKey(transaction, week),
        createdAt: transaction.created,
        processedAt: finiteNonNegative(transaction.status_updated) ? transaction.status_updated : null,
      });
    }
  }
  return candidates;
}

function deduplicateCandidates(candidates: RawBidCandidate[]): Array<RawBidCandidate & { duplicateCount: number }> {
  const groups = new Map<string, RawBidCandidate[]>();
  for (const candidate of candidates) {
    const key = `${candidate.managerRosterId}:${candidate.playerId}:${candidate.batchKey}`;
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) =>
      b.actualBid - a.actualBid
      || Number(b.outcome === 'won') - Number(a.outcome === 'won')
      || a.createdAt - b.createdAt
      || a.transaction.transaction_id.localeCompare(b.transaction.transaction_id));
    return { ...sorted[0], duplicateCount: group.length };
  });
}

function collectLedgerAdjustments(transactionsByWeek: Map<number, Transaction[]>): LedgerAdjustment[] {
  const adjustments: LedgerAdjustment[] = [];
  const seenTransactions = new Set<string>();

  for (const transactions of transactionsByWeek.values()) {
    for (const transaction of transactions) {
      if (transaction.status !== 'complete' || seenTransactions.has(transaction.transaction_id)) continue;
      seenTransactions.add(transaction.transaction_id);
      const reliableTimestamp = finiteNonNegative(transaction.status_updated);
      const effectiveAt = reliableTimestamp ? transaction.status_updated! : transaction.created;
      if (!finiteNonNegative(effectiveAt)) continue;

      if (transaction.type === 'waiver') {
        const rosterId = managerRosterId(transaction);
        const bid = transaction.settings?.waiver_bid;
        if (rosterId != null && finiteNonNegative(bid) && bid > 0) {
          adjustments.push({
            rosterId,
            amount: -bid,
            effectiveAt,
            reliableTimestamp,
            id: `${transaction.transaction_id}:spend`,
          });
        }
      }

      for (const [index, transfer] of (transaction.waiver_budget ?? []).entries()) {
        if (!Number.isInteger(transfer.sender) || !Number.isInteger(transfer.receiver)
          || !finiteNonNegative(transfer.amount) || transfer.amount === 0) continue;
        adjustments.push({
          rosterId: transfer.sender,
          amount: -transfer.amount,
          effectiveAt,
          reliableTimestamp,
          id: `${transaction.transaction_id}:transfer:${index}:sender`,
        });
        adjustments.push({
          rosterId: transfer.receiver,
          amount: transfer.amount,
          effectiveAt,
          reliableTimestamp,
          id: `${transaction.transaction_id}:transfer:${index}:receiver`,
        });
      }
    }
  }

  return adjustments.sort((a, b) => a.effectiveAt - b.effectiveAt || a.id.localeCompare(b.id));
}

/**
 * Classify public Sleeper claims and reconstruct the transaction-ledger FAAB immediately before
 * submission. A claim itself proves at least its bid amount was available; that lower-bound repair
 * is explicit and confidence-reducing rather than silently producing a zero denominator.
 */
export function classifyCanonicalBidEvents(
  transactionsByWeek: Map<number, Transaction[]>,
  initialFaab: number,
): CanonicalBidEvent[] {
  const budget = finiteNonNegative(initialFaab) ? initialFaab : 0;
  const candidates = deduplicateCandidates(collectRawCandidates(transactionsByWeek));
  const adjustments = collectLedgerAdjustments(transactionsByWeek);

  return candidates.map((candidate) => {
    const prior = adjustments.filter((adjustment) =>
      adjustment.rosterId === candidate.managerRosterId
      && adjustment.effectiveAt < candidate.createdAt);
    const rawAvailable = Math.max(0, budget + prior.reduce((sum, adjustment) => sum + adjustment.amount, 0));
    const hasUncertainTimestamp = prior.some((adjustment) => !adjustment.reliableTimestamp);
    const inferredMinimum = rawAvailable < candidate.actualBid;
    const faabAvailableBeforeBid = inferredMinimum ? candidate.actualBid : rawAvailable;
    const faabReconstruction: FaabReconstruction = inferredMinimum
      ? 'inferred-minimum'
      : hasUncertainTimestamp
        ? 'uncertain'
        : 'transaction-ledger';

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
      faabAvailableBeforeBid,
      faabReconstruction,
      duplicateCount: candidate.duplicateCount,
    };
  }).sort((a, b) => a.createdAt - b.createdAt || a.transactionId.localeCompare(b.transactionId));
}

/** Select the highest three canonical bids per manager with stable recency/ID tie-breaking. */
export function selectTopCanonicalBids(
  events: CanonicalBidEvent[],
  limit = BIDDING_PROFILE_MODEL_V1.maxEvidence,
): CanonicalBidEvent[] {
  const grouped = new Map<number, CanonicalBidEvent[]>();
  for (const event of events) {
    const group = grouped.get(event.managerRosterId) ?? [];
    group.push(event);
    grouped.set(event.managerRosterId, group);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, group]) => [...group]
      .sort((a, b) =>
        b.actualBid - a.actualBid
        || b.createdAt - a.createdAt
        || a.playerId.localeCompare(b.playerId)
        || a.transactionId.localeCompare(b.transactionId))
      .slice(0, Math.max(0, limit)));
}

export function styleForMultiplier(multiplier: number | null): ManagerBidStyle {
  if (multiplier == null || !Number.isFinite(multiplier)) return 'insufficient';
  if (multiplier < BIDDING_PROFILE_MODEL_V1.conservativeBelow) return 'conservative';
  if (multiplier > BIDDING_PROFILE_MODEL_V1.aggressiveAbove) return 'aggressive';
  return 'standard';
}

export function evaluateBidEvidence(
  event: CanonicalBidEvent,
  historical: HistoricalBaselineEvidence,
): ManagerBidEvidence {
  const baseline = historical.baseline;
  const usableBaseline = baseline != null
    && Number.isFinite(baseline)
    && baseline >= BIDDING_PROFILE_MODEL_V1.minimumUsableBaseline;
  const effectiveBaseline = usableBaseline
    ? Math.min(baseline, event.faabAvailableBeforeBid)
    : null;
  const eventRatio = effectiveBaseline != null
    && effectiveBaseline >= BIDDING_PROFILE_MODEL_V1.minimumUsableBaseline
    ? event.actualBid / effectiveBaseline
    : null;
  const usableForMultiplier = eventRatio != null && Number.isFinite(eventRatio) && eventRatio > 0;
  const budgetConstrained = event.faabAvailableBeforeBid > 0
    && event.actualBid >= event.faabAvailableBeforeBid * BIDDING_PROFILE_MODEL_V1.constrainedThreshold;

  return {
    ...event,
    ...historical,
    effectiveBaseline,
    eventRatio,
    usableForMultiplier,
    budgetConstrained,
  };
}

function profileConfidence(evidence: ManagerBidEvidence[]): ManagerBidConfidence {
  const usable = evidence.filter((row) => row.usableForMultiplier);
  if (usable.length === 0) return 'insufficient';
  const strong = usable.filter((row) =>
    row.provenance === 'exact'
    && !row.budgetConstrained
    && row.faabReconstruction === 'transaction-ledger');
  if (usable.length >= 3 && strong.length === usable.length) return 'high';
  if (strong.length >= 2 || (usable.length >= 3 && strong.length >= 1)) return 'medium';
  return 'low';
}

export function buildManagerBiddingProfiles(
  rosterIds: number[],
  selectedEvents: CanonicalBidEvent[],
  historicalByTransactionId: Map<string, HistoricalBaselineEvidence>,
): ManagerBiddingProfile[] {
  const uniqueRosterIds = [...new Set(rosterIds)].sort((a, b) => a - b);
  return uniqueRosterIds.map((rosterId) => {
    const evidence = selectedEvents
      .filter((event) => event.managerRosterId === rosterId)
      .map((event) => evaluateBidEvidence(event, historicalByTransactionId.get(event.transactionId) ?? {
        baseline: null,
        provenance: null,
        captureProvenance: null,
        matchesRequestedDecisionWeek: null,
        snapshotDecisionWeek: null,
        unavailableReason: 'No projection snapshot was available for this claim.',
      }));
    const ratios = evidence
      .filter((row) => row.usableForMultiplier)
      .map((row) => row.eventRatio!);
    const managerMultiplier = ratios.length > 0
      ? Math.exp(ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length)
      : null;
    return {
      managerRosterId: rosterId,
      evidence,
      managerMultiplier,
      style: styleForMultiplier(managerMultiplier),
      confidence: profileConfidence(evidence),
      usableEvidenceCount: ratios.length,
    };
  });
}

export function predictManagerBid(
  profile: ManagerBiddingProfile,
  currentWeeklyBaseline: number,
  currentFaab: number,
): ManagerBidPrediction | null {
  if (profile.managerMultiplier == null || !Number.isFinite(currentWeeklyBaseline)
    || currentWeeklyBaseline < 0 || !Number.isFinite(currentFaab) || currentFaab < 0) return null;
  const predictedWillingness = currentWeeklyBaseline * profile.managerMultiplier;
  const feasiblePredictedBid = Math.min(predictedWillingness, currentFaab);
  return {
    rawBaseline: currentWeeklyBaseline,
    managerMultiplier: profile.managerMultiplier,
    predictedWillingness,
    feasiblePredictedBid,
    currentFaab,
    cappedByFaab: feasiblePredictedBid < predictedWillingness,
  };
}

function snapshotPoints(row: ProjectionSnapshotRow, scoring: ProjectionScoring): number | null {
  const value = scoring === 'ppr' ? row.ptsPpr : scoring === 'half-ppr' ? row.ptsHalfPpr : row.ptsStd;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Convert compact immutable rows into the same ROS shape consumed by Weeks-as-Starter. */
export function buildSnapshotRosProjections(
  snapshot: ProjectionSnapshotResponse,
  requestedDecisionWeek: number,
  scoring: ProjectionScoring,
  getPosition: (playerId: string) => string | undefined,
): Map<string, RosPlayerProjection> {
  const projectedWeeks = Math.max(0, 19 - requestedDecisionWeek);
  const totals = new Map<string, number>();
  if (projectedWeeks === 0) return new Map();

  for (const row of snapshot.rows) {
    if (row.projectionWeek < requestedDecisionWeek || row.projectionWeek > 18) continue;
    const points = snapshotPoints(row, scoring);
    if (points == null) continue;
    totals.set(row.playerId, (totals.get(row.playerId) ?? 0) + points);
  }

  const result = new Map<string, RosPlayerProjection>();
  for (const [playerId, totalPoints] of totals) {
    const position = getPosition(playerId);
    if (!position) continue;
    result.set(playerId, {
      playerId,
      position,
      totalPoints,
      pointsPerWeek: totalPoints / projectedWeeks,
      projectedWeeks,
    });
  }
  return result;
}

/**
 * V1 uses immutable projection evidence plus static current league setup. It intentionally does not
 * infer historical survivors, ownership, needs, or lineups that Sleeper cannot replay exactly.
 */
export function buildHistoricalSetupContext(league: League, decisionWeek: number): LeagueContext {
  const positions = league.roster_positions ?? [];
  const count = (position: string) => positions.filter((value) => value === position).length;
  const teamsRemaining = Math.max(1, league.total_rosters);
  const eliminationsPerWeek = teamsRemaining > 16 ? 2 : 1;
  return {
    budget: league.settings?.waiver_budget ?? 1000,
    teamsRemaining,
    currentWeek: decisionWeek,
    weeksRemaining: Math.max(1, Math.min(
      Math.ceil((teamsRemaining - 1) / eliminationsPerWeek),
      19 - decisionWeek,
    )),
    startersPerPos: {
      QB: count('QB'),
      RB: count('RB'),
      WR: count('WR'),
      TE: count('TE'),
      FLEX: count('FLEX') + count('WRRB_FLEX') + count('REC_FLEX'),
      SUPER_FLEX: count('SUPER_FLEX') + count('QB_FLEX'),
    },
  };
}

export function calculateHistoricalBaseline(
  event: CanonicalBidEvent,
  snapshot: ProjectionSnapshotResponse,
  league: League,
  scoring: ProjectionScoring,
  getPosition: (playerId: string) => string | undefined,
): HistoricalBaselineEvidence {
  const projections = buildSnapshotRosProjections(snapshot, event.decisionWeek, scoring, getPosition);
  const context = buildHistoricalSetupContext(league, event.decisionWeek);
  const row = buildWaiverBoard(
    [event.playerId],
    projections,
    context,
    [],
    (playerId) => playerId,
    { maxPerPos: Number.POSITIVE_INFINITY },
  )[0];
  return {
    baseline: row?.predictedWinningBid ?? null,
    provenance: snapshot.provenance.effectiveKind,
    captureProvenance: snapshot.provenance.captureKind,
    matchesRequestedDecisionWeek: snapshot.provenance.matchesRequestedDecisionWeek,
    snapshotDecisionWeek: snapshot.provenance.snapshotDecisionWeek,
    unavailableReason: row ? undefined : 'The snapshot had no usable projection for this player.',
  };
}
