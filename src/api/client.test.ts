import { describe, expect, it } from 'vitest';
import { parseProjectionSnapshotResponse } from './client';

function validPayload() {
  return {
    snapshot: {
      id: 'snapshot-1',
      source: 'sleeper',
      season: 2026,
      decisionWeek: 4,
      canonicalCutoffAt: '2026-09-30T03:00:00Z',
      captureStartedAt: '2026-09-25T05:34:01Z',
      fetchedAt: '2026-09-25T05:34:02Z',
      endpointTemplate: '/projections/nfl/regular/{season}/{week}',
      rowCount: 1,
      contentHash: 'abc123',
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
      requestedDecisionWeek: 4,
      requestedPlayingWeek: 3,
      snapshotDecisionWeek: 4,
      snapshotPlayingWeek: 3,
    },
    rows: [{
      projectionWeek: 4,
      playerId: '1234',
      ptsStd: 10,
      ptsHalfPpr: 11,
      ptsPpr: 12,
    }],
  };
}

describe('parseProjectionSnapshotResponse', () => {
  it('accepts a valid payload and returns typed data', () => {
    const parsed = parseProjectionSnapshotResponse(validPayload(), 2026, 4);
    expect(parsed.snapshot.season).toBe(2026);
    expect(parsed.provenance.requestedDecisionWeek).toBe(4);
    expect(parsed.rows).toHaveLength(1);
  });

  it('fails closed when season does not match the request', () => {
    const payload = validPayload();
    payload.snapshot.season = 2025;
    expect(() => parseProjectionSnapshotResponse(payload, 2026, 4)).toThrow(/expected season 2026/i);
  });

  it('fails closed when rowCount does not match actual rows', () => {
    const payload = validPayload();
    payload.snapshot.rowCount = 2;
    expect(() => parseProjectionSnapshotResponse(payload, 2026, 4)).toThrow(/rowCount/i);
  });
});
