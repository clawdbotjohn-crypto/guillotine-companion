/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ManagerBiddingProfile } from '../logic';
import { getWeeksAsStarterBid } from '../logic/waivers';
import { ManagerPredictionRow, TeamBidProfiles } from './ManagerBiddingProfiles';
import { buildManagerPredictions, buyerLikelihood } from '../logic/managerPredictionDisplay';

const rosters = [
  { roster_id: 1, owner_id: 'one', players: [], starters: [], settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 900 } },
  { roster_id: 2, owner_id: 'two', players: [], starters: [], settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 200 } },
];
const users = [
  { user_id: 'one', display_name: 'Aggressive Alice', username: 'alice', avatar: null },
  { user_id: 'two', display_name: 'Careful Chris', username: 'chris', avatar: null },
];

function profile(rosterId: number, multiplier: number | null): ManagerBiddingProfile {
  return {
    managerRosterId: rosterId,
    managerMultiplier: multiplier,
    style: multiplier == null ? 'insufficient' : multiplier > 1.15 ? 'aggressive' : 'conservative',
    confidence: multiplier == null ? 'insufficient' : 'low',
    usableEvidenceCount: multiplier == null ? 0 : 1,
    evidence: rosterId === 1 ? [{
      transactionId: 'tx-1', managerRosterId: 1, playerId: 'player-1', transactionWeek: 3,
      decisionWeek: 4, batchKey: 'batch', actualBid: 150, outcome: 'won', createdAt: 1,
      processedAt: 2, faabAvailableBeforeBid: 1000, faabReconstruction: 'transaction-ledger',
      duplicateCount: 1, baseline: 100, provenance: 'reconstructed', captureProvenance: 'reconstructed',
      matchesRequestedDecisionWeek: true, snapshotDecisionWeek: 4, effectiveBaseline: 100,
      eventRatio: 1.5, usableForMultiplier: true, budgetConstrained: false,
    }] : [],
  };
}

describe('manager bid presentation', () => {
  it('maps active-team position-strength thirds to buyer likelihood', () => {
    expect(buyerLikelihood(1, 9)).toBe('Unlikely');
    expect(buyerLikelihood(3, 9)).toBe('Unlikely');
    expect(buyerLikelihood(4, 9)).toBe('Possible');
    expect(buyerLikelihood(6, 9)).toBe('Possible');
    expect(buyerLikelihood(7, 9)).toBe('Likely');
    expect(buyerLikelihood(9, 9)).toBe('Likely');
    expect(buyerLikelihood(null, null)).toBe('Possible');
  });

  it('keeps willingness math internal, caps the displayed bid at FAAB, and excludes inactive teams', () => {
    const rows = buildManagerPredictions({
      profiles: [profile(1, 1.5), profile(2, 2)],
      baseline: 200,
      rosters,
      users,
      initialFaab: 1000,
      activeRosterIds: new Set([1]),
      positionRanks: new Map([[1, { rank: 9, outOf: 9 }]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      managerName: 'Aggressive Alice', predictedBid: 100, currentFaab: 100, likelihood: 'Likely',
    });
  });

  it('uses the lower Weeks-as-Starter value for current forecasts, not predicted winning bid', () => {
    const currentRow = {
      suggestions: [{ strategy: 'weeks-starter' as const, label: 'Weeks-as-Starter', value: 42, pctOfBudget: 4.2 }],
      predictedWinningBid: 61,
    };
    const baseline = getWeeksAsStarterBid(currentRow);
    expect(baseline).toBe(42);
    const prediction = buildManagerPredictions({
      profiles: [profile(1, 1.5)], baseline: baseline!, rosters, users, initialFaab: 1000,
      activeRosterIds: new Set([1]), positionRanks: new Map([[1, { rank: 9, outOf: 9 }]]),
    })[0];
    expect(prediction).toMatchObject({ predictedBid: 63, cappedByFaab: false });
    expect(prediction.predictedBid).not.toBe(Math.round(currentRow.predictedWinningBid * 1.5));
  });

  it('sorts buyer tiers before bids and uses deterministic bid/name ordering within tiers', () => {
    const tierRosters = [1, 2, 3, 4].map((id) => ({
      roster_id: id, owner_id: `u${id}`, players: [], starters: [],
      settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
    }));
    const tierUsers = ['Zed', 'Amy', 'Bob', 'Cal'].map((name, index) => ({
      user_id: `u${index + 1}`, display_name: name, username: name.toLowerCase(), avatar: null,
    }));
    const rows = buildManagerPredictions({
      profiles: [profile(1, 3), profile(2, 1), profile(3, 2), profile(4, 2)],
      baseline: 10, rosters: tierRosters, users: tierUsers, initialFaab: 1000,
      activeRosterIds: new Set([1, 2, 3, 4]),
      positionRanks: new Map([
        [1, { rank: 1, outOf: 9 }], [2, { rank: 8, outOf: 9 }],
        [3, { rank: 5, outOf: 9 }], [4, { rank: 5, outOf: 9 }],
      ]),
    });
    expect(rows.map((row) => `${row.likelihood}:${row.managerName}:${row.predictedBid}`)).toEqual([
      'Likely:Amy:10', 'Possible:Bob:20', 'Possible:Cal:20', 'Unlikely:Zed:30',
    ]);
  });

  it('shows only plain-language prediction and simplified bidding history', () => {
    const prediction = buildManagerPredictions({
      profiles: [profile(1, 1.5)], baseline: 200, rosters, users, initialFaab: 1000,
      activeRosterIds: new Set([1]), positionRanks: new Map([[1, { rank: 5, outOf: 9 }]]),
    })[0];
    render(<ManagerPredictionRow prediction={prediction} getPlayerName={() => 'History Player'} />);
    const cappedBid = screen.getByLabelText('Predicted bid $100, capped by available FAAB');
    expect(cappedBid.className).toContain('text-[#f87171]');
    expect(screen.getByText(/FAAB cap/)).toBeTruthy();
    expect(screen.getByText('Possible buyer')).toBeTruthy();
    expect(screen.queryByText(/baseline|provenance|confidence|raw|willingness|feasible/i)).toBeNull();
    fireEvent.click(screen.getByText('Bidding History'));
    expect(screen.getByText('History Player · Wk 3 · Won')).toBeTruthy();
    expect(screen.getByText('Suggested $100 · Actual $150 · FAAB $1000 · Ratio 1.50×')).toBeTruthy();
  });

  it('sorts Teams bid profiles most-to-least aggressive and exposes current FAAB', () => {
    render(<TeamBidProfiles
      profiles={[profile(2, 0.7), profile(1, 1.5)]}
      rosters={rosters}
      users={users}
      initialFaab={1000}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      getPlayerName={() => 'History Player'}
    />);
    const summaries = screen.getAllByText(/Aggressive Alice|Careful Chris/);
    expect(summaries.map((node) => node.textContent)).toEqual(['Aggressive Alice', 'Careful Chris']);
    expect(screen.getByText('Current FAAB $100')).toBeTruthy();
    expect(screen.getByText('Current FAAB $800')).toBeTruthy();
    expect(screen.getByText('1.50× · Aggressive')).toBeTruthy();
    expect(screen.getByText('0.70× · Conservative')).toBeTruthy();
  });

  it('renders loading and retryable error states', () => {
    const props = { profiles: [], rosters, users, initialFaab: 1000, onRetry: vi.fn(), getPlayerName: vi.fn() };
    const { rerender } = render(<TeamBidProfiles {...props} isLoading error={null} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
    const retry = vi.fn();
    rerender(<TeamBidProfiles {...props} isLoading={false} error={new Error('failed')} onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
