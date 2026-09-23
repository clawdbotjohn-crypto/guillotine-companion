/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHOW_ROSTERED_PLAYERS, PredictedWinningBidFooter, RankingSourceSelector, ReplacementTeamSelector, RosteredPlayersToggle, WaiverPlayerCard, VorpControls, VorpSourceNotice } from './WaiversPage';
import { DEFAULT_WAIVER_STRATEGY, getWaiverStrategyExplanation, WAIVER_STRATEGIES, WAIVER_STRATEGY_EXPLANATIONS } from '../logic/waiverDisplay';
import { RANKING_SOURCES } from '../logic/rankingSources';
import type { WaiverPlayerRow } from '../logic/waivers';

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

const cardProps = { row: waiverRow, remainingFaab: 100, source: RANKING_SOURCES[0], nflTeam: 'SEA', weeklyText: 'Next week: 13.4 pts · RB16', byeWeek: 8, currentWeek: 6 };

describe('waiver controls', () => {
  it('uses a compact accessible source selector with source help behind a disclosure', () => {
    const onChange = vi.fn();
    render(<RankingSourceSelector value="sleeper" onChange={onChange} />);
    const select = screen.getByLabelText('Player Values');
    expect(select.className).toContain('w-fit');
    expect(screen.getByRole('button', { name: 'About player value sources' })).toBeTruthy();
    expect(screen.queryByText(/^ROS sources:/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'About player value sources' }));
    expect(screen.getByText(/Choose Sleeper projections/)).toBeTruthy();
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

  it('renders the compact metadata hierarchy, rank disclosure, and selected/predicted bids', () => {
    render(<WaiverPlayerCard {...cardProps} strategy="weeks-starter" injuryStatus="Questionable" owner={{ rosterId: 9, ownerName: 'Rain City Axes' }} />);
    const card = screen.getByRole('article', { name: /rostered by Rain City Axes/i });
    expect(within(card).getByText('Questionable')).toBeTruthy();
    const rank = within(card).getByRole('button', { name: /Show RB #17 rest-of-season ranking details/ });
    expect(rank).toBeTruthy();
    expect(within(card).getByText('SEA')).toBeTruthy();
    expect(within(card).getByText('Bye Wk 8')).toBeTruthy();
    expect(within(card).getByText('$42')).toBeTruthy();
    expect(within(card).getByText('8%')).toBeTruthy();
    expect(card.textContent).not.toContain('8% · Weeks-as-Starter');
    expect(within(card).getByText(/8\/14 starter wks/)).toBeTruthy();
    expect(within(card).getByText(/Predicted bid/)).toBeTruthy();
    fireEvent.click(rank);
    expect(within(card).getByText(/180.0 rest-of-season points/)).toBeTruthy();
  });

  it('preserves warnings and hides duplicate predicted/starter-week data outside their strategies', () => {
    const { rerender } = render(<WaiverPlayerCard {...cardProps} strategy="safe" remainingFaab={40} />);
    expect(screen.getByLabelText(/More than your FAAB remaining/i)).toBeTruthy();
    expect(screen.getByText(/Predicted bid/)).toBeTruthy();
    expect(screen.queryByText(/starter wks/)).toBeNull();
    rerender(<WaiverPlayerCard {...cardProps} strategy="aggressive" remainingFaab={40} />);
    expect(screen.queryByText(/Predicted bid/)).toBeNull();
    expect(screen.queryByText(/starter wks/)).toBeNull();
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
    expect(WAIVER_STRATEGIES.map(({ label }) => label)).toEqual(['Weeks-as-Starter', 'Safe', 'Aggressive', 'VoRP']);
    expect(WAIVER_STRATEGY_EXPLANATIONS['weeks-starter']).toBe('Values players according to how many weeks they project to be starting caliber.');
    expect(WAIVER_STRATEGY_EXPLANATIONS.safe).toBe('Conservative bidding style aimed at preserving budget and avoiding overspending.');
    expect(WAIVER_STRATEGY_EXPLANATIONS.aggressive).toBe('Aggressive spending style aimed at winning players early, at the risk of running out of FAAB.');
    expect(getWaiverStrategyExplanation('vorp', 16, true)).toBe('Calculates VoRP from the replacement-team count you set, estimates the average VoRP required for a top-four roster, and prices players relative to that benchmark.');
    expect(getWaiverStrategyExplanation('vorp', 16, false, 'Sleeper ROS missing')).toContain('VoRP is unavailable: Sleeper ROS missing');
  });

  it('removes confidence and suppresses predicted bid under Aggressive', () => {
    const row = { predictedWinningBid: 275 };
    const { rerender } = render(<PredictedWinningBidFooter strategy="aggressive" row={row} />);
    expect(screen.queryByText(/Predicted bid/)).toBeNull();
    rerender(<PredictedWinningBidFooter strategy="safe" row={row} />);
    expect(screen.getByText(/Predicted bid/)).toBeTruthy();
    expect(screen.queryByText(/low|medium|high/i)).toBeNull();
  });
});
