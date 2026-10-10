/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDeleteCustomRankingDialog, CustomRankingSettingsDialog, NewCustomRankingDialog } from './CustomRankingDialogs';
import { createCustomRanking, createDefaultCustomRankingConfig, type CustomRankingConfig } from '../logic/customRankings';
import type { WaiverPlayerRow } from '../logic/waivers';

const row: WaiverPlayerRow = {
  playerId: 'p1', name: 'Example Player', position: 'RB', posRank: 1, rosPoints: 100,
  projectedPointsPerWeek: 10, sourceValue: 100, sourceRank: 3, starterWeeks: 5, possibleStarterWeeks: 8,
  predictedWinningBid: 50,
  suggestions: [{ strategy: 'max-vorp', label: 'Max VORP', value: 40, pctOfBudget: 4 }],
};
const config: CustomRankingConfig = {
  ...createDefaultCustomRankingConfig('sleeper'),
  name: 'My Values',
  multiplier: 2,
  modifier: -5,
};
const board = createCustomRanking({ id: 'board-1', leagueId: 'league', season: '2026', config, rows: [row], now: '2026-10-09T00:00:00Z' });
const settingsProps = {
  board,
  config,
  rows: [row],
  existingNames: [] as string[],
  onConfigChange: vi.fn(),
  onSourceChange: vi.fn(),
  onSave: vi.fn(),
  onReset: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

describe('custom ranking dialogs', () => {
  it('is vertically centered at mobile sizes and uses the exact concise Preview heading', () => {
    render(<NewCustomRankingDialog open config={config} rows={[row]} atCap={false} existingNames={[]} onConfigChange={vi.fn()} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'New custom ranking' });
    const backdrop = screen.getByTestId('custom-ranking-dialog-backdrop');
    expect(backdrop.className).toContain('items-center');
    expect(backdrop.className).not.toContain('items-end');
    expect(dialog.className).toContain('100dvh');
    expect(dialog.className).toContain('overflow-y-auto');
    const preview = within(dialog).getByLabelText('Ranking preview');
    expect(within(preview).getByText('Preview')).toBeTruthy();
    expect(preview.textContent).not.toContain('$0 floor');
    expect(preview.textContent).toContain('$40 → $75');
  });

  it('supports transient empty and minus drafts, negative modifiers, and replacing the initial zero', () => {
    const onConfigChange = vi.fn();
    const zeroConfig = { ...config, modifier: 0 };
    render(<NewCustomRankingDialog open config={zeroConfig} rows={[row]} atCap={false} existingNames={[]} onConfigChange={onConfigChange} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByLabelText('Additive modifier') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('text');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: '-' } });
    expect(input.value).toBe('-');
    fireEvent.change(input, { target: { value: '-20' } });
    expect(input.value).toBe('-20');
    expect(onConfigChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onConfigChange).toHaveBeenLastCalledWith(expect.objectContaining({ modifier: -20 }));

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input.value).toBe('0');
    expect(onConfigChange).toHaveBeenLastCalledWith(expect.objectContaining({ modifier: 0 }));
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '20' } });
    expect(input.value).toBe('20');
    fireEvent.blur(input);
    expect(onConfigChange).toHaveBeenLastCalledWith(expect.objectContaining({ modifier: 20 }));
  });

  it('offers both requested generation modes and all supported position curves', () => {
    const curveConfig: CustomRankingConfig = { ...config, mode: 'position-curve' };
    render(<NewCustomRankingDialog open config={curveConfig} rows={[row]} atCap={false} existingNames={[]} onConfigChange={vi.fn()} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Built-in ranking system' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Position-based value curve' }).getAttribute('aria-pressed')).toBe('true');
    for (const position of ['QB', 'RB', 'WR', 'TE']) {
      expect(screen.getByLabelText(`${position} maximum`)).toBeTruthy();
      expect(screen.getByLabelText(`${position} step`)).toBeTruthy();
    }
    expect(screen.getByLabelText('Global multiplier')).toBeTruthy();
    expect(screen.queryByLabelText('Additive modifier')).toBeNull();
    expect(screen.getByLabelText('Ranking preview').textContent).toContain('rank − 1');
  });

  it('receives $500 league-scaled defaults and preserves them when source changes before create', () => {
    const onConfigChange = vi.fn();
    const budgetConfig: CustomRankingConfig = {
      ...createDefaultCustomRankingConfig('sleeper', 500),
      name: 'Budget values',
      mode: 'position-curve',
    };
    render(<NewCustomRankingDialog open config={budgetConfig} rows={[row]} atCap={false} existingNames={[]} onConfigChange={onConfigChange} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);

    expect((screen.getByLabelText('QB maximum') as HTMLInputElement).value).toBe('85');
    expect((screen.getByLabelText('QB step') as HTMLInputElement).value).toBe('5');
    expect((screen.getByLabelText('RB maximum') as HTMLInputElement).value).toBe('135');
    expect((screen.getByLabelText('WR maximum') as HTMLInputElement).value).toBe('135');
    expect((screen.getByLabelText('TE maximum') as HTMLInputElement).value).toBe('45');
    expect((screen.getByLabelText('Global multiplier') as HTMLInputElement).value).toBe('1');

    fireEvent.change(screen.getByLabelText('Player values'), { target: { value: 'fantasypros' } });
    expect(onConfigChange).toHaveBeenLastCalledWith(expect.objectContaining({
      baseRankingSource: 'fantasypros',
      positionCurves: budgetConfig.positionCurves,
      multiplier: 1,
    }));
  });

  it('tells existing curve boards that frozen ranks only regenerate on explicit reset', () => {
    const curveConfig: CustomRankingConfig = { ...config, mode: 'position-curve' };
    render(<CustomRankingSettingsDialog {...settingsProps} board={{ ...board, mode: 'position-curve' }} config={curveConfig} />);
    expect(screen.getByText(/Saved position ranks and values stay frozen/i).textContent).toContain('Use Reset values');
  });

  it('blocks the eleventh ranking and duplicate names', () => {
    const { rerender } = render(<NewCustomRankingDialog open config={config} rows={[row]} atCap existingNames={[]} onConfigChange={vi.fn()} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Create ranking' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Maximum 10/i)).toBeTruthy();
    rerender(<NewCustomRankingDialog open config={config} rows={[row]} atCap={false} existingNames={['my values']} onConfigChange={vi.fn()} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/unique name/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create ranking' }).hasAttribute('disabled')).toBe(true);
  });

  it('saves a name-only edit immediately without a value confirmation', () => {
    const onSave = vi.fn();
    const renamed = { ...config, name: 'Renamed' };
    render(<CustomRankingSettingsDialog {...settingsProps} config={renamed} onSave={onSave} />);
    expect(screen.queryByRole('button', { name: 'Recalculate' })).toBeNull();
    expect(screen.queryByText(/Stored only in this browser/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog', { name: 'Confirm value changes' })).toBeNull();
    expect(onSave).toHaveBeenCalledWith(renamed, true);
  });

  it('regenerates directly when generated settings change without any real manual overrides', () => {
    const onSave = vi.fn();
    const changed = { ...config, multiplier: 3 };
    render(<CustomRankingSettingsDialog {...settingsProps} board={{ ...board, overrides: {} }} config={changed} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog', { name: 'Confirm value changes' })).toBeNull();
    expect(screen.queryByText(/0 player values have been edited/i)).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Preserve edited player values' })).toBeNull();
    expect(onSave).toHaveBeenCalledWith(changed, true);
  });

  it('ignores orphaned or baseline-equal entries when deciding whether preservation applies', () => {
    const onSave = vi.fn();
    const changed = { ...config, multiplier: 3 };
    const staleOverrides = { missing: 99, p1: board.players.p1.baselineValue };
    render(<CustomRankingSettingsDialog {...settingsProps} board={{ ...board, overrides: staleOverrides }} config={changed} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog', { name: 'Confirm value changes' })).toBeNull();
    expect(onSave).toHaveBeenCalledWith(changed, true);
  });

  it('uses the singular edited count and preserves one real override by default', () => {
    const onSave = vi.fn();
    const changed = { ...config, multiplier: 3 };
    render(<CustomRankingSettingsDialog {...settingsProps} board={{ ...board, overrides: { p1: 37 } }} config={changed} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('1 player value has been edited.')).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: 'Preserve edited player values' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith(changed, true);
  });

  it('confirms generated setting changes, counts overrides, and preserves them by default', () => {
    const onSave = vi.fn();
    const boardWithOverrides = {
      ...board,
      players: { ...board.players, p2: { ...board.players.p1, playerId: 'p2', name: 'Second Player' } },
      overrides: { p1: 37, p2: 12 },
    };
    const changed = { ...config, multiplier: 3 };
    render(<CustomRankingSettingsDialog {...settingsProps} board={boardWithOverrides} config={changed} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const confirm = screen.getByRole('dialog', { name: 'Confirm value changes' });
    expect(within(confirm).getByText(/regenerate all player values/i)).toBeTruthy();
    expect(within(confirm).getByText('2 player values have been edited.')).toBeTruthy();
    const preserve = within(confirm).getByRole('checkbox', { name: 'Preserve edited player values' }) as HTMLInputElement;
    expect(preserve.checked).toBe(true);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith(changed, true);
  });

  it('can explicitly clear overrides while saving changed generated settings', () => {
    const onSave = vi.fn();
    const changed = { ...config, mode: 'position-curve' as const };
    render(<CustomRankingSettingsDialog {...settingsProps} board={{ ...board, overrides: { p1: 37 } }} config={changed} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const confirm = screen.getByRole('dialog', { name: 'Confirm value changes' });
    fireEvent.click(within(confirm).getByRole('checkbox', { name: 'Preserve edited player values' }));
    fireEvent.click(within(confirm).getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith(changed, false);
  });

  it('shows the exact source-change meaning and confirms reset regeneration', () => {
    const onReset = vi.fn();
    const sourceChanged = { ...config, baseRankingSource: 'fantasypros' as const };
    render(<CustomRankingSettingsDialog {...settingsProps} board={{ ...board, overrides: { p1: 37 } }} config={sourceChanged} onReset={onReset} />);
    expect(screen.getByRole('alert').textContent).toBe('Warning: Changing ranking source will reset player values. But you can choose to preserve edited player values on save.');
    fireEvent.click(screen.getByRole('button', { name: 'Reset values' }));
    const confirm = screen.getByRole('dialog', { name: 'Confirm reset' });
    expect(within(confirm).getByText(/regenerates every player value from the currently selected settings/i)).toBeTruthy();
    expect(onReset).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Reset values' }));
    expect(onReset).toHaveBeenCalledWith(sourceChanged);
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

  it('closes on Escape, contains Tab focus, and restores focus to the opener', () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(<NewCustomRankingDialog open config={config} rows={[row]} atCap={false} existingNames={[]} onConfigChange={vi.fn()} onSourceChange={vi.fn()} onCreate={vi.fn()} onClose={onClose} />);
    const name = screen.getByDisplayValue('My Values');
    expect(document.activeElement).toBe(name);
    const close = screen.getByRole('button', { name: 'Close New custom ranking' });
    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create ranking' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
