/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatScoringInjuryStatus } from '../logic/injuryStatus';
import type { LiveScoringModel } from '../logic/liveScoring';
import { HubLiveScoring } from './HubLiveScoring';

const model: LiveScoringModel = {
  activeTeamCount: 3,
  rankingsAvailable: true,
  projectedCutline: 61,
  teams: [{
    rosterId: 1,
    displayName: 'John’s Team',
    eliminated: false,
    officialPoints: 42.25,
    projectedFinal: 75.5,
    playersRemaining: 1,
    playersInProgress: 1,
    startersStarted: 1,
    starterCount: 2,
    standing: { rosterId: 1, rank: 2, outOf: 3, risk: 'warning' },
    starters: [
      {
        playerId: 'p1', name: 'Ada Runner', fantasyPosition: 'RB', lineupPosition: 'FLEX',
        injuryStatus: 'Questionable', currentPoints: 12.4, projectedFinal: 18.2,
        status: 'live', context: 'Live', hasStarted: true,
      },
      {
        playerId: 'p2', name: 'Grace Catcher', fantasyPosition: 'WR', lineupPosition: 'WR',
        injuryStatus: null, currentPoints: 0, projectedFinal: null,
        status: 'unknown', context: null, hasStarted: false,
      },
    ],
  }],
};

describe('formatScoringInjuryStatus', () => {
  it.each([
    ['Questionable', 'Q'],
    ['Doubtful', 'D'],
    ['Injured Reserve', 'IR'],
    ['IR', 'IR'],
    ['Out', 'O'],
    ['Suspended', 'S'],
  ])('formats %s as %s', (status, shorthand) => {
    expect(formatScoringInjuryStatus(status)).toBe(shorthand);
  });

  it('preserves an unrecognized status instead of hiding it', () => {
    expect(formatScoringInjuryStatus('PUP')).toBe('PUP');
  });
});

describe('HubLiveScoring', () => {
  it('renders only during the weekly slate and has no CTA copy', () => {
    const { rerender } = render(
      <HubLiveScoring week={6} model={model} isActive={false} currentRosterId={1} onRefresh={() => undefined} />,
    );
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<HubLiveScoring week={6} model={model} isActive currentRosterId={1} onRefresh={() => undefined} />);
    expect(screen.getByText('42.3')).toBeTruthy();
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.getByLabelText('Status: Warning')).toBeTruthy();
    expect(screen.queryByText(/view|open|details/i)).toBeNull();
  });

  it('uses the whole semantic banner button to open the owner starter dialog', () => {
    render(<HubLiveScoring week={6} model={model} isActive currentRosterId={1} onRefresh={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Week 6 scoring for John’s Team' }));

    const dialog = screen.getByRole('dialog', { name: 'John’s Team scoring' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Ada Runner')).toBeTruthy();
    const injuryStatus = screen.getByText('Q');
    expect(injuryStatus.getAttribute('aria-label')).toBe('Questionable');
    expect(injuryStatus.getAttribute('title')).toBe('Questionable');
    expect(injuryStatus.className).toContain('text-sm');
    expect(injuryStatus.className).toContain('font-semibold');
    expect(injuryStatus.className).toContain('text-[#f87171]');
    expect(injuryStatus.parentElement?.className).toContain('items-center');
    expect(screen.queryByText('Questionable')).toBeNull();
    expect(screen.getByText('Grace Catcher')).toBeTruthy();
    expect(screen.getByText('FLEX')).toBeTruthy();
    expect(screen.getByText('12.4')).toBeTruthy();
    expect(screen.getByText('Started')).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps request failure distinct from loaded zero scores and exposes retry', () => {
    const retry = vi.fn();
    render(
      <HubLiveScoring
        week={6}
        model={null}
        isActive
        unavailableReason="Sleeper official scores could not be loaded."
        currentRosterId={1}
        onRefresh={retry}
      />,
    );
    expect(screen.getByText('Sleeper official scores could not be loaded.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry live scores' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
