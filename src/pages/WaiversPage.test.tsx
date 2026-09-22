/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RankingSourceSelector, ReplacementTeamSelector, VorpSourceNotice } from './WaiversPage';
import {
  DEFAULT_WAIVER_STRATEGY,
  getWaiverStrategyExplanation,
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

  it('changes the accessible replacement/startable-depth target across every integer down to four', () => {
    const onChange = vi.fn();
    render(<ReplacementTeamSelector value={8} max={8} onChange={onChange} />);

    const select = screen.getByLabelText('Replacement/startable depth teams');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '8 teams', '7 teams', '6 teams', '5 teams', '4 teams',
    ]);
    expect(screen.getByText(/optimized lineup pool used to set replacement level/i)).toBeTruthy();

    fireEvent.change(select, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('shows that external Player Values cannot replace Sleeper ROS for VoRP', () => {
    const { rerender } = render(<VorpSourceNotice rankingSource="fantasycalc" />);
    expect(screen.getByRole('status').textContent).toMatch(
      /VoRP uses Sleeper ROS projected fantasy points independently of the selected Player Values source/i,
    );

    rerender(
      <VorpSourceNotice
        rankingSource="fantasypros"
        unavailableReason="Sleeper returned no usable remaining-season point projections"
      />,
    );
    expect(screen.getByRole('status').textContent).toMatch(/VoRP is unavailable/i);
    expect(screen.getByRole('status').textContent).not.toMatch(/\$0/);
  });

  it('describes VoRP with the selected depth, independent Sleeper source, and honest unavailability', () => {
    const available = getWaiverStrategyExplanation('vorp', 16, true);
    expect(available).toMatch(/Sleeper rest-of-season projected fantasy points/i);
    expect(available).toMatch(/optimized 16-team lineup pool/i);
    expect(available).toMatch(/final-four starter pool/i);

    const unavailable = getWaiverStrategyExplanation(
      'vorp',
      4,
      false,
      'Sleeper returned no usable remaining-season point projections',
    );
    expect(unavailable).toMatch(/VoRP is unavailable/i);
    expect(unavailable).toMatch(/no usable remaining-season point projections/i);
    expect(unavailable).not.toMatch(/\$0/);
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
