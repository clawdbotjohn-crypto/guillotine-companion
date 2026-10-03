/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCompletedAuctions, type CanonicalBidEvent } from '../logic';
import type { PlayerRecord } from '../store/players';
import { BiddingHistoryView } from './BiddingHistoryPage';

function event(overrides: Partial<CanonicalBidEvent> = {}): CanonicalBidEvent {
  return {
    transactionId: 'winner-one',
    managerRosterId: 1,
    playerId: 'p1',
    transactionWeek: 2,
    decisionWeek: 3,
    batchKey: '2:1:5000',
    actualBid: 120,
    outcome: 'won',
    createdAt: 1_000,
    processedAt: 5_000,
    faabAvailableBeforeBid: 1_000,
    faabReconstruction: 'transaction-ledger',
    duplicateCount: 1,
    ...overrides,
  };
}

const players = new Map<string, PlayerRecord>([
  ['p1', { player_id: 'p1', first_name: 'Alpha', last_name: 'Runner', full_name: 'Alpha Runner', position: 'RB', team: 'SEA', age: 24, injury_status: null, status: 'Active' }],
  ['p2', { player_id: 'p2', first_name: 'Zero', last_name: 'Claim', full_name: 'Zero Claim', position: 'WR', team: 'MIN', age: 25, injury_status: null, status: 'Active' }],
]);

const events = [
  event(),
  event({ transactionId: 'loss', managerRosterId: 2, actualBid: 100, outcome: 'legitimate-loss', duplicateCount: 2 }),
  event({ transactionId: 'zero', playerId: 'p2', batchKey: '1:1:4000', transactionWeek: 1, decisionWeek: 2, actualBid: 0, createdAt: 900, processedAt: 4_000 }),
];

const props = {
  auctions: buildCompletedAuctions(events),
  events,
  managerLabels: new Map([[1, 'Winning Manager'], [2, 'Former Manager']]),
  eliminatedRosterIds: new Set([1, 2]),
  players,
};

afterEach(() => cleanup());

describe('BiddingHistoryView', () => {
  it('defaults to the latest week and shows honest summary and canonical runner-up evidence', () => {
    render(<BiddingHistoryView {...props} eliminationStatusUnavailable />);

    expect(screen.getByRole('button', { name: 'Week 3', pressed: true })).toBeTruthy();
    expect(screen.getByText(/Current elimination status is unavailable/i)).toBeTruthy();
    expect(screen.getByText('Alpha Runner')).toBeTruthy();
    expect(screen.queryByText('Zero Claim')).toBeNull();
    expect(screen.getByText('Runner-up evidence')).toBeTruthy();
    expect(screen.getByText('$100')).toBeTruthy();
    expect(screen.getAllByText('Eliminated').length).toBeGreaterThan(0);
    expect(screen.getByText(/alternative\/drop paths were consolidated/i)).toBeTruthy();
    expect(screen.getByText(/Missing participation is never \$0/i)).toBeTruthy();

    const summary = screen.getByRole('region', { name: 'Auction summary' });
    expect(within(summary).getByText('1')).toBeTruthy();
    expect(within(summary).getAllByText('$120').length).toBeGreaterThan(0);
  });

  it('distinguishes a true $0 claim from missing participation and opens the shared player dialog', () => {
    render(<BiddingHistoryView {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'All weeks' }));

    expect(screen.getByText('True $0 claim')).toBeTruthy();
    expect(screen.getByText(/Losing-bid participation is unavailable and is not treated as \$0/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Open Zero Claim details/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Zero Claim' })).toBeTruthy();
    expect(within(dialog).getByText('Winning price')).toBeTruthy();
    expect(within(dialog).getAllByText('$0').length).toBeGreaterThan(0);
    expect(within(dialog).queryByText('Suggested')).toBeNull();
    expect(within(dialog).queryByText('Predicted')).toBeNull();
  });

  it('shows an honest empty state without synthesizing bids', () => {
    render(<BiddingHistoryView {...props} auctions={[]} events={[]} />);
    expect(screen.getByRole('heading', { name: 'No completed auctions yet' })).toBeTruthy();
    expect(screen.getByText(/Failed roster moves, unmatched failures, trades/i)).toBeTruthy();
  });
});
