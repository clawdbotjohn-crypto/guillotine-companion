import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LiveScoringModel } from '../logic/liveScoring';
import { HubLiveScoring } from './HubLiveScoring';

const model: LiveScoringModel = {
  activeTeamCount: 2,
  projectedCutline: 88.2,
  rankingsAvailable: true,
  teams: [
    {
      rosterId: 1, displayName: 'Alpha', eliminated: false, officialPoints: 41.2,
      projectedFinal: 94.4, projectionQuality: 'full', playersRemaining: 3,
      playersInProgress: 1, standing: { rosterId: 1, rank: 1, outOf: 2, risk: 'safe' },
    },
    {
      rosterId: 2, displayName: 'Bravo', eliminated: false, officialPoints: 35,
      projectedFinal: 88.2, projectionQuality: 'partial', playersRemaining: 2,
      playersInProgress: 0, standing: { rosterId: 2, rank: 2, outOf: 2, risk: 'at-risk' },
    },
    {
      rosterId: 3, displayName: 'Chopped', eliminated: true, officialPoints: 70,
      projectedFinal: 70, projectionQuality: 'full', playersRemaining: 0,
      playersInProgress: 0, standing: null,
    },
  ],
};

describe('HubLiveScoring', () => {
  it('labels official Sleeper data, app projections, survivor denominator, partial data, and eliminated teams', () => {
    render(<HubLiveScoring week={5} model={model} updatedAt={900_000} now={1_000_000} onRefresh={() => {}} />);
    expect(screen.getByText('Sleeper')).toBeTruthy();
    expect(screen.getAllByText(/App projection/i).length).toBeGreaterThan(0);
    expect(screen.getByText('1/2 projected · Safe')).toBeTruthy();
    expect(screen.getByText('partial')).toBeTruthy();
    expect(screen.getByText('Eliminated')).toBeTruthy();
    expect(screen.getByText('Excluded from survival rank')).toBeTruthy();
    expect(screen.getByText('3 remaining · 1 in progress')).toBeTruthy();
    expect(screen.getByText(/App-projected cutline: 88.2/)).toBeTruthy();
    expect(screen.getByText('Fresh')).toBeTruthy();
  });

  it('offers an accessible explicit refresh and loading label', () => {
    const refresh = vi.fn();
    const { rerender } = render(<HubLiveScoring week={5} model={model} onRefresh={refresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh live scores' }));
    expect(refresh).toHaveBeenCalledOnce();
    rerender(<HubLiveScoring week={5} model={model} onRefresh={refresh} isRefreshing />);
    expect((screen.getByRole('button', { name: 'Refreshing live scores…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders honest loading and unavailable states', () => {
    const { rerender } = render(<HubLiveScoring week={5} model={null} isLoading onRefresh={() => {}} />);
    expect(screen.getByText(/Loading official scores/)).toBeTruthy();
    rerender(<HubLiveScoring week={null} model={null} unavailableReason="Historical season selected." onRefresh={() => {}} />);
    expect(screen.getByText('Live scoring unavailable')).toBeTruthy();
    expect(screen.getByText('Historical season selected.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Refresh live scores' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
