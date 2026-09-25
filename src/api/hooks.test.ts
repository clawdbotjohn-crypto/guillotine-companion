import { describe, expect, it, vi } from 'vitest';
import type { ProjectionSnapshotResponse } from './types';
import { fetchProjectionSnapshotBatch } from './hooks';

const snapshot = {
  snapshot: { id: 'snapshot' },
  provenance: { effectiveKind: 'reconstructed' },
  rows: [],
} as unknown as ProjectionSnapshotResponse;

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
