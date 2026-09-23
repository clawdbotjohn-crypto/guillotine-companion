import { describe, expect, it } from 'vitest';
import { getByeProximity } from '../byeProximity';

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
});
