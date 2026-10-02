/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TeamProjection } from '../logic/analytics';
import { formatCurrentRank, formatProjectedCurrentRank } from '../logic/analytics';
import { TeamValueStatCard, UpcomingProjectionCard } from './HubPage';
import { formatHistoricalWeekRank } from '../logic/rankFormat';
import {
  getConstrainedTooltipPosition,
  MOBILE_BOTTOM_NAV_SAFE_AREA_PX,
} from '../logic/tooltipPosition';

describe('Hub rank contexts', () => {
  it('uses the projected survivor standing and post-elimination count', () => {
    const projection: TeamProjection = {
      rosterId: 12,
      displayName: 'Projected team',
      projPoints: 123.4,
      eliminated: false,
      projRank: 13,
      projOutOf: 28,
      risk: 'warning',
      starters: [],
    };

    expect(formatProjectedCurrentRank(projection)).toBe('13/28');
  });

  it('shows an unavailable rank honestly', () => {
    expect(formatCurrentRank(undefined, 28)).toBe('—');
    expect(formatCurrentRank(1, 0)).toBe('—');
    expect(formatProjectedCurrentRank(undefined)).toBe('—');
    expect(formatProjectedCurrentRank({
      rosterId: 3,
      displayName: 'Eliminated team',
      projPoints: 999,
      eliminated: true,
      projRank: 0,
      projOutOf: 0,
      risk: 'warning',
      starters: [],
    })).toBe('—');
  });

  it('formats last-week rank against that historical week entrants without an ordinal', () => {
    expect(formatHistoricalWeekRank(26, 30)).toBe('26/30');
  });

  it('shows active-only projection rank and the shared risk badge, never original-roster copy', () => {
    const projection: TeamProjection = {
      rosterId: 12,
      displayName: 'Projected team',
      projPoints: 123.45,
      eliminated: false,
      projRank: 13,
      projOutOf: 28,
      risk: 'at-risk',
      starters: [],
    };

    render(<UpcomingProjectionCard week={4} projection={projection} />);

    expect(screen.getByRole('heading', { name: 'Week 4 projected points' })).toBeTruthy();
    expect(screen.getByText('123.5')).toBeTruthy();
    expect(screen.getByText('13/28')).toBeTruthy();
    expect(screen.getByLabelText('Active survivor projection rank 13 of 28')).toBeTruthy();
    expect(screen.getByText('Danger')).toBeTruthy();
    expect(screen.queryByText(/original rosters/i)).toBeNull();
    expect(screen.getByText('Sleeper weekly projections')).toBeTruthy();
  });

  it('keeps Team Value compact and exposes model provenance on focus and mobile tap', () => {
    render(<TeamValueStatCard value="$337" subtext="26/26" leagueHigh={512} activeTeamCount={26} />);
    expect(screen.getByText('Team Value')).toBeTruthy();
    expect(screen.getByText('$337')).toBeTruthy();
    expect(screen.getByText('26/26')).toBeTruthy();
    const info = screen.getByRole('button', { name: 'About Team Value' });
    fireEvent.focus(info);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('League high: $512');
    expect(tooltip.textContent).toContain('current-roster Max VORP values');
    expect(tooltip.textContent).toContain('26 active/surviving rosters only');
    expect(tooltip.className).toContain('fixed');
    expect(tooltip.parentElement).toBe(document.body);
    fireEvent.blur(info);
    fireEvent.click(info);
    expect(info.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('tooltip').className).toContain('flex');
  });

  it('clamps the Team Value tooltip inside the exact 384px visual viewport repro', () => {
    const position = getConstrainedTooltipPosition({
      trigger: { left: 118.9, right: 132, top: 140, bottom: 153, width: 13.1, height: 13 },
      tooltip: { width: 288, height: 72 },
      viewport: { width: 384, height: 844, offsetLeft: 0, offsetTop: 0 },
      reservedBottom: MOBILE_BOTTOM_NAV_SAFE_AREA_PX,
    });
    expect(position.left).toBe(88);
    expect(position.left + 288).toBeLessThanOrEqual(376);
    expect(position.top).toBe(64);
  });

  it('keeps the mobile Team Value tooltip above the bottom-nav safe area', () => {
    const viewport = { width: 384, height: 844, offsetLeft: 0, offsetTop: 0 };
    const tooltip = { width: 288, height: 106 };
    const position = getConstrainedTooltipPosition({
      trigger: { left: 118.9, right: 132, top: 840, bottom: 844, width: 13.1, height: 4 },
      tooltip,
      viewport,
      reservedBottom: MOBILE_BOTTOM_NAV_SAFE_AREA_PX,
    });

    expect(position.left).toBe(88);
    expect(position.left + tooltip.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(position.top).toBe(666);
    expect(position.top + tooltip.height).toBeLessThanOrEqual(
      viewport.height - MOBILE_BOTTOM_NAV_SAFE_AREA_PX,
    );
  });

  it('renders an honest unavailable state instead of a historical score', () => {
    render(
      <UpcomingProjectionCard
        week={null}
        projection={undefined}
        unavailableReason="Weekly projections are unavailable for the selected historical season."
      />,
    );

    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Projected points' })).toBeTruthy();
    expect(screen.getByText('Sleeper weekly projections')).toBeTruthy();
    expect(screen.getByText('Weekly projections are unavailable for the selected historical season.')).toBeTruthy();
  });
});
