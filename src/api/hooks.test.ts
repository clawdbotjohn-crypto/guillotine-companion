import { describe, expect, it, vi } from 'vitest';
import type { ProjectionSnapshotResponse } from './types';
import {
  CURRENT_ROSTER_QUERY_FRESHNESS,
  fetchProjectionSnapshotBatch,
  stabilizeProjectionSnapshotBatch,
} from './hooks';

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

describe('stabilizeProjectionSnapshotBatch', () => {
  it('reuses the exact identity for the same logical query inputs', () => {
    const initial = stabilizeProjectionSnapshotBatch(
      undefined,
      true,
      [2, 3],
      [snapshot, undefined],
      [undefined, undefined],
    );
    const repeated = stabilizeProjectionSnapshotBatch(
      initial,
      true,
      [2, 3],
      [snapshot, undefined],
      [undefined, undefined],
    );

    expect(repeated).toBe(initial);
    expect(repeated.data).toBe(initial.data);
    expect(repeated.data?.snapshots.get(2)).toBe(snapshot);
  });

  it('invalidates when the decision weeks change', () => {
    const initial = stabilizeProjectionSnapshotBatch(
      undefined,
      true,
      [2],
      [snapshot],
      [undefined],
    );
    const changed = stabilizeProjectionSnapshotBatch(
      initial,
      true,
      [3],
      [snapshot],
      [undefined],
    );

    expect(changed).not.toBe(initial);
    expect(changed.data).not.toBe(initial.data);
    expect(changed.data?.snapshots.has(2)).toBe(false);
    expect(changed.data?.snapshots.get(3)).toBe(snapshot);
  });

  it('invalidates when a projection source object changes', () => {
    const replacement = { ...snapshot } as ProjectionSnapshotResponse;
    const initial = stabilizeProjectionSnapshotBatch(
      undefined,
      true,
      [2],
      [snapshot],
      [undefined],
    );
    const changed = stabilizeProjectionSnapshotBatch(
      initial,
      true,
      [2],
      [replacement],
      [undefined],
    );

    expect(changed.data).not.toBe(initial.data);
    expect(changed.data?.snapshots.get(2)).toBe(replacement);
  });

  it('invalidates for error addition, replacement, and removal', () => {
    const firstError = new Error('Unavailable');
    const replacementError = new Error('Unavailable');
    const withoutError = stabilizeProjectionSnapshotBatch(
      undefined,
      true,
      [2],
      [undefined],
      [undefined],
    );
    const added = stabilizeProjectionSnapshotBatch(
      withoutError,
      true,
      [2],
      [undefined],
      [firstError],
    );
    const replaced = stabilizeProjectionSnapshotBatch(
      added,
      true,
      [2],
      [undefined],
      [replacementError],
    );
    const removed = stabilizeProjectionSnapshotBatch(
      replaced,
      true,
      [2],
      [undefined],
      [undefined],
    );

    expect(added.data).not.toBe(withoutError.data);
    expect(added.data?.errors.get(2)).toBe(firstError);
    expect(replaced.data).not.toBe(added.data);
    expect(replaced.data?.errors.get(2)).toBe(replacementError);
    expect(removed.data).not.toBe(replaced.data);
    expect(removed.data?.errors.size).toBe(0);
  });

  it('keeps disabled inputs empty and invalidates across enabled boundaries', () => {
    const disabled = stabilizeProjectionSnapshotBatch(
      undefined,
      false,
      [2],
      [snapshot],
      [undefined],
    );
    const repeatedDisabled = stabilizeProjectionSnapshotBatch(
      disabled,
      false,
      [2],
      [snapshot],
      [undefined],
    );
    const enabled = stabilizeProjectionSnapshotBatch(
      repeatedDisabled,
      true,
      [2],
      [snapshot],
      [undefined],
    );
    const disabledAgain = stabilizeProjectionSnapshotBatch(
      enabled,
      false,
      [2],
      [snapshot],
      [undefined],
    );
    const reenabled = stabilizeProjectionSnapshotBatch(
      disabledAgain,
      true,
      [2],
      [snapshot],
      [undefined],
    );

    expect(disabled.data).toBeUndefined();
    expect(repeatedDisabled).toBe(disabled);
    expect(enabled).not.toBe(disabled);
    expect(enabled.data?.snapshots.get(2)).toBe(snapshot);
    expect(disabledAgain).not.toBe(enabled);
    expect(disabledAgain.data).toBeUndefined();
    expect(reenabled.data).not.toBe(enabled.data);
    expect(reenabled.data?.snapshots.get(2)).toBe(snapshot);
  });
});
