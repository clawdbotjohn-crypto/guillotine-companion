/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHOW_ROSTERED_PLAYERS, RankingSourceSelector, ReplacementTeamSelector, RosteredPlayersToggle, WaiverPlayerCard, VorpControls, VorpSourceNotice } from './WaiversPage';
import { DEFAULT_WAIVER_STRATEGY, getWaiverStrategyExplanation, WAIVER_STRATEGIES, WAIVER_STRATEGY_EXPLANATIONS } from '../logic/waiverDisplay';
import type { WaiverPlayerRow } from '../logic/waivers';
import type { ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';

const waiverRow: WaiverPlayerRow = {
  playerId: 'player-1', name: 'Test Runner', position: 'RB', rosPoints: 180,
  projectedPointsPerWeek: 12, posRank: 17, starterWeeks: 8, possibleStarterWeeks: 14,
  sourceValue: 180, sourceRank: undefined,
  suggestions: [
    { strategy: 'weeks-starter', label: 'Weeks-as-Starter', value: 42, pctOfBudget: 8.4 },
    { strategy: 'safe', label: 'Safe', value: 50, pctOfBudget: 10 },
    { strategy: 'aggressive', label: 'Aggressive', value: 75, pctOfBudget: 15 },
    { strategy: 'vorp', label: 'VoRP', value: 25, pctOfBudget: 5 },
  ], predictedWinningBid: 61,
};

const cardProps = { row: waiverRow, remainingFaab: 100, nflTeam: 'SEA', weeklyPoints: 13.4, weeklyRank: 16, byeWeek: 8, currentWeek: 6 };

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

  it('keeps Show rostered players off by default', () => {
    const onChange = vi.fn();
    render(<RosteredPlayersToggle checked={DEFAULT_SHOW_ROSTERED_PLAYERS} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Show rostered players' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders only compact approved metadata and current value for rostered players', () => {
    render(<WaiverPlayerCard
      {...cardProps}
      strategy="weeks-starter"
      injuryStatus="Questionable"
      owner={{ rosterId: 9, ownerName: 'Rain City Axes' }}
      managerPredictions={[{
        rosterId: 1, managerName: 'Hidden Manager', predictedBid: 50, currentFaab: 100,
        cappedByFaab: false, likelihood: 'Likely',
        profile: { managerRosterId: 1, managerMultiplier: 1, style: 'standard', confidence: 'low', usableEvidenceCount: 1, evidence: [] },
      }]}
      showManagerPredictions
    />);
    const card = screen.getByRole('article', { name: /rostered by Rain City Axes/i });
    expect(within(card).getByText(/RB #17 · SEA/)).toBeTruthy();
    expect(within(card).getByText(/W7 13\.4 pts · Bye W8/)).toBeTruthy();
    expect(within(card).getByText('$42')).toBeTruthy();
    expect(within(card).getByText('Current value')).toBeTruthy();
    expect(within(card).queryByText('Hidden Manager')).toBeNull();
    expect(within(card).queryByText(/Predicted bid/)).toBeNull();
    expect(within(card).queryByText(/Questionable|Value 180|Rank 16|starter weeks/i)).toBeNull();
  });

  it('highlights only players owned by the selected team while all rostered rows remain disabled', () => {
    const owner = { rosterId: 9, ownerName: 'Rain City Axes' };
    const { rerender } = render(
      <WaiverPlayerCard {...cardProps} strategy="safe" owner={owner} selectedRosterId={9} />,
    );
    const selectedCard = screen.getByRole('article', { name: /owned by your selected team/i });
    expect(selectedCard.getAttribute('aria-disabled')).toBe('true');
    expect(selectedCard.getAttribute('data-owner-highlight')).toBe('selected-team');
    expect(selectedCard.parentElement?.className).toContain('border-[#10b981]');

    rerender(<WaiverPlayerCard {...cardProps} strategy="safe" owner={owner} selectedRosterId={8} />);
    const otherTeamCard = screen.getByRole('article', { name: /rostered by Rain City Axes/i });
    expect(otherTeamCard.getAttribute('aria-disabled')).toBe('true');
    expect(otherTeamCard.getAttribute('data-owner-highlight')).toBe('neutral');
    expect(screen.queryByText('Owned by your selected team.')).toBeNull();
    expect(otherTeamCard.parentElement?.className).not.toContain('border-[#10b981]');
  });

  it('preserves the FAAB warning without falling back to old market predictedWinningBid', () => {
    render(<WaiverPlayerCard {...cardProps} strategy="safe" remainingFaab={40} />);
    expect(screen.getByLabelText(/More than your FAAB remaining/i)).toBeTruthy();
    expect(screen.queryByText(/Predicted bid/)).toBeNull();
    expect(screen.queryByText('$61')).toBeNull();
    expect(screen.queryByText(/starter wks/)).toBeNull();
  });

  it('excludes a higher Unlikely bid and matches the collapsed amount to the first eligible expanded row', () => {
    const predictions: ManagerPredictionDisplay[] = Array.from({ length: 12 }, (_, index) => ({
      rosterId: index + 1,
      managerName: `Manager ${index + 1}`,
      predictedBid: 100 - index,
      currentFaab: 200,
      cappedByFaab: index === 4,
      likelihood: index < 4 ? 'Unlikely' : index < 8 ? 'Possible' : 'Likely',
      profile: {
        managerRosterId: index + 1,
        managerMultiplier: 1,
        style: 'standard',
        confidence: 'low',
        usableEvidenceCount: 1,
        evidence: [],
      },
    }));
    render(<WaiverPlayerCard
      {...cardProps}
      strategy="weeks-starter"
      managerPredictions={predictions}
      showManagerPredictions
    />);
    const toggle = screen.getByRole('button', { name: /Test Runner/ });
    const summary = screen.getByTestId('compact-bid-summary');
    expect(within(summary).getByText((_text, element) => element?.textContent === 'Predicted bid $96')).toBeTruthy();
    expect(within(summary).queryByText((_text, element) => element?.textContent === 'Predicted bid $100')).toBeNull();
    expect(within(summary).queryByText(/Manager \d+/)).toBeNull();
    expect(within(summary).queryByText('$61')).toBeNull();
    expect(summary.innerHTML).not.toContain('border-t');
    const suggestedBidRow = within(summary).getByTestId('suggested-bid-row');
    expect(suggestedBidRow.className).toMatch(/items-baseline.*justify-end.*gap-1\.5/);
    expect(suggestedBidRow.className).not.toContain('justify-between');
    expect(suggestedBidRow.textContent).toBe('Suggested bid$42');
    expect(within(suggestedBidRow).getByText('Suggested bid').compareDocumentPosition(within(suggestedBidRow).getByText('$42')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('expanded-manager-list')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Bid Predictions')).toBeTruthy();
    const expanded = screen.getByTestId('expanded-manager-list');
    expect(expanded.children).toHaveLength(12);
    const firstExpanded = expanded.firstElementChild as HTMLElement;
    expect(within(firstExpanded).getByText('Manager 5')).toBeTruthy();
    expect(within(firstExpanded).getByText('$96')).toBeTruthy();
    expect(screen.getByText('Manager 1').closest('button')?.className).toContain('opacity-55');
    expect(screen.getAllByText(/Likely bidder|Possible bidder|Unlikely bidder/)).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /open details for Manager 5/i }));
    expect(screen.getByRole('dialog', { name: 'Manager 5' })).toBeTruthy();
    expect(screen.getAllByText('Bidding History')).toHaveLength(1);
  });

  it('orders tied FAAB-capped eligible predictions deterministically ahead of Unlikely rows', () => {
    const makePrediction = (
      rosterId: number,
      managerName: string,
      predictedBid: number,
      likelihood: ManagerPredictionDisplay['likelihood'],
      cappedByFaab = false,
    ): ManagerPredictionDisplay => ({
      rosterId,
      managerName,
      predictedBid,
      currentFaab: cappedByFaab ? predictedBid : 200,
      cappedByFaab,
      likelihood,
      profile: {
        managerRosterId: rosterId,
        managerMultiplier: 1.5,
        style: 'aggressive',
        confidence: 'low',
        usableEvidenceCount: 1,
        evidence: [],
      },
    });
    render(<WaiverPlayerCard
      {...cardProps}
      strategy="weeks-starter"
      managerPredictions={[
        makePrediction(1, 'Global Max Unlikely', 120, 'Unlikely'),
        makePrediction(2, 'Possible Cap', 80, 'Possible', true),
        makePrediction(3, 'Likely Cap', 80, 'Likely', true),
        makePrediction(4, 'Possible Lower', 70, 'Possible'),
      ]}
      showManagerPredictions
    />);

    const summary = screen.getByTestId('compact-bid-summary');
    expect(within(summary).getByText((_text, element) => element?.textContent === 'Predicted bid $80')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Test Runner/ }));
    const expanded = screen.getByTestId('expanded-manager-list');
    expect(Array.from(expanded.children).map((row) => row.textContent)).toEqual([
      expect.stringContaining('Likely Cap'),
      expect.stringContaining('Possible Cap'),
      expect.stringContaining('Possible Lower'),
      expect.stringContaining('Global Max Unlikely'),
    ]);
    expect(within(within(expanded.firstElementChild as HTMLElement).getByTestId('predicted-label-value')).getByText('$80', { exact: false })).toBeTruthy();
    expect(screen.getAllByText(/capped by remaining FAAB/)).toHaveLength(2);
  });

  it('has no prediction or expansion when manager history is unavailable', () => {
    render(<WaiverPlayerCard {...cardProps} strategy="weeks-starter" showManagerPredictions={false} />);
    const card = screen.getByRole('button', { name: /Test Runner/ });
    expect(card.getAttribute('aria-expanded')).toBeNull();
    fireEvent.click(card);
    expect(screen.queryByText(/Predicted bid|Bid Predictions/)).toBeNull();
    expect(screen.queryByText(/canonical|Learning|Not enough history/i)).toBeNull();
  });

  it('distinguishes exactly-zero from positive cards and never multiplies the old market prediction', () => {
    const managerPredictions: ManagerPredictionDisplay[] = [{
      rosterId: 1, managerName: 'Hidden Manager', predictedBid: 40, currentFaab: 100,
      cappedByFaab: false, likelihood: 'Likely',
      profile: { managerRosterId: 1, managerMultiplier: 1, style: 'standard', confidence: 'low', usableEvidenceCount: 1, evidence: [] },
    }];
    const { rerender } = render(<WaiverPlayerCard
      {...cardProps}
      strategy="weeks-starter"
      managerPredictions={managerPredictions}
      showManagerPredictions
    />);
    expect(screen.getByText((_text, element) => element?.textContent === 'Predicted bid $40')).toBeTruthy();
    expect(screen.queryByText('$61')).toBeNull();
    expect(screen.queryByText('Hidden Manager')).toBeNull();
    const positiveCard = screen.getByRole('button', { name: /Test Runner/ });
    expect(positiveCard.getAttribute('aria-expanded')).toBe('false');
    expect(positiveCard.hasAttribute('disabled')).toBe(false);

    const zeroRow: WaiverPlayerRow = {
      ...waiverRow,
      suggestions: waiverRow.suggestions.map((suggestion) => suggestion.strategy === 'weeks-starter' ? { ...suggestion, value: 0 } : suggestion),
    };
    rerender(<WaiverPlayerCard
      {...cardProps}
      row={zeroRow}
      strategy="weeks-starter"
      managerPredictions={managerPredictions}
      showManagerPredictions
    />);
    const zeroCard = screen.getByRole('button', { name: /Test Runner/ });
    expect(zeroCard.getAttribute('aria-expanded')).toBeNull();
    expect(zeroCard.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText(/Predicted bid/)).toBeNull();
    fireEvent.click(zeroCard);
    expect(screen.queryByText('Bid Predictions')).toBeNull();
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
    rerender(<VorpControls strategy="vorp" {...props} />);
    expect(screen.getByLabelText('VoRP team count')).toBeTruthy();
    rerender(<VorpSourceNotice rankingSource="fantasypros" unavailableReason="Sleeper returned no usable remaining-season point projections" />);
    expect(screen.getByRole('status').textContent).toMatch(/VoRP is unavailable/i);
  });

  it('uses the requested exact strategy copy', () => {
    expect(DEFAULT_WAIVER_STRATEGY).toBe('weeks-starter');
    expect(WAIVER_STRATEGIES.map(({ label }) => label)).toEqual([
      'Weeks-as-Starter',
      'Safe',
      'Aggressive',
      'VoRP',
    ]);
    expect(WAIVER_STRATEGIES.find(({ key }) => key === 'vorp')?.label).toBe('VoRP');
    expect(WAIVER_STRATEGY_EXPLANATIONS['weeks-starter']).toBe('Values players according to how many weeks they project to be starting caliber.');
    expect(WAIVER_STRATEGY_EXPLANATIONS.safe).toBe('Conservative bidding style aimed at preserving budget and avoiding overspending.');
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toBe('Aggressive spending style aimed at winning players early, at the risk of running out of FAAB.');
    expect(getWaiverStrategyExplanation('vorp', 16, true)).toBe('Value over Replacement Player (VoRP) calculates value from the replacement-team count you set, estimates the average VoRP required for a top-four roster, and prices players relative to that benchmark.');
    expect(getWaiverStrategyExplanation('vorp', 16, false, 'Sleeper ROS missing')).toContain('VoRP is unavailable: Sleeper ROS missing');
  });

});
