/* @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
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
        values={new Map([['starter', 91], ['zero-bid', 30]])}
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
    expect(starter.getByText('Bye Wk 5')).toBeTruthy();
    expect(starter.getByText('Questionable')).toBeTruthy();
    expect(starter.getByLabelText('17.3 projected points')).toBeTruthy();
    expect(starter.getByText('Paid $42')).toBeTruthy();
    expect(starter.getByText('Max VORP value $91')).toBeTruthy();
    expect(starter.getByLabelText('Max VORP value $91')).toBeTruthy();

    const zeroBid = within(screen.getByTestId('roster-player-zero-bid'));
    expect(zeroBid.getByText('Paid $0')).toBeTruthy();
    expect(zeroBid.getByText('Max VORP value $30')).toBeTruthy();

    const drafted = within(screen.getByTestId('roster-player-drafted'));
    expect(drafted.getByText('Bench')).toBeTruthy();
    expect(drafted.getByText('Team unavailable')).toBeTruthy();
    expect(drafted.getByText('Bye unavailable')).toBeTruthy();
    expect(drafted.getByText('Injured Reserve')).toBeTruthy();
    expect(drafted.getByLabelText('0 projected points')).toBeTruthy();
    expect(drafted.getByText('0 proj')).toBeTruthy();
    expect(drafted.getByLabelText('Drafted').textContent).toBe('Drafted');
    expect(drafted.getByText('Max VORP value —')).toBeTruthy();
  });

  it('opens the shared player detail surface from a roster row', () => {
    const row = rosterRow({ playerId: 'p1', name: 'Hub Player' });
    render(<HubRosterCard
      rows={[row]}
      week={6}
      optimized
      values={new Map([['p1', 77]])}
      details={new Map([['p1', {
        playerId: 'p1', name: 'Hub Player', position: 'RB', team: 'KC',
        sourceLabel: 'Sleeper ROS · league-calibrated', valueLabel: 'Max VORP value', valueDisplay: '$77', value: 77, positionRank: 5, owned: true,
        history: [],
      }]])}
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Open details for Hub Player' }));
    expect(screen.getByRole('dialog', { name: 'Hub Player' })).toBeTruthy();
    expect(screen.getByText('Max VORP value')).toBeTruthy();
    expect(screen.getByText('$77')).toBeTruthy();
    expect(screen.getByText('Sleeper ROS · league-calibrated · RB #5')).toBeTruthy();
  });

  it('does not turn projection loading or errors into numeric zero', () => {
    const row = rosterRow({ playerId: 'pending', name: 'Pending Player' });
    const { rerender } = render(<HubRosterCard rows={[row]} week={4} optimized projectionState="loading" />);
    const pending = within(screen.getByTestId('roster-player-pending'));
    expect(pending.getByLabelText('Projection loading')).toBeTruthy();
    expect(pending.queryByText('0 proj')).toBeNull();

    rerender(<HubRosterCard rows={[row]} week={4} optimized projectionState="error" />);
    expect(pending.getByLabelText('Projection unavailable')).toBeTruthy();
    expect(pending.queryByText('0 proj')).toBeNull();
  });

  it('labels the honest lineup fallback when optimization data is unavailable', () => {
    render(<HubRosterCard rows={[]} week={null} optimized={false} />);

    expect(screen.getByText('Current Sleeper lineup · weekly projections unavailable')).toBeTruthy();
    expect(screen.getByText('Roster unavailable')).toBeTruthy();
  });
});
