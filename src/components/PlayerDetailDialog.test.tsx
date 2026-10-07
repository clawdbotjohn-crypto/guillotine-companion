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

function managerPrediction(
  rosterId: number,
  managerName: string,
  predictedBid: number,
  likelihood: 'Likely' | 'Possible' | 'Unlikely',
): NonNullable<PlayerDetailData['managerPredictions']>[number] {
  return {
    rosterId,
    managerName,
    predictedBid,
    currentFaab: 100,
    cappedByFaab: false,
    likelihood,
    profile: {
      managerRosterId: rosterId,
      managerMultiplier: 1,
      style: 'standard',
      confidence: 'low',
      usableEvidenceCount: 1,
      baselineStrategyId: 'max-vorp',
      baselineStrategyVersion: 'max-vorp-v1',
      evidence: [],
    },
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
  it('shows Team Impact as a four-line vertical stack without explanatory copy', () => {
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
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      remainingFaab: 100,
      teamImpact: impact,
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const teamImpact = within(dialog).getByRole('region', { name: 'Team Impact' });
    expect(within(teamImpact).queryByText('None')).toBeNull();
    expect(within(teamImpact).getByText('+13.0')).toBeTruthy();
    expect(within(teamImpact).getByLabelText('Lineup points delta plus 13.0')).toBeTruthy();
    expect(within(teamImpact).getByLabelText('Overall: 24/26 to 18/26')).toBeTruthy();
    expect(within(teamImpact).getByLabelText('RB: 18/26 to 3/26')).toBeTruthy();
    expect(within(teamImpact).getByTestId('team-impact-overall-before').style.color).toBe('rgb(244, 63, 94)');
    expect(within(teamImpact).getByTestId('team-impact-overall-after').style.color).toBe('rgb(245, 158, 11)');
    expect(within(teamImpact).getByTestId('team-impact-position-before').style.color).toBe('rgb(245, 158, 11)');
    expect(within(teamImpact).getByTestId('team-impact-position-after').style.color).toBe('rgb(16, 185, 129)');
    expect(within(teamImpact).getByText('Lineup pts: 64.0 → 77.0')).toBeTruthy();
    expect(within(teamImpact).queryByText('Optimized next-week lineup · active teams only')).toBeNull();
    expect(within(teamImpact).queryByText('Projection change:')).toBeNull();
    expect(within(teamImpact).queryByText('Starter change:')).toBeNull();
    expect(within(teamImpact).queryByText('Assumed drop:')).toBeNull();
    expect(within(teamImpact).queryByText('FAAB:')).toBeNull();
    expect(within(teamImpact).queryByText('The suggested bid changes FAAB only. It does not change projected points.')).toBeNull();
  });

  it('renders calculated no-change and truthful $0 Team Impact as the same simple None state as empty Predicted bidding', () => {
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
    const teamImpact = within(dialog).getByRole('region', { name: 'Team Impact' });
    const predictedBidding = within(dialog).getByRole('region', { name: 'Predicted bidding' });
    const impactNone = within(teamImpact).getByText('None');
    const predictedNone = within(predictedBidding).getByText('None');
    expect(impactNone.className).toBe(predictedNone.className);
    expect(impactNone.className).toBe('mt-1 text-xs text-[#9ca3c7]');
    expect(impactNone.className).not.toContain('bg-');
    expect(impactNone.className).not.toContain('rounded');
    expect(impactNone.className).not.toMatch(/(?:^|\s)p(?:[trblxy]?)-/);
    expect(within(teamImpact).queryByText('Overall')).toBeNull();
    expect(within(teamImpact).queryByText('Projection change:')).toBeNull();

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
    expect(within(teamImpact).getByText('None')).toBeTruthy();
    expect(within(teamImpact).queryByText('Overall')).toBeNull();
  });

  it('shows unavailable Team Impact as flat None while preserving an accessible reason', () => {
    const reason = 'This player has no next-week Sleeper projection.';
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      teamImpact: { status: 'unavailable', reason },
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const teamImpact = within(dialog).getByRole('region', { name: 'Team Impact' });
    const predictedBidding = within(dialog).getByRole('region', { name: 'Predicted bidding' });
    const unavailable = within(teamImpact).getByText('None');
    const predictedNone = within(predictedBidding).getByText('None');
    expect(unavailable.className).toBe(predictedNone.className);
    expect(unavailable.className).toBe('mt-1 text-xs text-[#9ca3c7]');
    expect(unavailable.className).not.toContain('bg-');
    expect(unavailable.className).not.toContain('rounded');
    expect(unavailable.className).not.toMatch(/(?:^|\s)p(?:[trblxy]?)-/);
    expect(within(teamImpact).queryByText(reason)).toBeNull();
    expect(within(teamImpact).getByLabelText(`Impact unavailable: ${reason}`)).toBe(unavailable);
    expect(within(teamImpact).queryByText('Impact unavailable')).toBeNull();
    expect(within(teamImpact).queryByText('Overall')).toBeNull();
    expect(within(teamImpact).queryByText('Lineup pts')).toBeNull();
  });

  it('shows $0 in the compact Predicted summary when no eligible positive bid exists', () => {
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      suggestedBid: 2,
      managerPredictions: [
        managerPrediction(2, 'Likely Zero Manager', 0, 'Likely'),
        managerPrediction(3, 'Possible Zero Manager', 0, 'Possible'),
        managerPrediction(4, 'Unlikely Positive Manager', 25, 'Unlikely'),
      ],
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const acquisition = within(dialog).getByRole('region', { name: 'Acquisition context' });
    expect(within(acquisition).getByText('$2')).toBeTruthy();
    expect(within(acquisition).getByText('$0')).toBeTruthy();
    expect(within(acquisition).queryByText('None')).toBeNull();
  });

  it('preserves a positive dollar value in the compact Predicted summary', () => {
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      suggestedBid: 2,
      managerPredictions: [
        managerPrediction(2, 'Likely Zero Manager', 0, 'Likely'),
        managerPrediction(5, 'Positive Eligible Manager', 7, 'Possible'),
      ],
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const acquisition = within(dialog).getByRole('region', { name: 'Acquisition context' });
    expect(within(acquisition).getByText('$7')).toBeTruthy();
    expect(within(acquisition).queryByText('$0')).toBeNull();
    expect(within(dialog).queryByRole('region', { name: 'Predicted bidding' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Open details for Positive Eligible Manager' })).toBeTruthy();
  });

  it('keeps the lower all-$0 Predicted bidding state semantic None and preserves observed $0 history', () => {
    const labels = new Map([[1, 'Winning Team'], [2, 'Competing Team']]);
    const history = [event('zero-win', 'won', 0), event('loss', 'legitimate-loss', 13)];
    render(<PlayerDetailDialog open onClose={vi.fn()} data={{
      ...data,
      suggestedBid: 2,
      history,
      managerLabels: labels,
      managerPredictions: [
        managerPrediction(2, 'Likely Zero Manager', 0, 'Likely'),
        managerPrediction(3, 'Possible Zero Manager', 0, 'Possible'),
        managerPrediction(4, 'Unlikely Positive Manager', 25, 'Unlikely'),
      ],
    }} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    const predictionState = within(dialog).getByRole('region', { name: 'Predicted bidding' });
    expect(within(predictionState).getByText('None')).toBeTruthy();
    expect(within(predictionState).queryByText('$0')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /Open details for/ })).toBeNull();
    expect(within(dialog).queryByTestId('expanded-manager-list')).toBeNull();
    expect(within(dialog).getByText('Winning Team')).toBeTruthy();
    const biddingHistory = within(dialog).getByText('Bidding history · 2').closest('details')!;
    expect(within(biddingHistory).getByText('$0')).toBeTruthy();
    expect(within(biddingHistory).getByText('$13')).toBeTruthy();
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
