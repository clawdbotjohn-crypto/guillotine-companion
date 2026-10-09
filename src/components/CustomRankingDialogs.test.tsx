/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDeleteCustomRankingDialog, CustomRankingSettingsDialog, NewCustomRankingDialog } from './CustomRankingDialogs';
import { createCustomRanking, type CustomRankingConfig } from '../logic/customRankings';
import type { WaiverPlayerRow } from '../logic/waivers';

const row: WaiverPlayerRow = {
  playerId: 'p1', name: 'Example Player', position: 'RB', posRank: 1, rosPoints: 100,
  projectedPointsPerWeek: 10, sourceValue: 100, sourceRank: 3, starterWeeks: 5, possibleStarterWeeks: 8,
  predictedWinningBid: 50,
  suggestions: [{ strategy: 'max-vorp', label: 'Max VORP', value: 40, pctOfBudget: 4 }],
};
const config: CustomRankingConfig = { name: 'My Values', baseRankingSource: 'sleeper', baseStrategy: 'max-vorp', multiplier: 2, modifier: -5 };
const board = createCustomRanking({ id: 'board-1', leagueId: 'league', season: '2026', config, rows: [row], now: '2026-10-09T00:00:00Z' });

describe('custom ranking dialogs', () => {
  it('creates from named source/strategy settings with a clear floor preview', () => {
    const onCreate = vi.fn();
    const onConfigChange = vi.fn();
    render(<NewCustomRankingDialog open config={config} rows={[row]} atCap={false} existingNames={[]} onConfigChange={onConfigChange} onSourceChange={vi.fn()} onCreate={onCreate} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'New custom ranking' });
    expect(within(dialog).getByLabelText('Formula preview').textContent).toContain('max($0');
    expect(within(dialog).getByLabelText('Formula preview').textContent).toContain('$40 → $75');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create ranking' }));
    expect(onCreate).toHaveBeenCalledWith(config);
  });

  it('blocks the eleventh ranking and duplicate names', () => {
    const { rerender } = render(<NewCustomRankingDialog open config={config} rows={[row]} atCap existingNames={[]} onConfigChange={vi.fn()} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Create ranking' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Maximum 10/i)).toBeTruthy();
    rerender(<NewCustomRankingDialog open config={config} rows={[row]} atCap={false} existingNames={['my values']} onConfigChange={vi.fn()} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/unique name/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create ranking' }).hasAttribute('disabled')).toBe(true);
  });

  it('spells out and confirms reset and recalculation before destructive callbacks', () => {
    const onReset = vi.fn();
    const onRecalculate = vi.fn();
    const props = { board, config, rows: [row], onConfigChange: vi.fn(), onSourceChange: vi.fn(), onSave: vi.fn(), onReset, onRecalculate, onDelete: vi.fn(), onClose: vi.fn() };
    const { rerender } = render(<CustomRankingSettingsDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset values' }));
    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByText(/permanently removes every manual override/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset values' }));
    expect(onReset).toHaveBeenCalledTimes(1);

    rerender(<CustomRankingSettingsDialog {...props} board={null} />);
    rerender(<CustomRankingSettingsDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Recalculate' }));
    expect(onRecalculate).not.toHaveBeenCalled();
    expect(screen.getByText(/replaces the frozen generated baseline/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Recalculate and clear' }));
    expect(onRecalculate).toHaveBeenCalledWith(config);
  });

  it('requires explicit delete confirmation and explains unaffected market data', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDeleteCustomRankingDialog board={board} onConfirm={onConfirm} onClose={vi.fn()} />);
    expect(screen.getByText(/predicted winning bids/i)).toBeTruthy();
    expect(screen.getByText(/Team Impact/i)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete ranking' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
