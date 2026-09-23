import { describe, expect, it } from 'vitest';
import type { TeamProjection } from '../logic/analytics';
import { formatCurrentRank, formatProjectedCurrentRank } from '../logic/analytics';

describe('Hub current rank', () => {
  it('uses the projected survivor standing and post-elimination count', () => {
    const projection: TeamProjection = {
      rosterId: 12,
      displayName: 'Projected team',
      projPoints: 123.4,
      eliminated: false,
      projRank: 12,
      projOutOf: 28,
      risk: 'safe',
      starters: [],
    };

    expect(formatProjectedCurrentRank(projection)).toBe('12/28');
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
      risk: 'middle',
      starters: [],
    })).toBe('—');
  });
});
