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
  status: 'Active', sourceLabel: 'FantasyCalc', value: 44, positionRank: 7,
  owned: false, suggestedBid: 12, managerPredictions: [],
  history: [event('win', 'won', 15), event('loss', 'legitimate-loss', 13)],
};

describe('PlayerDetailDialog', () => {
  it('shows changing source context and hides legitimate losing bids until requested', () => {
    const { rerender } = render(<PlayerDetailDialog open onClose={vi.fn()} data={data} />);
    const dialog = screen.getByRole('dialog', { name: 'Detail Player' });
    expect(within(dialog).getByText('FantasyCalc · RB #7')).toBeTruthy();
    rerender(<PlayerDetailDialog open onClose={vi.fn()} data={{ ...data, sourceLabel: 'Fantasy Pros', positionRank: 5 }} />);
    expect(within(dialog).getByText('Fantasy Pros · RB #5')).toBeTruthy();
    expect(within(dialog).queryByText('FantasyCalc · RB #7')).toBeNull();
    expect(within(dialog).getByText('Week 2 · Winner')).toBeTruthy();
    expect(within(dialog).queryByText('Week 2 · Competing bid')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Show losing bids (1)' }));
    expect(within(dialog).getByText('Week 2 · Competing bid')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Hide losing bids' })).toBeTruthy();
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
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.mouseDown(dialog.parentElement!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
