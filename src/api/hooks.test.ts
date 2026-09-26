import { describe, expect, it, vi } from 'vitest';
import type { ProjectionSnapshotResponse } from './types';
import { CURRENT_ROSTER_QUERY_FRESHNESS, fetchProjectionSnapshotBatch } from './hooks';

const snapshot = {
  snapshot: { id: 'snapshot' },
  provenance: { effectiveKind: 'reconstructed' },
  rows: [],
} as unknown as ProjectionSnapshotResponse;

describe('current roster query freshness', () => {
  it('always refetches ownership after processed waivers and on focus', () => {
    expect(CURRENT_ROSTER_QUERY_FRESHNESS).toEqual({
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    });
  });
});

describe('fetchProjectionSnapshotBatch', () => {
  it('preserves successful coordinates and reports only the failed week', async () => {
    const getSnapshot = vi.fn(async (_season: number, decisionWeek: number) => {
      if (decisionWeek === 3) throw new Error('Week 3 unavailable');
      return snapshot;
    });

    const result = await fetchProjectionSnapshotBatch(2026, [2, 3], getSnapshot);

    expect(result.snapshots.get(2)).toBe(snapshot);
    expect(result.errors.get(3)?.message).toBe('Week 3 unavailable');
    expect(result.snapshots.size).toBe(1);
    expect(result.errors.size).toBe(1);
  });
});
