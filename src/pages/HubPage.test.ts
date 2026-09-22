import { describe, expect, it } from 'vitest';
import { formatCurrentRank } from '../logic/analytics';

describe('Hub current rank', () => {
  it('uses the post-elimination active-team count as the denominator', () => {
    expect(formatCurrentRank(12, 28)).toBe('12/28');
  });

  it('shows an unavailable rank honestly', () => {
    expect(formatCurrentRank(undefined, 28)).toBe('—');
    expect(formatCurrentRank(1, 0)).toBe('—');
  });
});
