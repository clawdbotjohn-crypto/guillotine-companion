/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PositionGroupBreakdown } from './TeamsPage';

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
