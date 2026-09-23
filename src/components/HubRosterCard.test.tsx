/* @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HubRosterRow } from '../logic/hubRoster';
import { HubRosterCard } from './HubRosterCard';

function rosterRow(overrides: Partial<HubRosterRow>): HubRosterRow {
  return {
    playerId: 'default',
    name: 'Default Player',
    position: 'RB',
    team: 'KC',
    isStarter: false,
    starterSlot: null,
    projection: null,
    byeWeek: null,
    injuryStatus: null,
    status: 'Active',
    acquisition: { kind: 'unknown', faab: null },
    ...overrides,
  };
}

describe('HubRosterCard', () => {
  it('renders compact starter/bench context, weekly details, statuses, and only supported FAAB', () => {
    render(
      <HubRosterCard
        week={5}
        optimized
        rows={[
          rosterRow({
            playerId: 'starter',
            name: 'Starter Player',
            isStarter: true,
            starterSlot: 'FLEX',
            projection: 17.25,
            byeWeek: 5,
            injuryStatus: 'Questionable',
            acquisition: { kind: 'waiver', faab: 42 },
          }),
          rosterRow({
            playerId: 'zero-bid',
            name: 'Zero Bid Player',
            position: 'WR',
            team: 'DAL',
            projection: 8,
            byeWeek: 14,
            acquisition: { kind: 'waiver', faab: 0 },
          }),
          rosterRow({
            playerId: 'drafted',
            name: 'Drafted Player',
            position: 'QB',
            team: null,
            status: 'Injured Reserve',
            acquisition: { kind: 'draft', faab: null },
          }),
        ]}
      />,
    );

    expect(screen.getByText('Full Roster')).toBeTruthy();
    expect(screen.getByText('Optimized for NFL Week 5 · Sleeper projections')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Starters' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Bench' })).toBeTruthy();

    const starter = within(screen.getByTestId('roster-player-starter'));
    expect(starter.getByText('Starter Player')).toBeTruthy();
    expect(starter.getByText('Starter')).toBeTruthy();
    expect(starter.getByText('Bye W5')).toBeTruthy();
    expect(starter.getByText('Questionable')).toBeTruthy();
    expect(starter.getByLabelText('17.3 projected points')).toBeTruthy();
    expect(starter.getByText('$42')).toBeTruthy();

    const zeroBid = within(screen.getByTestId('roster-player-zero-bid'));
    expect(zeroBid.getByText('$0')).toBeTruthy();

    const drafted = within(screen.getByTestId('roster-player-drafted'));
    expect(drafted.getByText('Bench')).toBeTruthy();
    expect(drafted.getByText('Team unavailable')).toBeTruthy();
    expect(drafted.getByText('Bye unavailable')).toBeTruthy();
    expect(drafted.getByText('Injured Reserve')).toBeTruthy();
    expect(drafted.getByLabelText('Projection unavailable')).toBeTruthy();
    expect(drafted.getByLabelText('Acquisition price unavailable').textContent).toBe('—');
    expect(drafted.queryByText(/^\$/)).toBeNull();
  });

  it('labels the honest lineup fallback when optimization data is unavailable', () => {
    render(<HubRosterCard rows={[]} week={null} optimized={false} />);

    expect(screen.getByText('Current Sleeper lineup · weekly projections unavailable')).toBeTruthy();
    expect(screen.getByText('Roster unavailable')).toBeTruthy();
  });
});
