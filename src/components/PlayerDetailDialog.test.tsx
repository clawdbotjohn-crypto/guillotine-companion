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
    expect(within(dialog).getByText('Week 2 · Won · canonical waiver event')).toBeTruthy();
    expect(within(dialog).getByText('Week 2 · Lost · canonical waiver event')).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Winning bids' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Other bids' })).toBeTruthy();
  });

  it('closes on Escape and presents owned players without acquisition context', () => {
    const onClose = vi.fn();
    render(<PlayerDetailDialog open onClose={onClose} data={{ ...data, owned: true, ownerLabel: 'Rostered.' }} />);
    expect(screen.getByText('Owned / rostered')).toBeTruthy();
    expect(screen.queryByText('Free agent context')).toBeNull();
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
});
