/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CanonicalBidEvent } from '../logic';
import type { WeeklyBidRecommendation } from '../logic/weeklyBidPlan';
import type { WaiverPlayerRow } from '../logic/waivers';
import { WeeklyDropPlayerCard, WeeklyTargetCard } from './WeeklyBidPlanPage';

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
    expect(within(opener).getByText('WR').style.color).toBe('rgb(16, 185, 129)');
    expect(within(opener).getByText('$0')).toBeTruthy();
    expect(within(opener).queryByText('Suggested bid')).toBeNull();
    expect(opener.textContent).toBe(`WR${longName}$0`);
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

  it('passes the explicit recommendation scenario so a $0 synthetic TE target shows the same +1.7 impact as Waivers', () => {
    const teTarget: WaiverPlayerRow = { ...target, playerId: 'synthetic-te-target', name: 'Synthetic Tight End', position: 'TE' };
    const teRecommendation: WeeklyBidRecommendation = {
      ...recommendation,
      target: teTarget,
      dropPlayerId: 'bench',
    };
    const weeklyContext = new Map([
      ['synthetic-te-target', { playerId: 'synthetic-te-target', position: 'TE', points: 7.7, positionRank: 1 }],
    ]);
    const weeklyProjections = new Map([
      ['q1', { playerId: 'q1', position: 'QB', points: 10 }],
      ['w1', { playerId: 'w1', position: 'WR', points: 8 }],
      ['r1', { playerId: 'r1', position: 'TE', points: 6 }],
      ['bench', { playerId: 'bench', position: 'TE', points: 0 }],
      ['q2', { playerId: 'q2', position: 'QB', points: 12 }],
      ['w2', { playerId: 'w2', position: 'WR', points: 16 }],
      ['r2', { playerId: 'r2', position: 'TE', points: 8 }],
      ['q3', { playerId: 'q3', position: 'QB', points: 9 }],
      ['w3', { playerId: 'w3', position: 'WR', points: 7 }],
      ['r3', { playerId: 'r3', position: 'TE', points: 5 }],
      ['synthetic-te-target', { playerId: 'synthetic-te-target', position: 'TE', points: 7.7 }],
    ]);
    const rosters = [
      { roster_id: 1, owner_id: 'synthetic-1', players: ['q1', 'w1', 'r1', 'bench'], starters: [], settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 } },
      { roster_id: 2, owner_id: 'synthetic-2', players: ['q2', 'w2', 'r2'], starters: [], settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 } },
      { roster_id: 3, owner_id: 'synthetic-3', players: ['q3', 'w3', 'r3'], starters: [], settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 } },
    ];
    const teams = new Map(rosters.map((roster) => [roster.roster_id, {
      rosterId: roster.roster_id,
      userId: roster.owner_id,
      displayName: `Synthetic Team ${roster.roster_id}`,
      eliminatedWeek: null,
      isChampion: false,
      isRunnerUp: false,
    }]));
    render(<WeeklyTargetCard
      recommendation={teRecommendation}
      playingWeek={7}
      remainingFaab={100}
      weeklyContext={weeklyContext as never}
      players={new Map([['synthetic-te-target', {
        player_id: 'synthetic-te-target', full_name: 'Synthetic Tight End', position: 'TE', team: 'SEA',
        age: 27, status: 'Active', injury_status: null,
      }]]) as never}
      season="2026"
      selectedRosterId={1}
      teamImpactContext={{
        rosters: rosters as never,
        league: {
          league_id: 'synthetic-league', name: 'Synthetic League', total_rosters: 3, settings: {}, scoring_settings: {},
          season: '2026', season_type: 'regular', status: 'in_season', draft_id: 'synthetic-draft', previous_league_id: null,
          roster_positions: ['QB', 'WR', 'TE', 'BN'],
        },
        elimination: {
          weeks: [], teams, activeTeamCount: 3, champion: null, runnerUp: null,
          isComplete: false, currentWeek: 1,
        },
        weeklyProjections,
      }}
      teamImpactScenario={{
        selectedRosterPlayerIds: ['q1', 'w1', 'r1', 'bench'],
        explicitDropPlayerId: 'bench',
      }}
    />);

    fireEvent.click(screen.getByRole('button', { name: /Synthetic Tight End, suggested bid \$0/i }));
    const impact = within(screen.getByRole('dialog', { name: 'Synthetic Tight End' }))
      .getByRole('region', { name: 'Team Impact' });
    expect(within(impact).getByText('+1.7')).toBeTruthy();
    expect(within(impact).getByText('Lineup pts: 24.0 → 25.7')).toBeTruthy();
    expect(within(impact).queryByText('None')).toBeNull();
  });

  it('uses the shared drop card and badge, opens canonical details by keyboard, and restores focus', async () => {
    const dropRow: WaiverPlayerRow = {
      ...target,
      playerId: 'drop-player',
      name: 'Synthetic Defense With A Full Wrapped Name',
      position: 'DEF',
      posRank: 4,
      sourceValue: 91,
      suggestions: [{ strategy: 'safe', label: 'Safe', value: 0, pctOfBudget: 0 }],
    };
    render(<WeeklyDropPlayerCard
      row={dropRow}
      owner={{ rosterId: 1, ownerName: 'Synthetic Team' }}
      playingWeek={7}
      weeklyPoints={6.2}
      weeklyRank={4}
      nflTeam="SEA"
      age={27}
      status="Active"
      selectedRosterId={1}
      canonicalHistory={history}
    />);

    const opener = screen.getByRole('button', { name: /Synthetic Defense With A Full Wrapped Name, owned by your selected team/i });
    const name = within(opener).getByText('Synthetic Defense With A Full Wrapped Name');
    expect(name.className).toContain('break-words');
    expect(name.className).not.toContain('truncate');
    const defense = within(opener).getByText('DEF');
    expect(defense.style.color).toBe('rgb(100, 116, 139)');
    expect(defense.style.borderColor).toBe('rgb(100, 116, 139)');
    expect(within(opener).queryByTestId('compact-bid-summary')).toBeNull();

    opener.focus();
    fireEvent.keyDown(opener, { key: 'Enter' });
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Synthetic Defense With A Full Wrapped Name' });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(within(dialog).getByRole('region', { name: 'Player profile' })).toBeTruthy();
    expect(within(dialog).queryByRole('region', { name: 'Acquisition context' })).toBeNull();
    expect(within(dialog).getByText('Bidding history · 1')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
