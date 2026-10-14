/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CanonicalBidEvent } from '../logic';
import type { WeeklyBidRecommendation } from '../logic/weeklyBidPlan';
import type { WaiverPlayerRow } from '../logic/waivers';
import { WeeklyDropPlayer, WeeklyTargetCard } from './WeeklyBidPlanPage';

const longName = 'Amon-Ra Extremely Long Synthetic Player Name';
const target: WaiverPlayerRow = {
  playerId: 'target-player',
  name: longName,
  position: 'WR',
  rosPoints: 200,
  projectedPointsPerWeek: 14,
  posRank: 2,
  starterWeeks: 10,
  possibleStarterWeeks: 14,
  sourceValue: 200,
  suggestions: [{ strategy: 'safe', label: 'Safe', value: 41, pctOfBudget: 10 }],
  predictedWinningBid: 0,
};
const recommendation: WeeklyBidRecommendation = {
  target,
  dropPlayerId: 'drop-player',
  weeklyGain: 5,
  rosGain: 50,
  beforeRisk: 'warning',
  afterRisk: 'safe',
  beforeRank: 10,
  afterRank: 6,
  theoreticalBid: 0,
  suggestedBid: 0,
  budgetCapApplied: false,
  opponentCapApplied: false,
  safeMultiplier: 1,
};
const history: CanonicalBidEvent[] = [{
  transactionId: 'synthetic-transaction',
  managerRosterId: 2,
  playerId: 'target-player',
  transactionWeek: 3,
  decisionWeek: 3,
  batchKey: '2026:3:target-player',
  actualBid: 12,
  outcome: 'won',
  createdAt: 1,
  processedAt: 1,
  faabAvailableBeforeBid: 100,
  faabReconstruction: 'transaction-ledger',
  duplicateCount: 1,
}];

describe('Suggested Bids owner presentation', () => {
  it('keeps long target names legible, preserves $0, removes collapsed prose, and opens the full Waivers details path', () => {
    const weeklyContext = new Map([['target-player', {
      playerId: 'target-player', position: 'WR', points: 18, positionRank: 1,
    }]]);
    const players = new Map([['target-player', {
      player_id: 'target-player', full_name: longName, position: 'WR', team: 'SEA',
      age: 25, status: 'Active', injury_status: null,
    }]]);

    render(<WeeklyTargetCard
      recommendation={recommendation}
      playingWeek={7}
      remainingFaab={224}
      weeklyContext={weeklyContext as never}
      players={players as never}
      season="2026"
      selectedRosterId={null}
      canonicalHistory={history}
      teamImpactContext={{
        rosters: [], league: {} as never,
        elimination: {} as never, weeklyProjections: new Map(),
      }}
    />);

    const opener = screen.getByRole('button', { name: `${longName}, suggested bid $0. Open player details` });
    const renderedName = within(opener).getByText(longName);
    expect(renderedName.className).toContain('break-words');
    expect(renderedName.className).not.toContain('truncate');
    expect(within(opener).getByText('$0')).toBeTruthy();
    expect(within(opener).queryByText('Suggested bid')).toBeNull();
    expect(opener.textContent).toBe(`${longName}$0`);
    expect(screen.queryByText(/this week|ROS|posture|scenario|capped|W7|Bye/i)).toBeNull();

    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: longName });
    expect(within(dialog).getByRole('region', { name: 'Player profile' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Acquisition context' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Team Impact' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Predicted bidding' })).toBeTruthy();
    expect(within(dialog).getByText('Bidding history · 1')).toBeTruthy();
    expect(within(dialog).getByText('$12')).toBeTruthy();
  });

  it('uses the established shared position colors for drop-player pills', () => {
    const { rerender } = render(<WeeklyDropPlayer position="RB" name="Synthetic Runner" />);
    const rb = screen.getByText('RB');
    expect(rb.style.color).toBe('rgb(99, 102, 241)');
    expect(rb.style.borderColor).toBe('rgb(99, 102, 241)');
    expect(rb.style.background).toBe('rgba(99, 102, 241, 0.15)');

    rerender(<WeeklyDropPlayer position="DEF" name="Synthetic Defense" />);
    const defense = screen.getByText('DEF');
    expect(defense.style.color).toBe('rgb(100, 116, 139)');
    expect(defense.style.borderColor).toBe('rgb(100, 116, 139)');
  });
});
