/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TeamProjection } from '../logic/analytics';
import { formatCurrentRank, formatProjectedCurrentRank } from '../logic/analytics';
import { UpcomingProjectionCard } from './HubPage';
import { formatHistoricalWeekRank } from '../logic/rankFormat';

describe('Hub rank contexts', () => {
  it('uses the projected survivor standing and post-elimination count', () => {
    const projection: TeamProjection = {
      rosterId: 12,
      displayName: 'Projected team',
      projPoints: 123.4,
      eliminated: false,
      projRank: 13,
      projOutOf: 28,
      risk: 'warning',
      starters: [],
    };

    expect(formatProjectedCurrentRank(projection)).toBe('13/28');
  });

  it('shows an unavailable rank honestly', () => {
    expect(formatCurrentRank(undefined, 28)).toBe('—');
    expect(formatCurrentRank(1, 0)).toBe('—');
    expect(formatProjectedCurrentRank(undefined)).toBe('—');
    expect(formatProjectedCurrentRank({
      rosterId: 3,
      displayName: 'Eliminated team',
      projPoints: 999,
      eliminated: true,
      projRank: 0,
      projOutOf: 0,
      risk: 'warning',
      starters: [],
    })).toBe('—');
  });

  it('formats last-week rank against that historical week entrants without an ordinal', () => {
    expect(formatHistoricalWeekRank(26, 30)).toBe('26/30');
  });

  it('shows active-only projection rank and the shared risk badge, never original-roster copy', () => {
    const projection: TeamProjection = {
      rosterId: 12,
      displayName: 'Projected team',
      projPoints: 123.45,
      eliminated: false,
      projRank: 13,
      projOutOf: 28,
      risk: 'at-risk',
      starters: [],
    };

    render(<UpcomingProjectionCard week={4} projection={projection} />);

    expect(screen.getByRole('heading', { name: 'Week 4 projected points' })).toBeTruthy();
    expect(screen.getByText('123.5')).toBeTruthy();
    expect(screen.getByText('13/28')).toBeTruthy();
    expect(screen.getByLabelText('Active survivor projection rank 13 of 28')).toBeTruthy();
    expect(screen.getByText('At Risk')).toBeTruthy();
    expect(screen.queryByText(/original rosters/i)).toBeNull();
    expect(screen.getByText('Sleeper weekly projections')).toBeTruthy();
  });

  it('renders an honest unavailable state instead of a historical score', () => {
    render(
      <UpcomingProjectionCard
        week={null}
        projection={undefined}
        unavailableReason="Weekly projections are unavailable for the selected historical season."
      />,
    );

    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Projected points' })).toBeTruthy();
    expect(screen.getByText('Sleeper weekly projections')).toBeTruthy();
    expect(screen.getByText('Weekly projections are unavailable for the selected historical season.')).toBeTruthy();
  });
});
