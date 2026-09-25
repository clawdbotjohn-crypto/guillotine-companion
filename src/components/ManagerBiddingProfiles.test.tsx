import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ManagerBiddingProfile } from '../logic';
import type { WaiverPlayerRow } from '../logic/waivers';
import { ManagerBiddingProfiles } from './ManagerBiddingProfiles';

const roster = {
  roster_id: 1,
  owner_id: 'owner-1',
  players: [],
  starters: [],
  settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 900 },
};
const user = {
  user_id: 'owner-1',
  display_name: 'Aggressive Alice',
  username: 'alice',
  avatar: null,
};
const target: WaiverPlayerRow = {
  playerId: 'target',
  name: 'Target Player',
  position: 'WR',
  posRank: 4,
  rosPoints: 200,
  projectedPointsPerWeek: 15,
  sourceValue: 200,
  starterWeeks: 5,
  possibleStarterWeeks: 8,
  suggestions: [],
  predictedWinningBid: 200,
};
const profile: ManagerBiddingProfile = {
  managerRosterId: 1,
  managerMultiplier: 1.5,
  style: 'aggressive',
  confidence: 'low',
  usableEvidenceCount: 1,
  evidence: [{
    transactionId: 'tx-1',
    managerRosterId: 1,
    playerId: 'evidence-player',
    transactionWeek: 1,
    decisionWeek: 2,
    batchKey: 'batch',
    actualBid: 150,
    outcome: 'won',
    createdAt: 1,
    processedAt: 2,
    faabAvailableBeforeBid: 1_000,
    faabReconstruction: 'transaction-ledger',
    duplicateCount: 1,
    baseline: 100,
    provenance: 'reconstructed',
    captureProvenance: 'reconstructed',
    matchesRequestedDecisionWeek: true,
    snapshotDecisionWeek: 2,
    effectiveBaseline: 100,
    eventRatio: 1.5,
    usableForMultiplier: true,
    budgetConstrained: false,
  }],
};

const baseProps = {
  profiles: [profile],
  targetRows: [target],
  rosters: [roster],
  users: [user],
  initialFaab: 1_000,
  hasCanonicalEvidence: true,
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
  getPlayerName: () => 'Evidence Player',
};

describe('ManagerBiddingProfiles', () => {
  it('renders loading, empty, and error states with a retry action', () => {
    const { rerender } = render(<ManagerBiddingProfiles {...baseProps} isLoading />);
    expect(screen.getByText(/loading historical projection evidence/i)).toBeTruthy();

    rerender(<ManagerBiddingProfiles {...baseProps} isLoading={false} hasCanonicalEvidence={false} />);
    expect(screen.getByText(/no canonical bids yet/i)).toBeTruthy();

    const retry = vi.fn();
    rerender(<ManagerBiddingProfiles {...baseProps} error={new Error('Snapshot read failed')} onRetry={retry} />);
    expect(screen.getByText('Snapshot read failed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows explainable willingness, FAAB-capped prediction, and reconstructed provenance', () => {
    render(<ManagerBiddingProfiles {...baseProps} partialErrorCount={1} />);
    expect(screen.getByText(/1 historical snapshot week is unavailable/i)).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /predict bids for/i })).toBeTruthy();
    expect(screen.getByText('Aggressive Alice')).toBeTruthy();
    expect(screen.getByText('$300')).toBeTruthy();
    expect(screen.getAllByText('$100').length).toBeGreaterThan(0);
    expect(screen.getByText('FAAB capped')).toBeTruthy();
    expect(screen.getByText('Reconstructed')).toBeTruthy();
    expect(screen.getByText(/actual/i)).toBeTruthy();
    expect(screen.getAllByText(/raw baseline/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/ratio/i)).toBeTruthy();
  });

  it('shows an explicit insufficient state when no ratio can be modeled', () => {
    render(<ManagerBiddingProfiles
      {...baseProps}
      profiles={[{ ...profile, managerMultiplier: null, style: 'insufficient', confidence: 'insufficient', usableEvidenceCount: 0 }]}
    />);
    expect(screen.getByText(/insufficient usable ratios/i)).toBeTruthy();
  });
});
