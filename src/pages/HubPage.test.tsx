/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TeamProjection } from '../logic/analytics';
import { formatCurrentRank, formatProjectedCurrentRank } from '../logic/analytics';
import { UpcomingProjectionCard } from './HubPage';

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
      risk: 'middle',
      starters: [],
    })).toBe('—');
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

    render(<UpcomingProjectionCard week={4} projection={projection} />);

    expect(screen.getByText('Projected Team Points')).toBeTruthy();
    expect(screen.getByText('123.5')).toBeTruthy();
    expect(screen.getByText('NFL Week 4 · Sleeper weekly projections')).toBeTruthy();
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
    expect(screen.getByText('NFL week unavailable · Sleeper weekly projections')).toBeTruthy();
    expect(screen.getByText('Weekly projections are unavailable for the selected historical season.')).toBeTruthy();
  });
});
