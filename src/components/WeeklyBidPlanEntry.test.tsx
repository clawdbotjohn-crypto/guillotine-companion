import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { shouldShowWeeklyBidPlan } from '../logic/weeklyBidPlan';
import { WeeklyBidPlanEntry } from './WeeklyBidPlanEntry';

describe('WeeklyBidPlanEntry', () => {
  it('is eligible only during an active season without live scoring', () => {
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'in_season', liveScoringActive: false, playingWeek: 8 })).toBe(true);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'in_season', liveScoringActive: true, playingWeek: 8 })).toBe(false);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'complete', liveScoringActive: false, playingWeek: 8 })).toBe(false);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'pre_draft', liveScoringActive: false, playingWeek: 1 })).toBe(false);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'in_season', liveScoringActive: false, playingWeek: null })).toBe(false);
  });

  it('opens the read-only plan and remains an ordinary reusable entry', () => {
    const onOpen = vi.fn();
    const { unmount } = render(<WeeklyBidPlanEntry onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /open your weekly bid plan/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    unmount();
    render(<WeeklyBidPlanEntry onOpen={onOpen} />);
    expect(screen.getByRole('button', { name: /open your weekly bid plan/i })).toBeTruthy();
    expect(screen.getByText(/read-only advisory/i)).toBeTruthy();
  });
});
