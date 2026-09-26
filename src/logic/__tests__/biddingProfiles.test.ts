import { describe, expect, it } from 'vitest';
import type { ProjectionSnapshotResponse } from '../../api/types';
import { biddingProfileTransactionFixture } from '../__fixtures__/biddingProfileTransactions';
import {
  BIDDING_PROFILE_MODEL_V1,
  buildManagerBiddingProfiles,
  buildSnapshotRosProjections,
  calculateHistoricalBaseline,
  classifyCanonicalBidEvents,
  evaluateBidEvidence,
  predictManagerBid,
  selectTopCanonicalBids,
  styleForMultiplier,
  type CanonicalBidEvent,
  type HistoricalBaselineEvidence,
} from '../biddingProfiles';

function event(overrides: Partial<CanonicalBidEvent> = {}): CanonicalBidEvent {
  return {
    transactionId: 'tx',
    managerRosterId: 1,
    playerId: 'player',
    transactionWeek: 1,
    decisionWeek: 2,
    batchKey: '1:1:5000',
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

function history(overrides: Partial<HistoricalBaselineEvidence> = {}): HistoricalBaselineEvidence {
  return {
    baseline: 100,
    provenance: 'exact',
    captureProvenance: 'exact',
    matchesRequestedDecisionWeek: true,
    snapshotDecisionWeek: 2,
    ...overrides,
  };
}

function buildProfile(rows: Array<{
  event: CanonicalBidEvent;
  historical: HistoricalBaselineEvidence;
}>) {
  return buildManagerBiddingProfiles(
    [1],
    rows.map((row) => row.event),
    new Map(rows.map((row) => [row.event.transactionId, row.historical])),
  )[0];
}

describe('canonical bidding evidence', () => {
  it('includes wins and proved losses while excluding invalid and unmatched failures', () => {
    const events = classifyCanonicalBidEvents(biddingProfileTransactionFixture, 1_000);
    expect(events.map((row) => row.transactionId)).toEqual([
      'legitimate-loss-player-a',
      'winner-player-a',
      'second-win-after-spend-transfer',
    ]);
    expect(events.find((row) => row.managerRosterId === 2)).toMatchObject({
      outcome: 'legitimate-loss',
      actualBid: 90,
      duplicateCount: 2,
    });
  });

  it('reconstructs FAAB before submission from prior successful spend and exposed transfers', () => {
    const events = classifyCanonicalBidEvents(biddingProfileTransactionFixture, 1_000);
    const first = events.find((row) => row.transactionId === 'winner-player-a');
    const second = events.find((row) => row.transactionId === 'second-win-after-spend-transfer');
    expect(first?.faabAvailableBeforeBid).toBe(1_000);
    expect(second).toMatchObject({
      faabAvailableBeforeBid: 850,
      faabReconstruction: 'transaction-ledger',
    });
  });

  it('repairs an impossible public ledger only to the proved bid lower bound and marks uncertainty', () => {
    const events = classifyCanonicalBidEvents(biddingProfileTransactionFixture, 100);
    const second = events.find((row) => row.transactionId === 'second-win-after-spend-transfer');
    expect(second).toMatchObject({
      faabAvailableBeforeBid: 850,
      faabReconstruction: 'inferred-minimum',
    });
  });

  it('selects the top three by amount with stable newest-first tie-breaking', () => {
    const selected = selectTopCanonicalBids([
      event({ transactionId: 'low', actualBid: 10 }),
      event({ transactionId: 'old-tie', actualBid: 50, createdAt: 1 }),
      event({ transactionId: 'high', actualBid: 90 }),
      event({ transactionId: 'new-tie', actualBid: 50, createdAt: 2 }),
    ]);
    expect(selected.map((row) => row.transactionId)).toEqual(['high', 'new-tie', 'old-tie']);
  });
});

describe('ratio, multiplier, style, and confidence math', () => {
  it('caps the historical denominator at available FAAB and marks all-in evidence constrained', () => {
    const row = evaluateBidEvidence(
      event({ actualBid: 100, faabAvailableBeforeBid: 100 }),
      history({ baseline: 250 }),
    );
    expect(row.effectiveBaseline).toBe(100);
    expect(row.eventRatio).toBe(1);
    expect(row.budgetConstrained).toBe(true);
    expect(row.usableForMultiplier).toBe(true);
  });

  it('records zero/tiny baselines and zero bids without putting invalid values into log math', () => {
    const tiny = evaluateBidEvidence(event(), history({ baseline: 0.5 }));
    const zeroBid = evaluateBidEvidence(event({ actualBid: 0 }), history({ baseline: 20 }));
    expect(tiny).toMatchObject({ effectiveBaseline: null, eventRatio: null, usableForMultiplier: false });
    expect(zeroBid).toMatchObject({ effectiveBaseline: 20, eventRatio: 0, usableForMultiplier: false });
  });

  it('uses the versioned style boundaries exactly', () => {
    expect(BIDDING_PROFILE_MODEL_V1).toMatchObject({
      conservativeBelow: 0.85,
      aggressiveAtOrAbove: 1.5,
      minimumUsableBaseline: 1,
    });
    expect(styleForMultiplier(0.84)).toBe('conservative');
    expect(styleForMultiplier(0.85)).toBe('standard');
    expect(styleForMultiplier(1.18)).toBe('standard');
    expect(styleForMultiplier(1.49)).toBe('standard');
    expect(styleForMultiplier(1.5)).toBe('aggressive');
  });

  it('uses a geometric mean and grants high confidence only to three exact, uncensored rows', () => {
    const profile = buildProfile([
      { event: event({ transactionId: 'a', actualBid: 200 }), historical: history({ baseline: 100 }) },
      { event: event({ transactionId: 'b', actualBid: 50 }), historical: history({ baseline: 100 }) },
      { event: event({ transactionId: 'c', actualBid: 100 }), historical: history({ baseline: 100 }) },
    ]);
    expect(profile.managerMultiplier).toBeCloseTo(1, 8);
    expect(profile.style).toBe('standard');
    expect(profile.confidence).toBe('high');
  });

  it('reduces confidence for reconstructed, constrained, and inferred-budget observations', () => {
    const reconstructed = buildProfile(['a', 'b', 'c'].map((id) => ({
      event: event({ transactionId: id }),
      historical: history({ provenance: 'reconstructed', captureProvenance: 'reconstructed' }),
    })));
    expect(reconstructed.confidence).toBe('low');

    const mixed = buildProfile([
      { event: event({ transactionId: 'a' }), historical: history() },
      { event: event({ transactionId: 'b', faabReconstruction: 'inferred-minimum' }), historical: history() },
    ]);
    expect(mixed.confidence).toBe('low');
  });

  it('reports insufficient evidence when there is no usable ratio', () => {
    const profile = buildProfile([
      { event: event({ transactionId: 'a' }), historical: history({ baseline: 0 }) },
    ]);
    expect(profile).toMatchObject({
      managerMultiplier: null,
      style: 'insufficient',
      confidence: 'insufficient',
      usableEvidenceCount: 0,
    });
  });

  it('shows willingness separately from the feasible bid when current FAAB is exhausted', () => {
    const profile = buildProfile([
      { event: event({ transactionId: 'a', actualBid: 150 }), historical: history({ baseline: 100 }) },
    ]);
    const prediction = predictManagerBid(profile, 200, 0);
    expect(prediction).toMatchObject({
      rawBaseline: 200,
      predictedWillingness: 300,
      feasiblePredictedBid: 0,
      currentFaab: 0,
      cappedByFaab: true,
    });
  });
});

describe('snapshot projection evidence', () => {
  const snapshot: ProjectionSnapshotResponse = {
    snapshot: {
      id: 'snapshot',
      source: 'sleeper',
      season: 2026,
      decisionWeek: 2,
      canonicalCutoffAt: '2026-09-15T03:00:00.000Z',
      captureStartedAt: '2026-09-14T00:00:00.000Z',
      fetchedAt: '2026-09-14T00:01:00.000Z',
      endpointTemplate: 'test',
      rowCount: 3,
      contentHash: 'hash',
      provenance: 'reconstructed',
    },
    provenance: {
      kind: 'reconstructed',
      exact: false,
      captureKind: 'reconstructed',
      captureTiming: 'early-reconstruction',
      effectiveKind: 'reconstructed',
      effectiveExact: false,
      selection: 'same-decision-week',
      matchesRequestedDecisionWeek: true,
      requestedDecisionWeek: 2,
      requestedPlayingWeek: 1,
      snapshotDecisionWeek: 2,
      snapshotPlayingWeek: 1,
    },
    rows: [
      { projectionWeek: 1, playerId: 'p1', ptsStd: 1, ptsHalfPpr: 2, ptsPpr: 3 },
      { projectionWeek: 2, playerId: 'p1', ptsStd: 10, ptsHalfPpr: 20, ptsPpr: 30 },
      { projectionWeek: 3, playerId: 'p1', ptsStd: 5, ptsHalfPpr: 10, ptsPpr: 15 },
    ],
  };

  it('filters pre-decision rows and maps the configured scoring without relabeling provenance', () => {
    const projections = buildSnapshotRosProjections(snapshot, 2, 'ppr', () => 'WR');
    expect(projections.get('p1')).toMatchObject({
      totalPoints: 45,
      projectedWeeks: 17,
      position: 'WR',
    });
    expect(buildSnapshotRosProjections(snapshot, 2, 'ppr', () => 'WR')).not.toBe(projections);
    const stableResolver = () => 'WR';
    const cached = buildSnapshotRosProjections(snapshot, 2, 'ppr', stableResolver);
    expect(buildSnapshotRosProjections(snapshot, 2, 'ppr', stableResolver)).toBe(cached);
    expect(snapshot.provenance.effectiveKind).toBe('reconstructed');
  });

  it('uses the shared versioned historical Max VORP baseline and caps only ratio evidence by available FAAB', () => {
    const maxVorpSnapshot: ProjectionSnapshotResponse = {
      ...snapshot,
      snapshot: { ...snapshot.snapshot, rowCount: 12 },
      rows: Array.from({ length: 12 }, (_, index) => ({
        projectionWeek: 2,
        playerId: `p${index + 1}`,
        ptsStd: 45 - index,
        ptsHalfPpr: 45 - index,
        ptsPpr: 45 - index,
      })),
    };
    const result = calculateHistoricalBaseline(event({ playerId: 'p1' }), maxVorpSnapshot, {
      league_id: 'league', name: 'League', total_rosters: 12,
      settings: { waiver_budget: 1_000 }, scoring_settings: { rec: 1 }, season: '2026',
      season_type: 'regular', status: 'in_season', draft_id: 'draft', previous_league_id: null,
      roster_positions: ['WR'],
    }, 'ppr', () => 'WR');
    expect(result).toMatchObject({
      baseline: 2000,
      baselineStrategyId: 'max-vorp',
      baselineStrategyVersion: 'max-vorp-v1',
    });
    const evaluated = evaluateBidEvidence(event({ playerId: 'p1', actualBid: 375 }), result);
    expect(evaluated).toMatchObject({ effectiveBaseline: 1000, eventRatio: 0.375 });
  });

  it('keeps an exact stored capture reconstructed when it is an older-week fallback', () => {
    const fallback: ProjectionSnapshotResponse = {
      ...snapshot,
      snapshot: { ...snapshot.snapshot, provenance: 'exact' },
      provenance: {
        ...snapshot.provenance,
        captureKind: 'exact',
        captureTiming: 'exact-at-cutoff',
        effectiveKind: 'reconstructed',
        effectiveExact: false,
        selection: 'earlier-decision-week-fallback',
        matchesRequestedDecisionWeek: false,
      },
    };
    const result = calculateHistoricalBaseline(event({ playerId: 'p1' }), fallback, {
      league_id: 'league',
      name: 'League',
      total_rosters: 12,
      settings: { waiver_budget: 1_000 },
      scoring_settings: { rec: 1 },
      season: '2026',
      season_type: 'regular',
      status: 'in_season',
      draft_id: 'draft',
      previous_league_id: null,
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'FLEX'],
    }, 'ppr', () => 'WR');
    expect(result).toMatchObject({
      provenance: 'reconstructed',
      captureProvenance: 'exact',
      matchesRequestedDecisionWeek: false,
    });
  });
});
