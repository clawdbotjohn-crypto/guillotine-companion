import { describe, expect, it } from 'vitest';
import { formatDisplayCurrency, formatWholeDollars } from './displayCurrency';

describe('formatDisplayCurrency', () => {
  it('uses at most two decimals and removes floating-point noise', () => {
    expect(formatDisplayCurrency(309.54999999999995)).toBe('$309.55');
    expect(formatDisplayCurrency(218.70000000000002)).toBe('$218.7');
    expect(formatDisplayCurrency(44.12)).toBe('$44.12');
    expect(formatDisplayCurrency(44.1)).toBe('$44.1');
    expect(formatDisplayCurrency(44)).toBe('$44');
  });

  it('formats modeled Max VORP values as whole dollars', () => {
    expect(formatWholeDollars(337)).toBe('$337');
    expect(formatWholeDollars(1235)).toBe('$1,235');
    expect(formatWholeDollars(null, 'Unavailable')).toBe('Unavailable');
  });

  it('is finite and null safe', () => {
    expect(formatDisplayCurrency(null)).toBe('—');
    expect(formatDisplayCurrency(undefined, 'Unavailable')).toBe('Unavailable');
    expect(formatDisplayCurrency(Number.NaN)).toBe('—');
    expect(formatDisplayCurrency(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
