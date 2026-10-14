/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { shouldShowWeeklyBidPlan } from '../logic/weeklyBidPlan';
import { WeeklyBidPlanEntry } from './WeeklyBidPlanEntry';

describe('Suggested Bids Hub entry', () => {
  it('preserves the deterministic active-season eligibility gate', () => {
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'in_season', liveScoringActive: false, playingWeek: 8 })).toBe(true);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'in_season', liveScoringActive: true, playingWeek: 8 })).toBe(false);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'complete', liveScoringActive: false, playingWeek: 8 })).toBe(false);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'pre_draft', liveScoringActive: false, playingWeek: 1 })).toBe(false);
    expect(shouldShowWeeklyBidPlan({ leagueStatus: 'in_season', liveScoringActive: false, playingWeek: null })).toBe(false);
  });

  it('uses the exact owner title, restrained temporary emphasis, and no description', () => {
    const onOpen = vi.fn();
    render(<WeeklyBidPlanEntry onOpen={onOpen} />);

    const entry = screen.getByRole('button', { name: 'Open Suggested Bids' });
    expect(screen.getByText('Suggested Bids')).toBeTruthy();
    expect(entry.className).toContain('border-[#d6a63d]/60');
    expect(entry.className).toContain('bg-[#6b4d12]/20');
    expect(entry.className).toContain('min-h-16');
    expect(entry.textContent).toBe('Suggested Bids');
    expect(screen.queryByText(/weekly|read-only|advisory|plan/i)).toBeNull();

    fireEvent.click(entry);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
