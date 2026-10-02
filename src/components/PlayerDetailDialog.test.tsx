/* @vitest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalBidEvent } from '../logic';
import { PlayerDetailDialog, type PlayerDetailData } from './PlayerDetailDialog';

function event(id: string, outcome: CanonicalBidEvent['outcome'], bid: number, batchKey = '2025:2:p1'): CanonicalBidEvent {
  return {
    transactionId: id, managerRosterId: outcome === 'won' ? 1 : 2, playerId: 'p1',
    transactionWeek: 2, decisionWeek: 2, batchKey, actualBid: bid, outcome,
    createdAt: 10, processedAt: 10, faabAvailableBeforeBid: 100,
    faabReconstruction: 'transaction-ledger', duplicateCount: 1,
  };
}

const data: PlayerDetailData = {
  playerId: 'p1', name: 'Detail Player', position: 'RB', team: 'SEA', age: 25,
  status: 'Active', sourceLabel: 'FantasyCalc', valueLabel: 'FC value', valueDisplay: '44', value: 44, positionRank: 7,
  owned: false, suggestedBid: 12, managerPredictions: [],
  history: [event('win', 'won', 15), event('loss', 'legitimate-loss', 13)],
};

describe('PlayerDetailDialog', () => {
  it('shows current source plus named winning and other bids without hiding legitimate competitors', () => {
    const labels = new Map([[1, 'Winning Team'], [2, 'Competing Team']]);
    const { rerender } = render(<PlayerDetailDialog open onClose={vi.fn()} data={{ ...data, managerLabels: labels }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    expect(within(dialog).getByText('FantasyCalc · RB #7')).toBeTruthy();
    expect(within(dialog).getByText('FC value')).toBeTruthy();
    expect(within(dialog).getByText('44')).toBeTruthy();
    expect(within(dialog).queryByText('$44')).toBeNull();
    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{ ...data, managerLabels: labels, sourceLabel: 'Fantasy Pros', positionRank: 5 }} />);
    expect(within(dialog).getByText('Fantasy Pros · RB #5')).toBeTruthy();
    expect(within(dialog).queryByText('FantasyCalc · RB #7')).toBeNull();
    expect(within(dialog).getByText('Winning Team')).toBeTruthy();
    expect(within(dialog).getByText('Competing Team')).toBeTruthy();
    expect(within(dialog).getByText('Week 2 · Won')).toBeTruthy();
    expect(within(dialog).getByText('Week 2 · Lost')).toBeTruthy();
    expect(within(dialog).queryByText(/canonical/i)).toBeNull();
    expect(within(dialog).getByRole('region', { name: 'Winning bids' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Other bids' })).toBeTruthy();
  });

  it('closes on Escape and removes the entire explanatory roster section for owned players', () => {
    const onClose = vi.fn();
    render(<PlayerDetailDialog open onClose={onClose} data={{ ...data, owned: true, ownerLabel: 'Rostered by Rain City Axes.' }} />);
    expect(screen.queryByText('Owned / rostered')).toBeNull();
    expect(screen.queryByText('Rostered by Rain City Axes.')).toBeNull();
    expect(screen.queryByText(/Acquisition impact is not calculated/i)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Roster status' })).toBeNull();
    expect(screen.queryByLabelText('Acquisition context')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes from the backdrop and restores focus to its opener', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button type="button" onClick={() => setOpen(true)}>Open player</button><PlayerDetailDialog open={open} onClose={() => setOpen(false)} data={data} /></>;
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open player' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const backdrop = screen.getByTestId('player-detail-backdrop');
    expect(backdrop.parentElement).toBe(document.body);
    expect(backdrop.className).toContain('items-start');
    expect(backdrop.className).toContain('safe-area-inset-top');
    expect(backdrop.className).toContain('4.75rem');
    expect(dialog.className).toContain('100dvh');
    expect(dialog.className).toContain('overflow-hidden');
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.mouseDown(dialog.parentElement!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
  it('shows complete free-agent Team Impact with an honest starter/drop and bid-independent points', () => {
    const impact = {
      status: 'available' as const,
      overallRank: { before: 24, after: 18, outOf: 26 },
      positionRank: { before: 18, after: 3, outOf: 26 },
      lineupPoints: { before: 64, after: 77 },
      position: 'RB',
      incomingPlayerStarts: true,
      displacedStarterIds: ['old-rb'],
      assumedDropPlayerId: 'bench-rb',
      dropReason: 'lowest-projected-non-starter' as const,
    };
    const getPlayerName = (playerId: string) => ({ 'old-rb': 'Old Starter', 'bench-rb': 'Bench Player' })[playerId] ?? playerId;
    const { rerender } = render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      remainingFaab: 100,
      teamImpact: impact,
      getPlayerName,
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    expect(within(dialog).getByText('Team impact')).toBeTruthy();
    expect(within(dialog).getByText('24/26 → 18/26')).toBeTruthy();
    expect(within(dialog).getByText('18/26 → 3/26')).toBeTruthy();
    expect(within(dialog).getByText('64.0 → 77.0')).toBeTruthy();
    expect(within(dialog).getByText(/Detail Player enters; Old Starter moves out/)).toBeTruthy();
    expect(within(dialog).getByText(/Bench Player · lowest projected non-starter/)).toBeTruthy();
    expect(within(dialog).getByText('$100 → $88')).toBeTruthy();
    expect(within(dialog).getByText('The suggested bid changes FAAB only. It does not change projected points.')).toBeTruthy();

    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      suggestedBid: 99,
      remainingFaab: 100,
      teamImpact: impact,
      getPlayerName,
    }} />);
    expect(within(dialog).getByText('64.0 → 77.0')).toBeTruthy();
    expect(within(dialog).getByText('$100 → $1')).toBeTruthy();
  });

  it('collapses fully calculated no-change and truthful $0 impact to No impact', () => {
    const noChangeImpact = {
      status: 'available' as const,
      overallRank: { before: 8, after: 8, outOf: 10 },
      positionRank: { before: 6, after: 6, outOf: 10 },
      lineupPoints: { before: 104.5, after: 104.5 },
      position: 'RB',
      incomingPlayerStarts: false,
      displacedStarterIds: [],
      assumedDropPlayerId: 'bench-rb',
      dropReason: 'lowest-projected-non-starter' as const,
    };
    const { rerender } = render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      teamImpact: noChangeImpact,
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    expect(within(dialog).getByText('No impact')).toBeTruthy();
    expect(within(dialog).queryByText('Overall')).toBeNull();
    expect(within(dialog).queryByText('Projection change:')).toBeNull();

    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      suggestedBid: 0,
      teamImpact: {
        ...noChangeImpact,
        overallRank: { before: 8, after: 7, outOf: 10 },
        positionRank: { before: 6, after: 5, outOf: 10 },
        lineupPoints: { before: 104.5, after: 110 },
        incomingPlayerStarts: true,
        displacedStarterIds: ['old-rb'],
      },
    }} />);
    expect(within(dialog).getByText('No impact')).toBeTruthy();
    expect(within(dialog).queryByText('Overall')).toBeNull();
  });

  it('keeps missing Team Impact evidence distinct as concise Impact unavailable', () => {
    const reason = 'This player has no next-week Sleeper projection.';
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      teamImpact: { status: 'unavailable', reason },
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    expect(within(dialog).getByText('Impact unavailable')).toBeTruthy();
    expect(within(dialog).queryByText(reason)).toBeNull();
    expect(within(dialog).getByLabelText(`Impact unavailable: ${reason}`)).toBeTruthy();
    expect(within(dialog).queryByText('No impact')).toBeNull();
    expect(within(dialog).queryByText('Overall')).toBeNull();
    expect(within(dialog).queryByText('Lineup pts')).toBeNull();
  });

  it('renders $0 predicted bidding as None without manager rows or changing observed history', () => {
    const labels = new Map([[1, 'Winning Team'], [2, 'Competing Team']]);
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      suggestedBid: 0,
      managerLabels: labels,
      managerPredictions: [{
        rosterId: 2,
        managerName: 'Stale Prediction Manager',
        predictedBid: 25,
        currentFaab: 100,
        cappedByFaab: false,
        likelihood: 'Likely',
        profile: {
          managerRosterId: 2,
          managerMultiplier: 1,
          style: 'standard',
          confidence: 'low',
          usableEvidenceCount: 1,
          baselineStrategyId: 'max-vorp',
          baselineStrategyVersion: 'max-vorp-v1',
          evidence: [],
        },
      }],
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const predictionState = within(dialog).getByRole('region', { name: 'Predicted bidding' });
    expect(within(predictionState).getByText('None')).toBeTruthy();
    expect(within(dialog).queryByText('Stale Prediction Manager')).toBeNull();
    expect(within(dialog).queryByTestId('expanded-manager-list')).toBeNull();
    expect(within(dialog).getByText('Winning Team')).toBeTruthy();
    const history = within(dialog).getByText('Bidding history · 2').closest('details')!;
    expect(within(history).getByText('$15')).toBeTruthy();
    expect(within(history).getByText('$13')).toBeTruthy();
    expect(within(history).queryByText('$0')).toBeNull();
  });

  it('uses compact profile copy and renders empty history as static content', () => {
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      status: 'Active',
      injuryStatus: 'Questionable',
      nextWeek: 4,
      nextWeekPoints: 13.4,
      projectionState: 'loaded',
      byeWeek: 8,
      history: [],
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    expect(within(dialog).getByText('Age: 25')).toBeTruthy();
    expect(within(dialog).getByText('Status: Questionable')).toBeTruthy();
    expect(within(dialog).queryByText(/Injury:/)).toBeNull();
    expect(within(dialog).getByText('Bye: 8')).toBeTruthy();
    expect(within(dialog).getByText('Proj.: 13.4 (W4)')).toBeTruthy();
    expect(within(dialog).queryByText(/Sleeper weekly proj/i)).toBeNull();
    expect(within(dialog).getByRole('region', { name: 'Bidding history' }).textContent).toContain('No bidding history.');
    expect(within(dialog).queryByText('Bidding history · None')).toBeNull();
    expect(within(dialog).queryByText('Free agent context')).toBeNull();
  });

  it('shows loaded missing and numeric-zero projections as 0 while preserving loading and error states', () => {
    const { rerender } = render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data, nextWeek: 4, nextWeekPoints: null, projectionState: 'loaded',
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    expect(within(dialog).getByText('Proj.: 0 (W4)')).toBeTruthy();

    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data, nextWeek: 4, nextWeekPoints: 0, projectionState: 'loaded',
    }} />);
    expect(within(dialog).getByText('Proj.: 0 (W4)')).toBeTruthy();

    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data, nextWeek: 4, nextWeekPoints: null, projectionState: 'loading',
    }} />);
    expect(within(dialog).getByText('Proj.: Loading… (W4)')).toBeTruthy();

    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data, nextWeek: 4, nextWeekPoints: null, projectionState: 'error',
    }} />);
    expect(within(dialog).getByText('Proj.: Unavailable (W4)')).toBeTruthy();
  });

  it('opens filled bidding history by default and omits empty owned status', () => {
    const { rerender } = render(<PlayerDetailDialog open onClose={vi.fn()} data={data} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const historySummary = within(dialog).getByText('Bidding history · 2');
    expect((historySummary.closest('details') as HTMLDetailsElement).open).toBe(true);

    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{ ...data, owned: true, ownerLabel: undefined }} />);
    expect(within(dialog).queryByText('Owned / rostered')).toBeNull();
    expect(within(dialog).queryByRole('region', { name: 'Roster status' })).toBeNull();
  });

});
