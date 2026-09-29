import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLeagueHistory, parseProjectionSnapshotResponse } from './client';
import type { League } from './types';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

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

describe('getLeagueHistory', () => {
  it('seeds the history walk with the current league instead of fetching it twice', async () => {
    const current = {
      league_id: 'current',
      previous_league_id: 'previous',
    } as League;
    const previous = {
      league_id: 'previous',
      previous_league_id: null,
    } as League;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => previous,
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const history = await getLeagueHistory('current', current);

    expect(history).toEqual([current, previous]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.sleeper.app/v1/league/previous');
  });
});

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
