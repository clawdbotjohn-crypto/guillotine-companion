/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CanonicalBidEvent } from '../logic';
import type { WeeklyBidPlan, WeeklyBidRecommendation } from '../logic/weeklyBidPlan';
import type { WaiverPlayerRow } from '../logic/waivers';
import {
  WeeklyBidAccordionGroup,
  WeeklyBidSummary,
  WeeklyDropPlayerCard,
  WeeklyTargetCard,
} from './WeeklyBidPlanPage';

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
  scenarioWeeklyGain: 5,
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
  it('uses a native accessible accordion with separate player-details control and preserves user state on rerender', () => {
    const group = (
      <WeeklyBidAccordionGroup
        id="synthetic-drop"
        dropPlayerName="Synthetic Drop"
        targetCount={2}
        defaultOpen
        dropCard={<button type="button">Open Synthetic Drop details</button>}
      >
        <div>Synthetic full-width targets</div>
      </WeeklyBidAccordionGroup>
    );
    const { rerender } = render(group);
    const toggle = screen.getByRole('button', { name: '2 targets for Synthetic Drop' });
    const details = screen.getByRole('button', { name: 'Open Synthetic Drop details' });
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!);

    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.textContent).toBe('2 targets');
    expect(toggle.textContent).not.toContain('Synthetic Drop');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.hidden).toBe(false);
    fireEvent.click(details);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel?.hidden).toBe(true);

    rerender(group);
    expect(screen.getByRole('button', { name: '2 targets for Synthetic Drop' })
      .getAttribute('aria-expanded')).toBe('false');
  });

  it('uses localized singular and plural target-count grammar without visible drop-name copy', () => {
    const { rerender } = render(
      <WeeklyBidAccordionGroup
        id="grammar-drop"
        dropPlayerName="Synthetic Drop"
        targetCount={1}
        dropCard={<div>Synthetic Drop</div>}
      >
        <div>One target</div>
      </WeeklyBidAccordionGroup>,
    );
    expect(screen.getByRole('button', { name: '1 target for Synthetic Drop' }).textContent)
      .toBe('1 target');

    rerender(
      <WeeklyBidAccordionGroup
        id="grammar-drop"
        dropPlayerName="Synthetic Drop"
        targetCount={3}
        dropCard={<div>Synthetic Drop</div>}
      >
        <div>Three targets</div>
      </WeeklyBidAccordionGroup>,
    );
    expect(screen.getByRole('button', { name: '3 targets for Synthetic Drop' }).textContent)
      .toBe('3 targets');
  });

  it('renames summary fields and counts only conditional position-player pickup rounds', () => {
    const plan: WeeklyBidPlan = {
      rows: [
        { kind: 'position', dropPlayerId: 'drop-a', dropPosition: 'RB', recommendations: [recommendation], scenarioBudgetBefore: 100 },
        { kind: 'position', dropPlayerId: 'drop-b', dropPosition: 'WR', recommendations: [recommendation, recommendation], scenarioBudgetBefore: 80 },
        { kind: 'streamer', dropPlayerId: 'def-old', dropPosition: 'DEF', recommendations: [recommendation], scenarioBudgetBefore: 80 },
      ],
      startingRisk: 'safe',
      startingRank: 2,
      activeTeamCount: 5,
      initialBudgetRemaining: 100,
      richestOtherActiveBudget: 90,
    };
    render(<WeeklyBidSummary plan={plan} />);

    const summary = screen.getByRole('region', { name: 'Suggested Bids summary' });
    expect(within(summary).getByText('Survival status')).toBeTruthy();
    expect(within(summary).getByText('Projected rank')).toBeTruthy();
    expect(within(summary).getByText('FAAB available')).toBeTruthy();
    expect(within(summary).queryByText('Posture')).toBeNull();
    expect(within(summary).queryByText('Position moves')).toBeNull();
    expect(within(summary).queryByText('Bids won')).toBeNull();

    const plannedPickups = within(summary).getByRole('group', {
      name: 'Recommended pickups',
      description: 'Conditional position-player pickups modeled',
    });
    expect(within(plannedPickups).getByText('2')).toBeTruthy();
  });

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

    const addGroup = screen.getByRole('group', { name: new RegExp(`^Add ${longName}`) });
    expect(addGroup.getAttribute('data-bid-action')).toBe('add');
    expect(addGroup.getAttribute('aria-label')).toContain('league rank 10 to 6; lineup gain plus 5.0 points; suggested bid $0');
    expect(addGroup.className).toContain('border-[#10b981]/45');
    expect(within(addGroup).getByText('Add')).toBeTruthy();
    const impact = within(addGroup).getByTestId('weekly-target-impact');
    expect(within(impact).getByText('+5.0 pts')).toBeTruthy();
    expect(within(impact).getByText('#10 → #6')).toBeTruthy();
    const opener = within(addGroup).getByRole('button', { name: `${longName}, suggested bid $0. Open player details` });
    const renderedName = within(opener).getByText(longName);
    expect(renderedName.className).toContain('break-words');
    expect(renderedName.className).not.toContain('truncate');
    expect(within(opener).getByText('WR').style.color).toBe('rgb(16, 185, 129)');
    expect(within(opener).getByText('$0')).toBeTruthy();
    expect(within(opener).queryByText('Suggested bid')).toBeNull();
    const context = within(opener).getByTestId('suggested-bids-player-context');
    expect(within(context).getByText('WR #2')).toBeTruthy();
    expect(within(context).getByText('W7 18.0 pts #1')).toBeTruthy();
    expect(within(context).getByText('ROS 200 pts')).toBeTruthy();
    expect(opener.textContent).toContain(`${longName}WR #2·W7 18.0 pts #1·ROS 200 pts$0`);
    expect(screen.queryByText(/this week|posture|scenario|capped|Bye/i)).toBeNull();

    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: longName });
    expect(within(dialog).getByRole('region', { name: 'Player profile' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Acquisition context' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Team Impact' })).toBeTruthy();
    expect(within(dialog).getByRole('region', { name: 'Predicted bidding' })).toBeTruthy();
    expect(within(dialog).getByText('Bidding history · 1')).toBeTruthy();
    expect(within(dialog).getByText('$12')).toBeTruthy();
  });

  it('does not render a strictly positive sub-tenth lineup gain as +0.0', () => {
    render(<WeeklyTargetCard
      recommendation={{ ...recommendation, weeklyGain: 0.04 }}
      playingWeek={7}
      remainingFaab={224}
      weeklyContext={new Map([['target-player', {
        playerId: 'target-player', position: 'WR', points: 18, positionRank: 1,
      }]]) as never}
      players={new Map()}
      season="2026"
    />);

    const addGroup = screen.getByRole('group', { name: new RegExp(`^Add ${longName}`) });
    expect(within(addGroup).getByText('+0.04 pts')).toBeTruthy();
    expect(within(addGroup).queryByText('+0.0 pts')).toBeNull();
    expect(addGroup.getAttribute('aria-label')).toContain('lineup gain plus 0.04 points');
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

    const dropGroup = screen.getByRole('group', { name: 'Drop Synthetic Defense With A Full Wrapped Name' });
    expect(dropGroup.getAttribute('data-bid-action')).toBe('drop');
    expect(dropGroup.className).toContain("bg-[#ef4444]/[0.045]");
    expect(within(dropGroup).getByText('Drop')).toBeTruthy();
    const opener = within(dropGroup).getByRole('button', { name: /Synthetic Defense With A Full Wrapped Name, owned by your selected team/i });
    expect(opener.parentElement?.parentElement?.className).toContain('!border-0');
    expect(opener.parentElement?.parentElement?.className).not.toContain('border-[#10b981]/70');
    const name = within(opener).getByText('Synthetic Defense With A Full Wrapped Name');
    expect(name.className).toContain('break-words');
    expect(name.className).not.toContain('truncate');
    const defense = within(opener).getByText('DEF');
    expect(defense.style.color).toBe('rgb(100, 116, 139)');
    expect(defense.style.borderColor).toBe('rgb(100, 116, 139)');
    expect(within(opener).queryByTestId('compact-bid-summary')).toBeNull();
    const context = within(opener).getByTestId('suggested-bids-player-context');
    expect(within(context).getByText('DEF #4')).toBeTruthy();
    expect(within(context).getByText('W7 6.2 pts #4')).toBeTruthy();
    expect(within(context).getByText('ROS 200 pts')).toBeTruthy();

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
