/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HubPositionRankings } from './HubPositionRankings';

describe('HubPositionRankings', () => {
  it('uses aggregated labels, compact ranks, and accessible point disclosures without duplicate chrome', () => {
    render(<HubPositionRankings week={7} rows={[
      { group: 'RB', slotCount: 2, points: 34, rank: 2, outOf: 3 },
      { group: 'FLEX', slotCount: 1, points: 14, rank: 1, outOf: 3 },
      { group: 'SUPER_FLEX', slotCount: 1, points: 13, rank: 3, outOf: 3 },
    ]} />);
    expect(screen.getByText('RB')).toBeTruthy();
    expect(screen.queryByText(/RB ×2/)).toBeNull();
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.queryByText(/Active teams|NFL Week 7 · Sleeper/)).toBeNull();
    const button = screen.getByRole('button', { name: 'Show RB projected lineup details' });
    const tooltip = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(tooltip.className).toContain('hidden');
    fireEvent.mouseEnter(button.parentElement!);
    expect(tooltip.className).toContain('flex');
    fireEvent.mouseLeave(button.parentElement!);
    fireEvent.focus(button);
    expect(tooltip.className).toContain('flex');
    fireEvent.blur(button);
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(tooltip.className).toContain('flex');
    expect(screen.getByText(/RB \(2 lineup slots\): 34.0 projected points/)).toBeTruthy();
  });

  it('uses the shared top/bottom quartiles with a neutral middle', () => {
    render(<HubPositionRankings week={7} rows={[
      { group: 'QB', slotCount: 1, points: 20, rank: 2, outOf: 8 },
      { group: 'RB', slotCount: 2, points: 30, rank: 3, outOf: 8 },
      { group: 'WR', slotCount: 2, points: 28, rank: 7, outOf: 8 },
    ]} />);
    expect((screen.getByText('2/8') as HTMLElement).style.color).toBe('rgb(16, 185, 129)');
    expect((screen.getByText('3/8') as HTMLElement).style.color).toBe('rgb(245, 158, 11)');
    expect((screen.getByText('7/8') as HTMLElement).style.color).toBe('rgb(244, 63, 94)');
  });

  it('shows an honest unavailable state without a fabricated rank', () => {
    render(<HubPositionRankings week={null} rows={[]} unavailableGroups={['QB']} unavailableReason="The endpoint is unavailable." />);
    expect(screen.getByText('Projected position rankings unavailable.')).toBeTruthy();
    expect(screen.getByText('The endpoint is unavailable.')).toBeTruthy();
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
  });
});
