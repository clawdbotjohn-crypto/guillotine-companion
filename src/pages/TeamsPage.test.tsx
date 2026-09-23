/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { orderTeamProjections, type HistoricalRank, type TeamProjection } from '../logic';
import { PositionGroupBreakdown, TeamStandingDetails } from './TeamsPage';

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
    expect(screen.queryByText('At Risk')).toBeNull();

    rerender(
      <TeamStandingDetails
        team={projectedTeam}
        historical={historicalStanding}
        orderBy="historical"
      />,
    );

    expect(screen.getByText('hist #28/28 · 20.0 pts')).toBeTruthy();
    expect(screen.getByText('At Risk')).toBeTruthy();
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
