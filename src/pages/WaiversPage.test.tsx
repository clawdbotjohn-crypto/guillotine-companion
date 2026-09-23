/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SHOW_ROSTERED_PLAYERS,
  PredictedWinningBidFooter,
  RankingSourceSelector,
  ReplacementTeamSelector,
  RosteredPlayersToggle,
  WaiverPlayerCard,
  VorpControls,
  VorpSourceNotice,
} from './WaiversPage';
import {
  DEFAULT_WAIVER_STRATEGY,
  getWaiverStrategyExplanation,
  WAIVER_STRATEGIES,
  WAIVER_STRATEGY_EXPLANATIONS,
} from '../logic/waiverDisplay';
import { RANKING_SOURCES } from '../logic/rankingSources';
import type { WaiverPlayerRow } from '../logic/waivers';

const waiverRow: WaiverPlayerRow = {
  playerId: 'player-1',
  name: 'Test Runner',
  position: 'RB',
  rosPoints: 180,
  projectedPointsPerWeek: 12,
  posRank: 17,
  starterWeeks: 8,
  possibleStarterWeeks: 14,
  sourceValue: 180,
  sourceRank: undefined,
  suggestions: [
    { strategy: 'weeks-starter', label: 'Weeks-as-Starter', value: 42, pctOfBudget: 8.4 },
    { strategy: 'safe', label: 'Safe', value: 50, pctOfBudget: 10 },
    { strategy: 'aggressive', label: 'Aggressive', value: 75, pctOfBudget: 15 },
    { strategy: 'vorp', label: 'VoRP', value: 25, pctOfBudget: 5 },
  ],
  predictedWinningBid: 61,
  predictedConfidence: 'medium',
};

describe('waiver controls', () => {
  it('uses an accessible, scalable Player Values select and changes sources', () => {
    const onChange = vi.fn();
    render(<RankingSourceSelector value="sleeper" onChange={onChange} />);

    const select = screen.getByLabelText('Player Values');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Sleeper',
      'Fantasy Pros',
      'FantasyCalc',
    ]);
    expect(select.className).toContain('w-fit');
    expect(select.className).toContain('max-w-full');
    expect(select.className.split(/\s+/)).not.toContain('w-full');
    expect(screen.getByText(/ROS sources: Sleeper projections, Fantasy Pros ECR, or FantasyCalc market values/i)).toBeTruthy();
    expect(screen.getByText(/Next-week context always uses Sleeper/i)).toBeTruthy();
    expect(screen.queryByText(/Football Absurdity/i)).toBeNull();
    expect(screen.queryByText(/Active:/i)).toBeNull();

    fireEvent.change(select, { target: { value: 'fantasypros' } });
    expect(onChange).toHaveBeenCalledWith('fantasypros');
  });

  it('keeps Show rostered players off by default and reports checkbox changes accessibly', () => {
    const onChange = vi.fn();
    expect(DEFAULT_SHOW_ROSTERED_PLAYERS).toBe(false);
    render(<RosteredPlayersToggle checked={DEFAULT_SHOW_ROSTERED_PLAYERS} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Show rostered players' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(checkbox.closest('label')?.className).toContain('min-h-11');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows roster and owner identity while keeping a rostered card non-actionable', () => {
    render(
      <WaiverPlayerCard
        row={waiverRow}
        strategy="weeks-starter"
        remainingFaab={100}
        source={RANKING_SOURCES[0]}
        nflTeam="SEA"
        weeklyText="Next week: 13.4 pts · RB16"
        byeText="Bye W8"
        injuryStatus="Questionable"
        owner={{ rosterId: 9, ownerName: 'Rain City Axes' }}
      />,
    );

    const card = screen.getByRole('article', { name: /Test Runner, rostered by Rain City Axes/i });
    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(within(card).getByText('Rostered')).toBeTruthy();
    expect(within(card).getByText(/Owner: Rain City Axes/)).toBeTruthy();
    expect(within(card).getByText(/RB · SEA/)).toBeTruthy();
    expect(within(card).queryByRole('button')).toBeNull();
    expect(within(card).getByText(/8\/14 starter wks/)).toBeTruthy();
    expect(within(card).getByText(/Next week: 13.4 pts/)).toBeTruthy();
    expect(within(card).getByText('Bye W8')).toBeTruthy();
    expect(within(card).getByText('Questionable')).toBeTruthy();
    expect(within(card).getByText(/Sleeper ROS 180.0 pts/)).toBeTruthy();
    expect(within(card).getByText(/Predicted bid/)).toBeTruthy();
  });

  it('retains compact warning/context copy and suppresses only the intentional Aggressive duplicate', () => {
    const { rerender } = render(
      <WaiverPlayerCard
        row={waiverRow}
        strategy="safe"
        remainingFaab={40}
        source={RANKING_SOURCES[0]}
        nflTeam="SEA"
        weeklyText="Next week: Bye"
        byeText="Bye W8"
      />,
    );

    expect(screen.getByLabelText(/More than your FAAB remaining/i)).toBeTruthy();
    expect(screen.getByText(/Predicted bid/)).toBeTruthy();
    rerender(
      <WaiverPlayerCard
        row={waiverRow}
        strategy="aggressive"
        remainingFaab={40}
        source={RANKING_SOURCES[0]}
        nflTeam="SEA"
        weeklyText="Next week: Bye"
        byeText="Bye W8"
      />,
    );
    expect(screen.queryByText(/Predicted bid/)).toBeNull();
    expect(screen.getByText(/8\/14 starter wks/)).toBeTruthy();
    expect(screen.getByText(/Next week: Bye/)).toBeTruthy();
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

  it('shows replacement-depth and source controls only when VoRP is selected', () => {
    const onChange = vi.fn();
    const props = {
      replacementTeamCount: 8,
      maxReplacementTeams: 8,
      onReplacementTeamChange: onChange,
      rankingSource: 'fantasypros' as const,
    };
    const { rerender } = render(<VorpControls strategy="weeks-starter" {...props} />);

    expect(screen.queryByLabelText('Replacement/startable depth teams')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();

    rerender(<VorpControls strategy="vorp" {...props} />);
    expect(screen.getByLabelText('Replacement/startable depth teams')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(
      /VoRP uses Sleeper ROS projected fantasy points independently/i,
    );
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

  it('hides the redundant predicted-bid footer for Aggressive but preserves it for other strategies', () => {
    const row = { predictedWinningBid: 275, predictedConfidence: 'medium' as const };
    const { rerender } = render(<PredictedWinningBidFooter strategy="aggressive" row={row} />);

    expect(screen.queryByText(/Predicted bid/i)).toBeNull();
    expect(screen.queryByText('$275')).toBeNull();

    rerender(<PredictedWinningBidFooter strategy="safe" row={row} />);
    expect(screen.getByText(/Predicted bid/i)).toBeTruthy();
    expect(screen.getByText('$275')).toBeTruthy();
    expect(screen.getByText('medium')).toBeTruthy();
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
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toMatch(/spending ceiling/i);
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toMatch(/not intrinsic player value/i);
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toMatch(/intentionally accepts overpay risk to land elite players/i);

    const visibleCopy = [
      ...WAIVER_STRATEGIES.map((strategy) => strategy.label),
      ...Object.values(WAIVER_STRATEGY_EXPLANATIONS),
    ].join(' ');
    const legacyTerms = [['Exp.', 'Starter'].join(' '), ['Exponent', 'ial'].join('')];
    for (const legacyTerm of legacyTerms) expect(visibleCopy).not.toContain(legacyTerm);
  });
});
