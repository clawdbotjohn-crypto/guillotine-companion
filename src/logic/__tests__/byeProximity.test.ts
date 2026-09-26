import { describe, expect, it } from 'vitest';
import { getByeProximity, isUpcomingByeWeek, UPCOMING_BYE_WINDOW_WEEKS } from '../byeProximity';

describe('bye proximity', () => {
  it.each([
    [5, 6, 'passed'],
    [6, 6, 'urgent'],
    [7, 6, 'urgent'],
    [8, 6, 'soon'],
    [9, 6, 'soon'],
    [10, 6, 'neutral'],
    [null, 6, 'neutral'],
    [8, null, 'neutral'],
  ] as const)('classifies bye %s from week %s as %s', (bye, current, expected) => {
    expect(getByeProximity(bye, current)).toBe(expected);
  });

  it('shares one exact current-week-plus-next-two horizon', () => {
    expect(UPCOMING_BYE_WINDOW_WEEKS).toBe(2);
    expect(isUpcomingByeWeek(4, 5)).toBe(false);
    expect(isUpcomingByeWeek(5, 5)).toBe(true);
    expect(isUpcomingByeWeek(6, 5)).toBe(true);
    expect(isUpcomingByeWeek(7, 5)).toBe(true);
    expect(isUpcomingByeWeek(8, 5)).toBe(false);
    expect(isUpcomingByeWeek(18, 17)).toBe(true);
    expect(isUpcomingByeWeek(19, 17)).toBe(false);
    expect(isUpcomingByeWeek(5, null)).toBe(false);
  });
});
