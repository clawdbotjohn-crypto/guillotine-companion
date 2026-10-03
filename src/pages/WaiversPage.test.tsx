/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHOW_ROSTERED_PLAYERS, RankingSourceSelector, ReplacementTeamSelector, RosteredPlayersToggle, WaiverPlayerCard, VorpControls, VorpSourceNotice } from './WaiversPage';
import { formatWaiverSourceMetric } from '../logic/playerValueMetrics';
import { DEFAULT_WAIVER_STRATEGY, getWaiverStrategyExplanation, WAIVER_STRATEGIES, WAIVER_STRATEGY_EXPLANATIONS } from '../logic/waiverDisplay';
import type { WaiverPlayerRow } from '../logic/waivers';
import type { ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';

const waiverRow: WaiverPlayerRow = {
  playerId: 'player-1', name: 'Test Runner', position: 'RB', rosPoints: 180,
  projectedPointsPerWeek: 12, posRank: 17, starterWeeks: 8, possibleStarterWeeks: 14,
  sourceValue: 180, sourceRank: undefined,
  suggestions: [
    { strategy: 'max-vorp', label: 'Max VORP', value: 55, pctOfBudget: 11 },
    { strategy: 'weeks-starter', label: 'Weeks-as-Starter', value: 42, pctOfBudget: 8.4 },
    { strategy: 'safe', label: 'Safe', value: 50, pctOfBudget: 10 },
    { strategy: 'aggressive', label: 'Aggressive', value: 75, pctOfBudget: 15 },
    { strategy: 'vorp', label: 'VoRP', value: 25, pctOfBudget: 5 },
  ], predictedWinningBid: 61,
};

const cardProps = { row: waiverRow, remainingFaab: 100, nflTeam: 'SEA', weeklyPoints: 13.4, weeklyRank: 16, byeWeek: 8, playingWeek: 7 };

describe('waiver controls', () => {
  it('uses a compact accessible source selector with source help behind a disclosure', () => {
    const onChange = vi.fn();
    render(<RankingSourceSelector value="sleeper" onChange={onChange} />);
    const select = screen.getByLabelText('Player Values');
    expect(select.className).toContain('w-fit');
    expect(screen.getByRole('button', { name: 'About player value sources' })).toBeTruthy();
    expect(screen.queryByText(/^ROS sources:/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'About player value sources' }));
    expect(screen.getByText('Choose your player rankings source.')).toBeTruthy();
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Sleeper',
      'Fantasy Pros',
      'FantasyCalc',
    ]);
    fireEvent.change(select, { target: { value: 'fantasypros' } });
    expect(onChange).toHaveBeenCalledWith('fantasypros');
  });

  it('formats each Waivers source in its native non-dollar metric', () => {
    expect(formatWaiverSourceMetric({ sourceValue: 183.94 }, 'sleeper')).toEqual({ label: 'ROS pts', display: '183.94' });
    expect(formatWaiverSourceMetric({ sourceValue: 999, sourceRank: 27 }, 'fantasypros')).toEqual({ label: 'ECR #', display: '27' });
    expect(formatWaiverSourceMetric({ sourceValue: 8_450 }, 'fantasycalc')).toEqual({ label: 'FC value', display: '8,450' });
    expect(formatWaiverSourceMetric({ sourceValue: 999 }, 'fantasypros')).toEqual({ label: 'ECR #', display: 'Unavailable' });
    for (const source of ['sleeper', 'fantasypros', 'fantasycalc'] as const) {
      expect(formatWaiverSourceMetric({ sourceValue: 183.94, sourceRank: 27 }, source).display).not.toContain('$');
    }
  });

  it('keeps Show rostered players off by default', () => {
    const onChange = vi.fn();
    render(<RosteredPlayersToggle checked={DEFAULT_SHOW_ROSTERED_PLAYERS} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Show rostered players' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('restores rostered Current value from the Max VORP dollar pipeline while keeping the dialog source metric honest', () => {
    render(<WaiverPlayerCard
      {...cardProps}
      strategy="max-vorp"
      age={25}
      injuryStatus="Questionable"
      owner={{ rosterId: 9, ownerName: 'Rain City Axes' }}
      managerPredictions={[{
        rosterId: 1, managerName: 'Hidden Manager', predictedBid: 50, currentFaab: 100,
        cappedByFaab: false, likelihood: 'Likely',
        profile: { managerRosterId: 1, managerMultiplier: 1, style: 'standard', confidence: 'low', usableEvidenceCount: 1, baselineStrategyId: 'max-vorp', baselineStrategyVersion: 'max-vorp-v1', evidence: [] },
      }]}
      showManagerPredictions
      sourceLabel="Sleeper ROS"
      rankingSource="sleeper"
    />);
    const card = screen.getByRole('button', { name: /rostered by another team/i });
    const summary = within(card).getByTestId('compact-bid-summary');
    const value = within(summary).getByText('$55');
    expect(card.hasAttribute('disabled')).toBe(false);
    expect(within(summary).getByText('Current value')).toBeTruthy();
    expect(value.parentElement?.className).toContain('text-[#10b981]');
    expect(value.parentElement?.className).not.toContain('text-[#f59e0b]');
    expect(within(summary).queryByText('ROS pts')).toBeNull();
    expect(within(summary).queryByText('180')).toBeNull();
    expect(within(summary).queryByText('$180')).toBeNull();
    const weeklyLine = within(card).getByText('W7 13.4 pts · Bye W8');
    const ownerName = within(card).getByText('Rain City Axes');
    const ownerColumn = within(card).getByTestId('rostered-owner');
    expect(ownerColumn).toBe(ownerName);
    expect(ownerColumn.parentElement).toBe(summary);
    expect(within(summary).getByText('Current value').compareDocumentPosition(ownerName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(weeklyLine.parentElement?.contains(ownerName)).toBe(false);
    expect(within(card).getByRole('img', { name: 'Rostered' }).querySelector('svg')).toBeTruthy();
    expect(within(card).queryByText('Rostered')).toBeNull();

    fireEvent.click(card);
    const dialog = screen.getByRole('dialog', { name: 'Test Runner' });
    expect(within(dialog).queryByText('Owned / rostered')).toBeNull();
    expect(within(dialog).queryByText('Rain City Axes')).toBeNull();
    expect(within(dialog).getByText('ROS pts')).toBeTruthy();
    expect(within(dialog).getByText('180')).toBeTruthy();
    expect(within(dialog).getByText('Sleeper ROS · RB #17')).toBeTruthy();
    expect(within(dialog).queryByText('$180')).toBeNull();
    expect(screen.queryByText('Hidden Manager')).toBeNull();
    expect(within(dialog).queryByText('Free agent context')).toBeNull();
  });

  it('restores the production green value treatment and compact hierarchy for free agents', () => {
    render(<WaiverPlayerCard {...cardProps} strategy="safe" />);
    const card = screen.getByRole('button', { name: /Test Runner, suggested bid \$50/i });
    const summary = within(card).getByTestId('compact-bid-summary');
    const value = within(summary).getByText('$50');
    expect(summary.className).toContain('w-[8.75rem]');
    expect(summary.className).toContain('bg-[#0c0f22]');
    expect(within(summary).getByTestId('suggested-bid-row').textContent).toBe('Suggested bid$50');
    expect(value.parentElement?.className).toContain('text-[#10b981]');
    expect(value.parentElement?.className).not.toContain('text-[#f59e0b]');
  });

  it('uses the upcoming playing week directly and treats a loaded missing projection as 0', () => {
    render(<WaiverPlayerCard
      {...cardProps}
      playingWeek={4}
      weeklyPoints={undefined}
      weeklyRank={undefined}
      projectionState="loaded"
      strategy="safe"
    />);
    expect(screen.getByText('W4 0 pts · Bye W8')).toBeTruthy();
    expect(screen.queryByText(/W5/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Test Runner, suggested bid/i }));
    expect(within(screen.getByRole('dialog', { name: 'Test Runner' })).getByText('Proj.: 0 (W4)')).toBeTruthy();
  });

  it('opens details for a $0 player without a prediction', () => {
    const zeroRow: WaiverPlayerRow = {
      ...waiverRow,
      suggestions: waiverRow.suggestions.map((suggestion) => suggestion.strategy === 'weeks-starter' ? { ...suggestion, value: 0 } : suggestion),
    };
    render(<WaiverPlayerCard {...cardProps} row={zeroRow} strategy="weeks-starter" showManagerPredictions={false} />);
    const card = screen.getByRole('button', { name: /suggested bid \$0/i });
    expect(card.hasAttribute('disabled')).toBe(false);
    fireEvent.click(card);
    const dialog = screen.getByRole('dialog', { name: 'Test Runner' });
    const acquisition = within(dialog).getByLabelText('Acquisition context');
    expect(within(within(acquisition).getByText('Suggested').parentElement!).getByText('$0')).toBeTruthy();
    expect(within(within(acquisition).getByText('Predicted').parentElement!).getByText('$0')).toBeTruthy();
    const predictionState = within(dialog).getByRole('region', { name: 'Predicted bidding' });
    expect(within(predictionState).getByText('None')).toBeTruthy();
    expect(within(dialog).queryByText(/Predicted bidding is unavailable/i)).toBeNull();
    expect(within(dialog).queryByTestId('expanded-manager-list')).toBeNull();
    expect(within(dialog).getByRole('region', { name: 'Bidding history' }).textContent).toContain('No bidding history.');
  });

  it('preserves compact prediction and FAAB warning without exposing manager identity', () => {
    const predictions: ManagerPredictionDisplay[] = [{
      rosterId: 1, managerName: 'Hidden Manager', predictedBid: 40, currentFaab: 100,
      cappedByFaab: false, likelihood: 'Likely',
      profile: { managerRosterId: 1, managerMultiplier: 1, style: 'standard', confidence: 'low', usableEvidenceCount: 1, baselineStrategyId: 'max-vorp', baselineStrategyVersion: 'max-vorp-v1', evidence: [] },
    }];
    render(<WaiverPlayerCard {...cardProps} strategy="safe" remainingFaab={40} managerPredictions={predictions} showManagerPredictions />);
    expect(screen.getByLabelText(/More than your FAAB remaining/i)).toBeTruthy();
    expect(screen.getByText((_text, element) => element?.textContent === 'Predicted bid $40')).toBeTruthy();
    expect(screen.queryByText('Hidden Manager')).toBeNull();
    expect(screen.queryByText('$61')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Test Runner, suggested bid/i }));
    const dialog = screen.getByRole('dialog', { name: 'Test Runner' });
    expect(within(dialog).getByText(/Predicted bidding/i)).toBeTruthy();
    expect(within(dialog).getByText('Hidden Manager')).toBeTruthy();
    expect(within(dialog).getAllByText('$40')).toHaveLength(2);
    expect(within(dialog).getByRole('heading', { name: 'Bidding history' })).toBeTruthy();
  });

  it('preserves full accessible manager prediction rows and detail access beside player details', () => {
    const prediction: ManagerPredictionDisplay = {
      rosterId: 1, managerName: 'Prediction Manager', predictedBid: 40, currentFaab: 100,
      cappedByFaab: false, likelihood: 'Likely',
      profile: { managerRosterId: 1, managerMultiplier: 1, style: 'standard', confidence: 'low', usableEvidenceCount: 1, baselineStrategyId: 'max-vorp', baselineStrategyVersion: 'max-vorp-v1', evidence: [] },
    };
    render(<WaiverPlayerCard
      {...cardProps}
      strategy="safe"
      managerPredictions={[prediction]}
      managerDetails={new Map([[1, { upcomingByes: [], teamNeeds: [] }]])}
      showManagerPredictions
    />);
    const playerButton = screen.getByRole('button', { name: /Test Runner, suggested bid/i });
    const predictionsButton = screen.getByRole('button', { name: 'Show bid predictions for Test Runner' });
    fireEvent.click(predictionsButton);
    expect(predictionsButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Bid Predictions')).toBeTruthy();
    expect(screen.getByText('Prediction Manager')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /open details for Prediction Manager/i }));
    expect(screen.getByRole('dialog', { name: 'Prediction Manager' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Test Runner' })).toBeNull();
    expect(playerButton).toBeTruthy();
  });

  it('uses the VoRP team count label and accessible explanatory disclosure', () => {
    const onChange = vi.fn();
    render(<ReplacementTeamSelector value={8} max={8} onChange={onChange} />);
    const select = screen.getByLabelText('VoRP team count');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['8 teams', '7 teams', '6 teams', '5 teams', '4 teams']);
    expect(screen.queryByText(/Defines the optimized/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'About VoRP team count' }));
    expect(screen.getByText(/In a 1-QB league, choosing 16/)).toBeTruthy();
    fireEvent.change(select, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('shows VoRP-only controls and preserves honest source unavailability', () => {
    const props = { replacementTeamCount: 8, maxReplacementTeams: 8, onReplacementTeamChange: vi.fn(), rankingSource: 'fantasypros' as const };
    const { rerender } = render(<VorpControls strategy="safe" {...props} />);
    expect(screen.queryByLabelText('VoRP team count')).toBeNull();
    rerender(<VorpControls strategy="max-vorp" {...props} />);
    expect(screen.queryByLabelText('VoRP team count')).toBeNull();
    expect(screen.getByText(/Sleeper ROS projected/i)).toBeTruthy();
    rerender(<VorpControls strategy="vorp" {...props} />);
    expect(screen.getByLabelText('VoRP team count')).toBeTruthy();
    rerender(<VorpSourceNotice rankingSource="fantasypros" unavailableReason="Sleeper returned no usable remaining-season point projections" />);
    expect(screen.getByRole('status').textContent).toMatch(/VoRP is unavailable/i);
  });

  it('uses the requested exact strategy copy', () => {
    expect(DEFAULT_WAIVER_STRATEGY).toBe('max-vorp');
    expect(WAIVER_STRATEGIES.map(({ label }) => label)).toEqual([
      'Max VORP',
      'Weeks-as-Starter',
      'Safe',
      'Aggressive',
      'VoRP',
    ]);
    expect(WAIVER_STRATEGIES.find(({ key }) => key === 'vorp')?.label).toBe('VoRP');
    expect(WAIVER_STRATEGY_EXPLANATIONS['max-vorp']).toContain('highest positive');
    expect(WAIVER_STRATEGY_EXPLANATIONS['weeks-starter']).toBe('Values players according to how many weeks they project to be starting caliber.');
    expect(WAIVER_STRATEGY_EXPLANATIONS.safe).toBe('Conservative bidding style aimed at preserving budget and avoiding overspending.');
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toBe('Aggressive spending style aimed at winning players early, at the risk of running out of FAAB.');
    expect(getWaiverStrategyExplanation('vorp', 16, true)).toBe('Value over Replacement Player (VoRP) calculates value from the replacement-team count you set, estimates the average VoRP required for a top-four roster, and prices players relative to that benchmark.');
    expect(getWaiverStrategyExplanation('vorp', 16, false, 'Sleeper ROS missing')).toContain('VoRP is unavailable: Sleeper ROS missing');
    expect(getWaiverStrategyExplanation('max-vorp', 16, false, 'all stages could not calibrate')).toContain('Max VORP is unavailable: all stages could not calibrate');
  });


  it('suppresses every partial predicted amount until the model is confirmed ready', () => {
    const predictions: ManagerPredictionDisplay[] = [{
      rosterId: 1, managerName: 'Delayed Manager', predictedBid: 40, currentFaab: 100,
      cappedByFaab: false, likelihood: 'Likely',
      profile: { managerRosterId: 1, managerMultiplier: 1, style: 'standard', confidence: 'low', usableEvidenceCount: 1, baselineStrategyId: 'max-vorp', baselineStrategyVersion: 'max-vorp-v1', evidence: [] },
    }];
    const { rerender } = render(<WaiverPlayerCard {...cardProps} strategy="safe" managerPredictions={predictions} showManagerPredictions={false} />);
    expect(screen.queryByText('$40')).toBeNull();
    expect(screen.queryByText(/Predicted bid \$40/)).toBeNull();
    expect(screen.queryByRole('button', { name: /bid predictions/i })).toBeNull();
    rerender(<WaiverPlayerCard {...cardProps} strategy="safe" managerPredictions={predictions} showManagerPredictions />);
    expect(screen.getByText((_text, element) => element?.textContent === 'Predicted bid $40')).toBeTruthy();
  });

  it('keeps rostered and unrostered cards at the same collapsed density without an arrow icon', () => {
    const { rerender } = render(<WaiverPlayerCard {...cardProps} strategy="safe" />);
    const available = screen.getByRole('button', { name: /Test Runner, suggested bid/i });
    expect(available.className).toContain('min-h-20');
    expect(available.querySelector('svg')).toBeNull();
    rerender(<WaiverPlayerCard {...cardProps} strategy="safe" owner={{ rosterId: 9, ownerName: 'Other' }} />);
    const rostered = screen.getByRole('button', { name: /rostered by another team/i });
    expect(rostered.className).toContain('min-h-20');
    expect(rostered.querySelector('.lucide-chevron-right')).toBeNull();
    expect(rostered.querySelector('.lucide-user-check')).toBeTruthy();
  });

});
