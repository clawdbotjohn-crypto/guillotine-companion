import { describe, expect, it } from 'vitest';
import type { NflState, WeeklyProjectionMap } from '../../api/types';
import {
  buildWeeklyProjectionContext,
  buildWeeklyScoredPlayers,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  getTeamByeWeek,
  sumRestOfSeasonProjections,
} from '../projections';

const positions: Record<string, string> = {
  player: 'WR',
  standardOnly: 'RB',
  available: 'WR',
  rostered: 'WR',
  other: 'WR',
  kicker: 'K',
};

function weekly(...entries: [number, WeeklyProjectionMap][]) {
  return new Map<number, WeeklyProjectionMap>(entries);
}

describe('Sleeper ROS projection aggregation', () => {
  it('sums every remaining weekly PPR projection and includes missing weeks as zero', () => {
    const weeks = weekly(
      [3, { player: { pts_ppr: 20, pts_half_ppr: 17, pts_std: 14 } }],
      [4, { player: { pts_ppr: 10, pts_half_ppr: 8.5, pts_std: 7 } }],
      [5, {}],
    );

    const result = sumRestOfSeasonProjections(
      weeks,
      getProjectionScoring(1),
      (playerId) => positions[playerId],
    );

    expect(result.get('player')).toEqual({
      playerId: 'player',
      position: 'WR',
      totalPoints: 30,
      pointsPerWeek: 10,
      projectedWeeks: 3,
    });
  });

  it('selects half-PPR or standard totals from league reception scoring without field fallback', () => {
    const weeks = weekly(
      [3, {
        player: { pts_ppr: 20, pts_half_ppr: 17, pts_std: 14 },
        standardOnly: { pts_std: 8 },
      }],
      [4, {
        player: { pts_ppr: 10, pts_half_ppr: 8.5, pts_std: 7 },
        standardOnly: { pts_std: 6 },
      }],
    );

    const half = sumRestOfSeasonProjections(
      weeks,
      getProjectionScoring(0.5),
      (playerId) => positions[playerId],
    );
    const standard = sumRestOfSeasonProjections(
      weeks,
      getProjectionScoring(0),
      (playerId) => positions[playerId],
    );

    expect(half.get('player')?.totalPoints).toBe(25.5);
    expect(half.has('standardOnly')).toBe(false);
    expect(standard.get('player')?.totalPoints).toBe(21);
    expect(standard.get('standardOnly')?.totalPoints).toBe(14);
  });

  it('builds lineup points from the selected weekly scoring field for every position', () => {
    const scored = buildWeeklyScoredPlayers({
      player: { pts_ppr: 20, pts_half_ppr: 17, pts_std: 14 },
      kicker: { pts_ppr: 9, pts_half_ppr: 9, pts_std: 9 },
      standardOnly: { pts_std: 8 },
    }, 'half-ppr', (playerId) => positions[playerId]);

    expect(scored.get('player')).toEqual({ playerId: 'player', position: 'WR', points: 17 });
    expect(scored.get('kicker')).toEqual({ playerId: 'kicker', position: 'K', points: 9 });
    expect(scored.has('standardOnly')).toBe(false);
  });

  it('ranks an available player against the complete weekly projection pool', () => {
    const context = buildWeeklyProjectionContext({
      rostered: { pts_ppr: 22 },
      available: { pts_ppr: 18 },
      other: { pts_ppr: 12 },
    }, 'ppr', (playerId) => positions[playerId]);

    // The rostered player remains in the pool, so the available player is WR2 rather than WR1.
    expect(context.get('available')).toMatchObject({ points: 18, positionRank: 2, position: 'WR' });
  });

  it('uses the official season/team bye table and is honest for unsupported data', () => {
    expect(getTeamByeWeek('2026', 'KC')).toBe(5);
    expect(getTeamByeWeek('2026', 'DAL')).toBe(14);
    expect(getTeamByeWeek('2026', null)).toBeNull();
    expect(getTeamByeWeek('2025', 'KC')).toBeNull();
  });

  it('starts with the current week unless Sleeper marks it completed', () => {
    const state: NflState = {
      week: 3,
      display_week: 2,
      season: '2026',
      season_type: 'regular',
      leg: 3,
      league_season: '2026',
      season_start_date: '2026-09-09',
      season_has_scores: true,
    };

    expect(getRestOfSeasonStartWeek(state)).toBe(3);
    expect(getRestOfSeasonStartWeek({ ...state, display_week: 3 })).toBe(4);
  });
});
