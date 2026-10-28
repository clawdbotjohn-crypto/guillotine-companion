import { describe, expect, it } from 'vitest';
import { getCurrentNflSeason, isValidSleeperLeagueId } from './season';

describe('league discovery helpers', () => {
  it('uses the prior NFL season in January and February', () => {
    expect(getCurrentNflSeason(new Date(2026, 0, 10))).toBe('2025');
    expect(getCurrentNflSeason(new Date(2026, 1, 28))).toBe('2025');
    expect(getCurrentNflSeason(new Date(2026, 2, 1))).toBe('2026');
  });

  it('accepts only plausible numeric Sleeper snowflakes', () => {
    expect(isValidSleeperLeagueId('6100000000000000001')).toBe(true);
    expect(isValidSleeperLeagueId('610000000000000')).toBe(false);
    expect(isValidSleeperLeagueId('610000000000000000x')).toBe(false);
    expect(isValidSleeperLeagueId(' 6100000000000000001 ')).toBe(false);
  });
});
