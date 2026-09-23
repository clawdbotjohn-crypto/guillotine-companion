/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TeamProjection } from '../logic/analytics';
import { formatCurrentRank, formatProjectedCurrentRank } from '../logic/analytics';
import { UpcomingProjectionCard } from './HubPage';
import { formatHistoricalWeekRank } from '../logic/rankFormat';

describe('Hub current rank', () => {
  it('uses the projected survivor standing and post-elimination count', () => {
    const projection: TeamProjection = {
      rosterId: 12,
      displayName: 'Projected team',
      projPoints: 123.4,
      eliminated: false,
      projRank: 12,
      projOutOf: 28,
      risk: 'safe',
      starters: [],
    };

    expect(formatProjectedCurrentRank(projection)).toBe('12/28');
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
});

describe('Hub weekly summary ranks', () => {
  it('uses pre-elimination entrants for the historical weekly denominator', () => {
    expect(formatHistoricalWeekRank(26, 30)).toBe('26th/30');
  });
});

describe('Hub upcoming team projection', () => {
  it('labels the optimized score with NFL week and Sleeper source', () => {
    const projection: TeamProjection = {
      rosterId: 12,
      displayName: 'Projected team',
      projPoints: 123.45,
      eliminated: false,
      projRank: 2,
      projOutOf: 28,
      risk: 'safe',
      starters: [],
    };

    render(<UpcomingProjectionCard week={4} projection={projection} allRosterRank={20} allRosterCount={32} />);

    expect(screen.getByRole('heading', { name: 'Week 4 projected points' })).toBeTruthy();
    expect(screen.getByText('123.5')).toBeTruthy();
    expect(screen.getByText(/20th\/32 among original rosters/)).toBeTruthy();
    expect(screen.getByLabelText('Projection rank 20 of 32 original rosters')).toBeTruthy();
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
