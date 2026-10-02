/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { orderTeamProjections, type HistoricalRank, type TeamProjection } from '../logic';
import { filterTeamsByEliminatedVisibility } from '../logic/teamVisibility';
import { getTeamPositionGroups } from '../logic/teamPositionGroups';
import { useAppStore } from '../store';
import { orderTeamsByValue } from '../logic/teamValueOrder';
import {
  EliminatedTeamsVisibilityToggle,
  PositionGroupBreakdown,
  PositionValueBreakdown,
  TeamRowDisclosureButton,
  TeamStandingDetails,
  TeamValueStandingDetails,
} from './TeamsPage';

describe('PositionGroupBreakdown', () => {
  it('does not show a current positional standing for an eliminated team', () => {
    render(
      <PositionGroupBreakdown
        eliminated
        groups={[{ position: 'QB', points: 999, rank: 1, outOf: 3 }]}
      />,
    );

    expect(screen.getByText('Eliminated — no current positional standing.')).toBeTruthy();
    expect(screen.queryByText('#1')).toBeNull();
    expect(screen.queryByText('QB')).toBeNull();
  });

  it('continues to render active-team ranks and points', () => {
    render(
      <PositionGroupBreakdown
        eliminated={false}
        groups={[{ position: 'FLEX', points: 42.4, rank: 2, outOf: 3 }]}
      />,
    );

    expect(screen.getByText('FLEX')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
    expect(screen.getByText('42p')).toBeTruthy();
  });

  it('switches expanded details between optimized projections and historical scoring', () => {
    const projected = new Map([[7, [
      { group: 'RB' as const, slotCount: 2, points: 31, rank: 1, outOf: 4 },
      { group: 'FLEX' as const, slotCount: 1, points: 18, rank: 2, outOf: 4 },
    ]]]);
    const historical = new Map([[7, [
      { position: 'RB', points: 240, rank: 4, outOf: 4 },
    ]]]);

    expect(getTeamPositionGroups(7, 'projected', projected, historical)).toEqual([
      { position: 'RB', points: 31, rank: 1, outOf: 4 },
      { position: 'FLEX', points: 18, rank: 2, outOf: 4 },
    ]);
    expect(getTeamPositionGroups(7, 'historical', projected, historical)).toEqual([
      { position: 'RB', points: 240, rank: 4, outOf: 4 },
    ]);
  });

  it('uses an honest unavailable message for projected expanded details', () => {
    render(
      <PositionGroupBreakdown
        eliminated={false}
        groups={[]}
        unavailableMessage="Projected lineup-group rankings unavailable."
      />,
    );

    expect(screen.getByText('Projected lineup-group rankings unavailable.')).toBeTruthy();
    expect(screen.queryByText('#1')).toBeNull();
  });
});

const projectedTeam: TeamProjection = {
  rosterId: 29,
  displayName: 'Formerly 29 of 32',
  projPoints: 150,
  eliminated: false,
  projRank: 1,
  projOutOf: 28,
  risk: 'safe',
  starters: [],
};
const historicalStanding: HistoricalRank = {
  rosterId: 29,
  totalPoints: 20,
  rank: 28,
  outOf: 28,
  risk: 'at-risk',
};

const eliminatedTeam: TeamProjection = {
  ...projectedTeam,
  rosterId: 3,
  displayName: 'Eliminated Team',
  eliminated: true,
  projRank: 0,
  projOutOf: 0,
};

function VisibilityHarness({ teams }: { teams: TeamProjection[] }) {
  const showEliminatedTeams = useAppStore((state) => state.showEliminatedTeams);
  const visibleTeams = filterTeamsByEliminatedVisibility(teams, showEliminatedTeams);
  const eliminatedCount = teams.filter((team) => team.eliminated).length;

  return (
    <>
      <EliminatedTeamsVisibilityToggle eliminatedCount={eliminatedCount} />
      {visibleTeams.map((team) => <div key={team.rosterId}>{team.displayName}</div>)}
    </>
  );
}

describe('eliminated-team visibility', () => {
  beforeEach(() => {
    useAppStore.getState().setShowEliminatedTeams(false);
    useAppStore.persist.clearStorage();
  });

  afterEach(() => {
    cleanup();
    useAppStore.getState().setShowEliminatedTeams(false);
    useAppStore.persist.clearStorage();
  });

  it('hides eliminated teams by default and labels the checkbox with the actual count', () => {
    render(
      <VisibilityHarness
        teams={[
          projectedTeam,
          eliminatedTeam,
          { ...eliminatedTeam, rosterId: 4, displayName: 'Another Eliminated Team' },
        ]}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Show eliminated teams (2)' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(projectedTeam.displayName)).toBeTruthy();
    expect(screen.queryByText(eliminatedTeam.displayName)).toBeNull();
    expect(screen.queryByText('Another Eliminated Team')).toBeNull();
  });

  it('shows eliminated team cards when enabled', () => {
    render(<VisibilityHarness teams={[projectedTeam, eliminatedTeam]} />);

    act(() => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Show eliminated teams (1)' }));
    });

    expect(screen.getByText(projectedTeam.displayName)).toBeTruthy();
    expect(screen.getByText(eliminatedTeam.displayName)).toBeTruthy();
  });

  it('preserves the preference across unmount and remount navigation', () => {
    const firstVisit = render(<VisibilityHarness teams={[projectedTeam, eliminatedTeam]} />);
    act(() => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Show eliminated teams (1)' }));
    });
    firstVisit.unmount();

    render(<VisibilityHarness teams={[projectedTeam, eliminatedTeam]} />);

    expect((screen.getByRole('checkbox', {
      name: 'Show eliminated teams (1)',
    }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(eliminatedTeam.displayName)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('guillotine-companion-store') ?? '{}').state)
      .toMatchObject({ showEliminatedTeams: true });
  });

  it('keeps the zero-count checkbox visible and disabled', () => {
    render(<VisibilityHarness teams={[projectedTeam]} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Show eliminated teams (0)' });
    expect((checkbox as HTMLInputElement).disabled).toBe(true);
  });

  it('filters only display rows without changing active projected or historical standings', () => {
    const secondActive = {
      ...projectedTeam,
      rosterId: 30,
      displayName: 'Second Active',
      projPoints: 100,
      projRank: 2,
      projOutOf: 28,
    };
    const historicalRanks = new Map<number, HistoricalRank>([
      [29, historicalStanding],
      [30, { ...historicalStanding, rosterId: 30, rank: 1, outOf: 28, risk: 'safe' }],
    ]);

    const projectedRows = orderTeamProjections(
      [eliminatedTeam, projectedTeam, secondActive],
      historicalRanks,
      'projected',
    );
    const historicalRows = orderTeamProjections(
      [eliminatedTeam, projectedTeam, secondActive],
      historicalRanks,
      'historical',
    );

    expect(filterTeamsByEliminatedVisibility(projectedRows, false)).toEqual([
      projectedTeam,
      secondActive,
    ]);
    expect(filterTeamsByEliminatedVisibility(historicalRows, false)).toEqual([
      secondActive,
      projectedTeam,
    ]);
    expect(projectedTeam).toMatchObject({ projRank: 1, projOutOf: 28 });
    expect(secondActive).toMatchObject({ projRank: 2, projOutOf: 28 });
    expect(historicalRanks.get(29)).toMatchObject({ rank: 28, outOf: 28 });
    expect(historicalRanks.get(30)).toMatchObject({ rank: 1, outOf: 28 });
  });
});

describe('Teams current standings', () => {
  it('switches both rank copy and status between projected and historical modes', () => {
    const { rerender } = render(
      <TeamStandingDetails
        team={projectedTeam}
        historical={historicalStanding}
        orderBy="projected"
      />,
    );

    expect(screen.getByText('proj #1/28 · 150.0 pts')).toBeTruthy();
    expect(screen.getByText('Safe')).toBeTruthy();
    expect(screen.queryByText('Danger')).toBeNull();

    rerender(
      <TeamStandingDetails
        team={projectedTeam}
        historical={historicalStanding}
        orderBy="historical"
      />,
    );

    expect(screen.getByText('hist #28/28 · 20.0 pts')).toBeTruthy();
    expect(screen.getByText('Danger')).toBeTruthy();
    expect(screen.queryByText('Safe')).toBeNull();
  });

  it('renders the renamed warning status', () => {
    render(
      <TeamStandingDetails
        team={{ ...projectedTeam, risk: 'warning' }}
        historical={historicalStanding}
        orderBy="projected"
      />,
    );

    expect(screen.getByText('Warning')).toBeTruthy();
    expect(screen.queryByText('Middle')).toBeNull();
  });

  it('shows an honest projected-state message when Sleeper weekly data is unavailable', () => {
    render(
      <TeamStandingDetails
        team={{ ...projectedTeam, projPoints: null, projRank: 0, projOutOf: 0 }}
        historical={historicalStanding}
        orderBy="projected"
      />,
    );

    expect(screen.getByText('Sleeper projection unavailable')).toBeTruthy();
    expect(screen.queryByText(/150\.0 pts/)).toBeNull();
    expect(screen.queryByText('Safe')).toBeNull();
  });

  it('keeps eliminated teams last without displaying a stale current rank', () => {
    const eliminated: TeamProjection = {
      ...projectedTeam,
      rosterId: 3,
      displayName: 'Eliminated',
      eliminated: true,
      projRank: 0,
      projOutOf: 0,
    };
    const secondActive: TeamProjection = {
      ...projectedTeam,
      rosterId: 30,
      displayName: 'Second active',
      projPoints: 100,
      projRank: 2,
    };
    const ranks = new Map<number, HistoricalRank>([
      [29, historicalStanding],
      [30, { ...historicalStanding, rosterId: 30, rank: 1, risk: 'safe' }],
    ]);

    expect(orderTeamProjections([eliminated, projectedTeam, secondActive], ranks, 'projected')
      .map((team) => team.rosterId)).toEqual([29, 30, 3]);
    expect(orderTeamProjections([eliminated, projectedTeam, secondActive], ranks, 'historical')
      .map((team) => team.rosterId)).toEqual([30, 29, 3]);

    render(
      <TeamStandingDetails
        team={eliminated}
        historical={{ ...historicalStanding, rosterId: 3, rank: 29, outOf: 32 }}
        orderBy="historical"
      />,
    );
    expect(screen.getByText('Eliminated')).toBeTruthy();
    expect(screen.queryByTestId('current-team-standing')).toBeNull();
    expect(screen.queryByText(/#29\/32/)).toBeNull();
  });
});


describe('Teams Value mode', () => {
  it('shows summed Max VORP dollars with an active-only rank', () => {
    render(
      <TeamValueStandingDetails
        team={projectedTeam}
        value={{ rosterId: 29, total: 94, matched: 8, missing: 1, playerCount: 9, rank: 26, outOf: 26 }}
        elimsPerWeek={2}
      />,
    );
    expect(screen.getByTestId('current-team-standing').textContent).toBe('value #26/26 · $94');
  });

  it('colors team totals by their active-team value quartile', () => {
    const summaries = [1, 2, 3, 4].map((rank) => ({
      rosterId: rank,
      total: 100 - rank,
      matched: 1,
      missing: 0,
      playerCount: 1,
      rank,
      outOf: 4,
    }));
    render(<>{summaries.map((value) => (
      <TeamValueStandingDetails
        key={value.rosterId}
        team={{ ...projectedTeam, rosterId: value.rosterId }}
        value={value}
        elimsPerWeek={1}
      />
    ))}</>);

    expect(screen.getAllByTestId('team-value-total').map((element) => element.style.color)).toEqual([
      'rgb(16, 185, 129)',
      'rgb(165, 180, 252)',
      'rgb(245, 158, 11)',
      'rgb(244, 63, 94)',
    ]);
  });

  it('derives the Value badge from the value rank instead of projected risk', () => {
    render(
      <TeamValueStandingDetails
        team={{ ...projectedTeam, risk: 'safe', projRank: 1 }}
        value={{ rosterId: 29, total: 10, matched: 1, missing: 0, playerCount: 1, rank: 6, outOf: 6 }}
        elimsPerWeek={1}
      />,
    );

    expect(screen.getByText('Danger')).toBeTruthy();
    expect(screen.getByLabelText('Status: Danger')).toBeTruthy();
    expect(screen.queryByText('Safe')).toBeNull();
  });

  it('keeps eliminated teams last and excludes their huge value from ordering', () => {
    const second = { ...projectedTeam, rosterId: 30 };
    const rankings = new Map([
      [29, { rosterId: 29, total: 10, matched: 1, missing: 0, playerCount: 1, rank: 2, outOf: 2 }],
      [30, { rosterId: 30, total: 20, matched: 1, missing: 0, playerCount: 1, rank: 1, outOf: 2 }],
    ]);
    expect(orderTeamsByValue([eliminatedTeam, projectedTeam, second], rankings).map((team) => team.rosterId)).toEqual([30, 29, 3]);
  });

  it('colors ranked position dollars from each position rank', () => {
    render(<PositionValueBreakdown eliminated={false} groups={[
      { position: 'RB', total: 42, rank: 1, outOf: 4 },
      { position: 'WR', total: 24, rank: 3, outOf: 4 },
    ]} />);
    expect(screen.getByText('#1/4')).toBeTruthy();
    expect(screen.getByText('#3/4')).toBeTruthy();
    expect(screen.getByTestId('position-value-RB').style.color).toBe('rgb(16, 185, 129)');
    expect(screen.getByTestId('position-value-WR').style.color).toBe('rgb(245, 158, 11)');
  });

  it('keeps K and DEF dollars neutral and renders no rank text', () => {
    render(<PositionValueBreakdown eliminated={false} groups={[
      { position: 'K', total: 7, rank: null, outOf: 4 },
      { position: 'DEF', total: 3, rank: null, outOf: 4 },
    ]} />);
    expect(screen.getByText('$7')).toBeTruthy();
    expect(screen.getByText('$3')).toBeTruthy();
    expect(screen.getByTestId('position-value-K').style.color).toBe('rgb(165, 180, 252)');
    expect(screen.getByTestId('position-value-DEF').style.color).toBe('rgb(165, 180, 252)');
    expect(screen.queryByText(/^#/)).toBeNull();
  });

  it('uses a keyboard-accessible row disclosure without changing its visual content', () => {
    let toggled = false;
    render(
      <TeamRowDisclosureButton
        expanded={false}
        controls="team-7-details"
        label="Expand Houston details"
        onToggle={() => { toggled = true; }}
      >
        <span>Houston</span>
      </TeamRowDisclosureButton>,
    );
    const trigger = screen.getByRole('button', { name: 'Expand Houston details' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe('team-7-details');
    fireEvent.click(trigger);
    expect(toggled).toBe(true);
  });
});
