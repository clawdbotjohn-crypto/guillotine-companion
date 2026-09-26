import { describe, expect, it } from 'vitest';
import { faabQuartile, faabQuartileLabel, rankQuartile } from '../rankingQuartiles';

describe('shared ranking quartiles', () => {
  it('uses top and bottom 25% with a neutral middle', () => {
    expect(Array.from({ length: 8 }, (_, index) => rankQuartile(index + 1, 8))).toEqual([
      'top', 'top', 'middle', 'middle', 'middle', 'middle', 'bottom', 'bottom',
    ]);
  });

  it('is deterministic for boundary ties, invalid ranks, and small leagues', () => {
    expect(rankQuartile(2, 5)).toBe('top');
    expect(rankQuartile(4, 5)).toBe('bottom');
    expect(rankQuartile(2, 3)).toBe('middle');
    expect(rankQuartile(1, 2)).toBe('top');
    expect(rankQuartile(2, 2)).toBe('bottom');
    expect(rankQuartile(1, 1)).toBe('middle');
    expect(rankQuartile(null, null)).toBe('middle');
    // Competition-rank ties pass the same rank and therefore always share the same band.
    expect(rankQuartile(2, 8)).toBe(rankQuartile(2, 8));
  });
});

describe('active-manager FAAB quartiles', () => {
  it('uses active-manager boundaries, shares tied boundaries, and exposes non-color labels', () => {
    const amounts = [1000, 800, 800, 500, 300, 100, 0, 0];
    expect(faabQuartile(1000, amounts)).toBe('top');
    expect(faabQuartile(800, amounts)).toBe('top');
    expect(faabQuartile(500, amounts)).toBe('middle');
    expect(faabQuartile(100, amounts)).toBe('middle');
    expect(faabQuartile(0, amounts)).toBe('bottom');
    expect(faabQuartile(100, [1000, 800, 500, 300, 100, 100, 100, 50])).toBe('bottom');
    expect(faabQuartileLabel('top')).toBe('Top FAAB quartile');
    expect(faabQuartileLabel('middle')).toBe('Middle FAAB quartiles');
    expect(faabQuartileLabel('bottom')).toBe('Bottom FAAB quartile');
  });

  it('keeps a positive maximum green and exact zero red in tiny or tied leagues', () => {
    expect(faabQuartile(50, [50])).toBe('top');
    expect(faabQuartile(0, [0])).toBe('bottom');
    expect(faabQuartile(50, [50, 50])).toBe('top');
    expect(faabQuartile(100, [100, 10])).toBe('top');
    expect(faabQuartile(10, [100, 10])).toBe('bottom');
  });
});
