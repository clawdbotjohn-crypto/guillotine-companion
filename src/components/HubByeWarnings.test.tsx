/* @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HubByeWarning } from '../logic/hubRoster';
import { HubByeWarnings } from './HubByeWarnings';

function warning(overrides: Partial<HubByeWarning>): HubByeWarning {
  return {
    playerId: 'default',
    name: 'Default Player',
    position: 'RB',
    team: 'KC',
    isStarter: false,
    byeWeek: 5,
    ...overrides,
  };
}

describe('HubByeWarnings', () => {
  it('renders accessible compact bars with unmistakable starter priority and actions', () => {
    render(
      <HubByeWarnings
        warnings={[
          warning({
            playerId: 'starter',
            name: 'Starter Player',
            position: 'WR',
            team: 'DET',
            isStarter: true,
            byeWeek: 6,
          }),
          warning({
            playerId: 'bench',
            name: 'Bench Player',
            team: null,
            byeWeek: 5,
          }),
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Upcoming bye warnings' })).toBeTruthy();
    const bars = screen.getAllByRole('listitem');
    expect(bars).toHaveLength(2);

    const starter = within(bars[0]);
    expect(starter.getByText('Starter bye · Action needed')).toBeTruthy();
    expect(starter.getByText('WR · DET')).toBeTruthy();
    expect(starter.getByText('Starter Player')).toBeTruthy();
    expect(starter.getByText('NFL Week 6')).toBeTruthy();
    expect(starter.getByText(/plan a replacement/i)).toBeTruthy();

    const bench = within(bars[1]);
    expect(bench.getByText('Bench bye')).toBeTruthy();
    expect(bench.getByText('RB')).toBeTruthy();
    expect(bench.getByText('Bench Player')).toBeTruthy();
    expect(bench.getByText('NFL Week 5')).toBeTruthy();
    expect(bench.getByText(/check your depth/i)).toBeTruthy();
  });

  it('renders nothing when no supported bye warnings exist', () => {
    const { container } = render(<HubByeWarnings warnings={[]} />);

    expect(container.innerHTML).toBe('');
    expect(screen.queryByTestId('hub-bye-warnings')).toBeNull();
  });
});
