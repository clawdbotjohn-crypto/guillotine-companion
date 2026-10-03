import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { UserLeague } from '../api/types';
import { groupLeagueChoices } from '../logic/leagueIdentity';

function league(overrides: Partial<UserLeague> = {}): UserLeague {
  return {
    league_id: 'league',
    name: 'League',
    sport: 'nfl',
    total_rosters: 18,
    settings: { type: 3 },
    season: '2026',
    status: 'in_season',
    roster_positions: [],
    previous_league_id: null,
    draft_id: 'draft',
    avatar: null,
    ...overrides,
  };
}

describe('league picker native format grouping', () => {
  it('keeps native guillotine, recognized other, and unknown formats separate', () => {
    const grouped = groupLeagueChoices([
      league({ league_id: 'native', settings: { type: 3 } }),
      league({ league_id: 'redraft', settings: { type: 0, playoff_teams: 0 } }),
      league({ league_id: 'novel', settings: { type: 9 } }),
      league({ league_id: 'malformed', settings: { type: Number.NaN } }),
      league({ league_id: 'missing', settings: {} }),
      league({ league_id: 'other-sport', sport: 'nba', settings: { type: 3 } }),
    ]);

    expect(grouped.guillotine.map((item) => item.league_id)).toEqual(['native']);
    expect(grouped.other.map((item) => item.league_id)).toEqual(['redraft', 'other-sport']);
    expect(grouped.unknown.map((item) => item.league_id)).toEqual(['novel', 'malformed', 'missing']);
  });

  it('does not embed the known evidence league ID in production picker or history UI', () => {
    const productionUi = [
      readFileSync(`${process.cwd()}/src/pages/LeaguePickerPage.tsx`, 'utf8'),
      readFileSync(`${process.cwd()}/src/pages/BiddingHistoryPage.tsx`, 'utf8'),
    ].join('\n');
    expect(productionUi).not.toContain('1312112493526536192');
  });
});
