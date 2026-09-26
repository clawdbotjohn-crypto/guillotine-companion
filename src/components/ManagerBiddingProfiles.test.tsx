/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ManagerBiddingProfile } from '../logic';
import { styleForMultiplier } from '../logic';
import { getWeeksAsStarterBid } from '../logic/waivers';
import { ManagerDetailsModal, ManagerPredictionRow, TeamBidProfiles, WaiverManagerPredictions } from './ManagerBiddingProfiles';
import { buildManagerPredictions, buyerLikelihood, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';

const rosters = [
  { roster_id: 1, owner_id: 'one', players: [], starters: [], settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 900 } },
  { roster_id: 2, owner_id: 'two', players: [], starters: [], settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 200 } },
  { roster_id: 3, owner_id: 'three', players: [], starters: [], settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 1000 } },
];
const users = [
  { user_id: 'one', display_name: 'Aggressive Alice', username: 'alice', avatar: null },
  { user_id: 'two', display_name: 'Careful Chris', username: 'chris', avatar: null },
  { user_id: 'three', display_name: 'Zero Zoe', username: 'zoe', avatar: null },
];

function profile(rosterId: number, multiplier: number | null): ManagerBiddingProfile {
  return {
    managerRosterId: rosterId,
    managerMultiplier: multiplier,
    style: styleForMultiplier(multiplier),
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

function prediction(overrides: Partial<ManagerPredictionDisplay> = {}): ManagerPredictionDisplay {
  return {
    rosterId: 1,
    managerName: 'Aggressive Alice',
    predictedBid: 63,
    currentFaab: 100,
    cappedByFaab: false,
    likelihood: 'Likely',
    profile: profile(1, 1.5),
    ...overrides,
  };
}

const details = {
  upcomingByes: [{ playerId: 'bye-1', name: 'Bye Player', position: 'WR', positionRank: 4, byeWeek: 5, value: 99 }],
  teamNeeds: [
    { position: 'QB', rank: 1, outOf: 8, tier: 'strong' as const },
    { position: 'RB', rank: 8, outOf: 8, tier: 'weak' as const },
    { position: 'WR', rank: 4, outOf: 8, tier: 'neutral' as const },
  ],
};

describe('manager bid presentation', () => {
  it('maps shared active-team position quartiles to buyer likelihood', () => {
    expect(buyerLikelihood(1, 8)).toBe('Unlikely');
    expect(buyerLikelihood(2, 8)).toBe('Unlikely');
    expect(buyerLikelihood(3, 8)).toBe('Possible');
    expect(buyerLikelihood(6, 8)).toBe('Possible');
    expect(buyerLikelihood(7, 8)).toBe('Likely');
    expect(buyerLikelihood(8, 8)).toBe('Likely');
    expect(buyerLikelihood(null, null)).toBe('Possible');
  });

  it('keeps formulas and ordering intact while capping displayed bids at current FAAB', () => {
    const rows = buildManagerPredictions({
      profiles: [profile(1, 1.5), profile(2, 2)],
      baseline: 200,
      rosters,
      users,
      initialFaab: 1000,
      activeRosterIds: new Set([1]),
      positionRanks: new Map([[1, { rank: 8, outOf: 8 }]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ managerName: 'Aggressive Alice', predictedBid: 100, currentFaab: 100, likelihood: 'Likely', cappedByFaab: true });
  });

  it('uses manager predictions from the Weeks-as-Starter baseline, never old predictedWinningBid', () => {
    const currentRow = {
      suggestions: [{ strategy: 'weeks-starter' as const, label: 'Weeks-as-Starter', value: 42, pctOfBudget: 4.2 }],
      predictedWinningBid: 61,
    };
    const baseline = getWeeksAsStarterBid(currentRow);
    expect(baseline).toBe(42);
    const result = buildManagerPredictions({
      profiles: [profile(1, 1.5)], baseline: baseline!, rosters, users, initialFaab: 1000,
      activeRosterIds: new Set([1]), positionRanks: new Map([[1, { rank: 8, outOf: 8 }]]),
    })[0];
    expect(result.predictedBid).toBe(63);
    expect(result.predictedBid).not.toBe(Math.round(currentRow.predictedWinningBid * 1.5));
  });

  it('renders near-full-height safe-area geometry and preserves focus trap, restore, Escape, and backdrop close', () => {
    render(<ManagerPredictionRow prediction={prediction()} details={details} activeFaabAmounts={[800, 100, 0]} getPlayerName={() => 'History Player'} />);
    const trigger = screen.getByRole('button', { name: /open details for Aggressive Alice/i });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Aggressive Alice' });
    const backdrop = screen.getByTestId('manager-modal-backdrop');
    expect(backdrop.parentElement).toBe(document.body);
    expect(backdrop.className).toContain('items-center');
    expect(backdrop.className).toContain('safe-area-inset-top');
    expect(backdrop.className).toContain('safe-area-inset-bottom');
    expect(backdrop.className).toContain('4.75rem');
    expect(dialog.className).toContain('100dvh');
    expect(dialog.className).toContain('5.5rem');
    const close = screen.getByRole('button', { name: /close manager details/i });
    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByTestId('manager-modal-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('shows prominent semantic FAAB quartiles, including positive max green and exact zero red', () => {
    const { rerender } = render(<ManagerDetailsModal
      profile={profile(2, 1.18)} manager="Careful Chris" currentFaabAmount={800}
      activeFaabAmounts={[800, 100, 0]} details={{ upcomingByes: [], teamNeeds: [] }}
      getPlayerName={() => 'Player'} onClose={vi.fn()}
    />);
    let faab = screen.getByText('$800').closest<HTMLElement>('[data-faab-quartile]')!;
    expect(faab.getAttribute('data-faab-quartile')).toBe('top');
    expect(faab.className).toContain('text-[#34d399]');
    expect(within(faab).queryByText('Top FAAB quartile')).toBeNull();
    expect(screen.getByRole('group', { name: 'Remaining FAAB $800, Top FAAB quartile' })).toBe(faab);

    rerender(<ManagerDetailsModal
      profile={profile(3, null)} manager="Zero Zoe" currentFaabAmount={0}
      activeFaabAmounts={[800, 100, 0]} details={{ upcomingByes: [], teamNeeds: [] }}
      getPlayerName={() => 'Player'} onClose={vi.fn()}
    />);
    faab = screen.getByText('$0').closest<HTMLElement>('[data-faab-quartile]')!;
    expect(faab.getAttribute('data-faab-quartile')).toBe('bottom');
    expect(faab.className).toContain('text-[#fb7185]');
    expect(within(faab).queryByText('Bottom FAAB quartile')).toBeNull();
    expect(screen.getByRole('group', { name: 'Remaining FAAB $0, Bottom FAAB quartile' })).toBe(faab);
    expect(screen.queryByText('Learning')).toBeNull();
    expect(screen.queryByText('Not enough history')).toBeNull();
  });

  it('restores Teams composition with highest bid left, combined style/multiplier, and current FAAB', () => {
    render(<TeamBidProfiles
      profiles={[profile(2, 0.84), profile(1, 1.5), profile(3, null)]}
      rosters={rosters}
      users={users}
      initialFaab={1000}
      activeRosterIds={new Set([1, 2, 3])}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      getPlayerName={() => 'History Player'}
    />);
    const cards = screen.getAllByRole('button', { name: /open bid profile/i });
    expect(cards.map((node) => node.getAttribute('aria-label'))).toEqual([
      'Open bid profile for Aggressive Alice', 'Open bid profile for Careful Chris', 'Open bid profile for Zero Zoe',
    ]);
    const alice = cards[0];
    expect(alice.textContent).toMatch(/Aggressive Alice.*Highest bid: \$150.*Aggressive.*1\.50x.*Current FAAB \$100/);
    const chrisFaab = cards[1].querySelector<HTMLElement>('[data-faab-quartile="top"]')!;
    expect(chrisFaab.className).toContain('text-[#34d399]');
    expect(chrisFaab.textContent).toContain('Top FAAB quartile');
    const zoe = cards[2];
    const zoeFaab = zoe.querySelector<HTMLElement>('[data-faab-quartile="bottom"]')!;
    expect(zoeFaab.className).toContain('text-[#fb7185]');
    expect(zoeFaab.textContent).toContain('Bottom FAAB quartile');
    expect(zoe.textContent).toMatch(/Highest bid: —.*Current FAAB \$0/);
    expect(zoe.textContent).not.toMatch(/Learning|Not enough history/);
    expect(screen.queryByText(/canonical|Learning|bids$/i)).toBeNull();
    fireEvent.click(alice);
    expect(screen.getByRole('dialog', { name: 'Aggressive Alice' })).toBeTruthy();
    expect(screen.queryByText(/canonical|Learning/i)).toBeNull();
  });

  it('renders Bid Predictions rows with explicit prediction-side stacking and opens the shared modal', () => {
    render(<WaiverManagerPredictions
      predictions={[
        prediction({ rosterId: 2, managerName: 'Careful Chris', currentFaab: 800, predictedBid: 40, likelihood: 'Possible', profile: profile(2, 1.18) }),
        prediction({ rosterId: 1, managerName: 'Aggressive Alice', currentFaab: 100, predictedBid: 63, likelihood: 'Likely' }),
        prediction({ rosterId: 3, managerName: 'Zero Zoe', currentFaab: 0, predictedBid: 0, likelihood: 'Unlikely', cappedByFaab: true, profile: profile(3, null) }),
      ]}
      detailsByRosterId={new Map([[1, details]])}
      getPlayerName={() => 'History Player'}
    />);
    const row = screen.getByRole('button', { name: /open details for Careful Chris/i });
    const text = row.textContent ?? '';
    expect(text.indexOf('Careful Chris')).toBeLessThan(text.indexOf('Predicted'));
    expect(text.indexOf('Predicted')).toBeLessThan(text.indexOf('Remaining FAAB'));
    expect(text).toContain('Standard');
    expect(text).not.toContain('1.18x');
    expect(screen.getByText('Likely bidder').className).toContain('text-[#34d399]');
    expect(screen.getByText('Possible bidder').className).toContain('text-[#fbbf24]');
    expect(screen.getByText('Unlikely bidder').className).toContain('text-[#fb7185]');
    fireEvent.click(screen.getByRole('button', { name: /open details for Aggressive Alice/i }));
    expect(screen.getByRole('dialog', { name: 'Aggressive Alice' })).toBeTruthy();
    expect(screen.getByLabelText(/QB strength, rank 1 of 8/)).toBeTruthy();
    expect(screen.getByLabelText(/RB need, rank 8 of 8/)).toBeTruthy();
    expect(screen.queryByLabelText(/WR neutral, rank 4 of 8/)).toBeNull();
  });

  it('groups popup strengths before weaknesses, de-duplicates positions, and hides neutral needs', () => {
    render(<ManagerDetailsModal
      profile={profile(1, 1.5)} manager="Aggressive Alice" currentFaabAmount={100}
      activeFaabAmounts={[800, 100, 0]}
      details={{
        upcomingByes: [],
        teamNeeds: [
          { position: 'RB', rank: 8, outOf: 8, tier: 'weak' },
          { position: 'QB', rank: 1, outOf: 8, tier: 'strong' },
          { position: 'WR', rank: 7, outOf: 8, tier: 'weak' },
          { position: 'TE', rank: 2, outOf: 8, tier: 'strong' },
          { position: 'qb', rank: 8, outOf: 8, tier: 'weak' },
          { position: 'K', rank: 4, outOf: 8, tier: 'neutral' },
        ],
      }}
      getPlayerName={() => 'Player'} onClose={vi.fn()}
    />);

    const chips = Array.from(screen.getByRole('dialog').querySelectorAll<HTMLElement>('[data-team-need-tier]'));
    expect(chips.map((chip) => `${chip.textContent}:${chip.dataset.teamNeedTier}`)).toEqual([
      'QB:strong', 'TE:strong', 'RB:weak', 'WR:weak',
    ]);
    expect(screen.queryByLabelText(/qb need/i)).toBeNull();
    expect(screen.queryByLabelText(/K neutral/i)).toBeNull();
    expect(new Set(chips.map((chip) => chip.textContent?.toUpperCase())).size).toBe(chips.length);
  });

  it('sorts Teams profiles by multiplier descending with deterministic name and roster ties', () => {
    const tieRosters = [
      ...rosters,
      { roster_id: 4, owner_id: 'four', players: [], starters: [], settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 500 } },
    ];
    const tieUsers = [
      { user_id: 'one', display_name: 'Zulu High', username: 'zulu', avatar: null },
      { user_id: 'two', display_name: 'Alpha Low', username: 'alpha', avatar: null },
      { user_id: 'three', display_name: 'No History', username: 'none', avatar: null },
      { user_id: 'four', display_name: 'Beta High', username: 'beta', avatar: null },
    ];
    render(<TeamBidProfiles
      profiles={[profile(2, 0.84), profile(3, null), profile(1, 1.5), profile(4, 1.5)]}
      rosters={tieRosters}
      users={tieUsers}
      initialFaab={1000}
      activeRosterIds={new Set([1, 2, 3, 4])}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      getPlayerName={() => 'History Player'}
    />);

    expect(screen.getAllByRole('button', { name: /open bid profile/i }).map((node) => node.getAttribute('aria-label'))).toEqual([
      'Open bid profile for Beta High',
      'Open bid profile for Zulu High',
      'Open bid profile for Alpha Low',
      'Open bid profile for No History',
    ]);
  });

  it('stacks Remaining FAAB beneath Predicted, omits only the expanded-row multiplier, and colors likelihood status', () => {
    render(<ManagerPredictionRow
      prediction={prediction({ currentFaab: 100, predictedBid: 63, likelihood: 'Likely' })}
      details={details}
      activeFaabAmounts={[800, 100, 0]}
      getPlayerName={() => 'History Player'}
    />);

    const row = screen.getByRole('button', { name: /open details for Aggressive Alice/i });
    const heading = within(row).getByTestId('prediction-manager-heading');
    expect(heading.className).toContain('flex');
    expect(heading.textContent).toBe('Aggressive AliceAggressive');
    expect(within(heading).getByText('Aggressive').compareDocumentPosition(within(heading).getByText('Aggressive Alice')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    const predictionSide = within(row).getByTestId('prediction-side');
    const predictedGroup = within(predictionSide).getByTestId('predicted-label-value');
    const faabGroup = within(predictionSide).getByTestId('remaining-faab-label-value');
    expect(predictedGroup.className).toMatch(/inline-flex.*gap-1\.5/);
    expect(faabGroup.className).toMatch(/inline-flex.*gap-1\.5/);
    expect(predictedGroup.textContent).toBe('Predicted$63');
    expect(faabGroup.textContent).toContain('Remaining FAAB$100');
    expect(predictionSide.textContent?.indexOf('Predicted')).toBeLessThan(predictionSide.textContent?.indexOf('Remaining FAAB') ?? -1);
    expect(within(row).queryByText('1.50x')).toBeNull();
    expect(within(row).getByText('Likely bidder').className).toContain('text-[#34d399]');

    fireEvent.click(row);
    expect(screen.getByRole('dialog', { name: 'Aggressive Alice' })).toBeTruthy();
    expect(screen.getByText('1.50x')).toBeTruthy();
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
