import { describe, expect, it } from 'vitest';
import { isBiddingProfileModelReady } from './useBiddingProfiles';

const settled = {
  hasLeague: true,
  hasRosters: true,
  hasPlayers: true,
  hasTransactions: true,
  hasSelectedBidEvents: true,
  hasSnapshotData: true,
  isFetching: false,
  hasError: false,
};

describe('isBiddingProfileModelReady', () => {
  it('accepts only a complete settled prediction model', () => {
    expect(isBiddingProfileModelReady(settled)).toBe(true);
  });

  it('withholds cached predictions during a background refetch', () => {
    expect(isBiddingProfileModelReady({ ...settled, isFetching: true })).toBe(false);
  });

  it('requires settled historical snapshots when bid evidence exists', () => {
    expect(isBiddingProfileModelReady({ ...settled, hasSnapshotData: false })).toBe(false);
    expect(isBiddingProfileModelReady({
      ...settled,
      hasSelectedBidEvents: false,
      hasSnapshotData: false,
    })).toBe(true);
  });

  it('fails closed for missing dependencies or fatal errors', () => {
    expect(isBiddingProfileModelReady({ ...settled, hasRosters: false })).toBe(false);
    expect(isBiddingProfileModelReady({ ...settled, hasError: true })).toBe(false);
  });
});
