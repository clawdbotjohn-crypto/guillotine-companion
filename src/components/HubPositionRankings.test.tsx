/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HubPositionRankings } from './HubPositionRankings';

describe('HubPositionRankings', () => {
  it('renders compact, accessible active-team ranks and understandable duplicate labels', () => {
    render(
      <HubPositionRankings
        week={7}
        rows={[
          { group: 'RB', slotCount: 2, points: 34, rank: 2, outOf: 3 },
          { group: 'FLEX', slotCount: 1, points: 14, rank: 1, outOf: 3 },
          { group: 'SUPER_FLEX', slotCount: 1, points: 13, rank: 3, outOf: 3 },
        ]}
        unavailableGroups={['K']}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Projected Lineup Strength' })).toBeTruthy();
    expect(screen.getByText('NFL Week 7 · Sleeper')).toBeTruthy();
    expect(screen.getByText('RB ×2')).toBeTruthy();
    expect(screen.getByText('#2 of 3 active')).toBeTruthy();
    expect(screen.getByText('Super Flex')).toBeTruthy();
    expect(screen.getByLabelText('RB ×2: 34.0 projected points, rank 2 of 3 active teams')).toBeTruthy();
    expect(screen.getByText('Complete weekly projections unavailable for: K.')).toBeTruthy();
  });

  it('shows an honest unavailable state without a fabricated rank', () => {
    render(
      <HubPositionRankings
        week={null}
        rows={[]}
        unavailableGroups={['QB']}
        unavailableReason="Complete weekly projections are not available for every active lineup."
      />,
    );

    expect(screen.getByText('Projected position rankings unavailable.')).toBeTruthy();
    expect(screen.getByText('Complete weekly projections are not available for every active lineup.')).toBeTruthy();
    expect(screen.queryByText(/#\d+ of \d+ active/)).toBeNull();
  });
});
