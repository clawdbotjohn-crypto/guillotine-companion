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
      'FantasyPros rest-of-season expert consensus rankings',
    ]);
    expect(screen.queryByText(/Football Absurdity/i)).toBeNull();
    expect(screen.queryByText(/Active:/i)).toBeNull();

    fireEvent.change(select, { target: { value: 'fantasypros' } });
    expect(onChange).toHaveBeenCalledWith('fantasypros');
  });

  it('uses the Aggressive strategy label and explains it as an intentional overpay ceiling', () => {
    expect(DEFAULT_WAIVER_STRATEGY).toBe('weeks-starter');
    expect(WAIVER_STRATEGIES).toEqual([
      { key: 'weeks-starter', label: 'Weeks-as-Starter' },
      { key: 'safe', label: 'Safe' },
      { key: 'aggressive', label: 'Aggressive' },
      { key: 'vorp', label: 'VoRP' },
    ]);
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toMatch(/maximum you should consider bidding/i);
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toMatch(/spending ceiling, not intrinsic player value/i);
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toMatch(/intentionally accepts overpay risk to land elite players/i);

    const visibleCopy = [
      ...WAIVER_STRATEGIES.map((strategy) => strategy.label),
      ...Object.values(WAIVER_STRATEGY_EXPLANATIONS),
    ].join(' ');
    const legacyTerms = [['Exp.', 'Starter'].join(' '), ['Exponent', 'ial'].join('')];
    for (const legacyTerm of legacyTerms) expect(visibleCopy).not.toContain(legacyTerm);
  });
});
