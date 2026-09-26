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

  it('opens one accessible shared modal with ordered sections and a mobile 2x2 history grid', () => {
    const prediction = buildManagerPredictions({
      profiles: [profile(1, 1.5)], baseline: 200, rosters, users, initialFaab: 1000,
      activeRosterIds: new Set([1]), positionRanks: new Map([[1, { rank: 5, outOf: 9 }]]),
    })[0];
    render(<ManagerPredictionRow
      prediction={prediction}
      getPlayerName={() => 'History Player'}
      details={{
        upcomingByes: [{ playerId: 'bye-1', name: 'Bye Player', position: 'WR', positionRank: 4, byeWeek: 5, value: 99 }],
        teamNeeds: [
          { position: 'QB', rank: 1, outOf: 9, tier: 'strong' },
          { position: 'RB', rank: 9, outOf: 9, tier: 'weak' },
          { position: 'WR', rank: 5, outOf: 9, tier: 'neutral' },
        ],
      }}
    />);
    const trigger = screen.getByRole('button', { name: /open details for Aggressive Alice/i });
    expect(screen.queryByRole('dialog')).toBeNull();
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Aggressive Alice' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close manager details/i }));
    expect(document.body.style.overflow).toBe('hidden');
    const headings = Array.from(dialog.querySelectorAll('h3')).map((node) => node.textContent);
    expect(headings).toEqual(['Upcoming byes', 'Team needs', 'Bidding History']);
    expect(screen.getByText('Bye Player')).toBeTruthy();
    expect(screen.getByText(/WR #4 · W5/)).toBeTruthy();
    expect(screen.getByLabelText(/QB strength, rank 1 of 9/)).toBeTruthy();
    expect(screen.getByLabelText(/RB need, rank 9 of 9/)).toBeTruthy();
    expect(screen.queryByText(/^WR$/)).toBeNull();
    const metrics = screen.getByLabelText('Bid metrics for History Player');
    expect(metrics.className).toContain('grid-cols-2');
    expect(screen.getByText('Suggested bid')).toBeTruthy();
    expect(screen.getByText('Actual bid')).toBeTruthy();
    expect(screen.getByText('Pre-bid FAAB')).toBeTruthy();
    expect(screen.getByText('Ratio')).toBeTruthy();
    expect(screen.getByText('$150 · Won').className).toContain('text-[#34d399]');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps Teams cards ordered and compact while adding canonical highest bid', () => {
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
    const cards = screen.getAllByRole('button', { name: /open bid profile/i });
    expect(cards.map((node) => node.getAttribute('aria-label'))).toEqual([
      'Open bid profile for Aggressive Alice', 'Open bid profile for Careful Chris',
    ]);
    expect(screen.getByText('Current FAAB $100')).toBeTruthy();
    expect(screen.getByText('Current FAAB $800')).toBeTruthy();
    expect(screen.getByText('Highest bid: $150')).toBeTruthy();
    expect(screen.getByText('Highest bid: No canonical bids')).toBeTruthy();
    expect(screen.getByText('Aggressive')).toBeTruthy();
    expect(screen.getByText('Conservative')).toBeTruthy();
    fireEvent.click(cards[0]);
    expect(screen.getByRole('dialog', { name: 'Aggressive Alice' })).toBeTruthy();
    expect(screen.queryByText(/Details/i)).toBeNull();
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
