/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RankingSourceSelector } from './WaiversPage';
import {
  DEFAULT_WAIVER_STRATEGY,
  WAIVER_STRATEGIES,
  WAIVER_STRATEGY_EXPLANATIONS,
} from '../logic/waiverDisplay';

describe('waiver controls', () => {
  it('uses an accessible, scalable Player Values select and changes sources', () => {
    const onChange = vi.fn();
    render(<RankingSourceSelector value="sleeper" onChange={onChange} />);

    const select = screen.getByLabelText('Player Values');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Sleeper rest-of-season projections',
      'FantasyCalc redraft market values',
      'FantasyPros expert consensus rankings',
    ]);
    expect(screen.queryByText(/Football Absurdity/i)).toBeNull();
    expect(screen.queryByText(/Active:/i)).toBeNull();

    fireEvent.change(select, { target: { value: 'fantasypros' } });
    expect(onChange).toHaveBeenCalledWith('fantasypros');
  });

  it('puts Weeks-as-Starter first and makes it the initial strategy key', () => {
    expect(DEFAULT_WAIVER_STRATEGY).toBe('weeks-starter');
    expect(WAIVER_STRATEGIES[0]).toEqual({ key: 'weeks-starter', label: 'Weeks-as-Starter' });
    expect(WAIVER_STRATEGY_EXPLANATIONS.safe).not.toBe(WAIVER_STRATEGY_EXPLANATIONS.vorp);
  });
});
