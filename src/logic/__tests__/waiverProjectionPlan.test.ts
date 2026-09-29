import { describe, expect, it } from 'vitest';
import { planWaiverProjectionWeeks } from '../waiverProjectionPlan';

describe('waiver projection planning', () => {
  it('plans weeks 4 through 18 as exactly 15 unique projection coordinates', () => {
    const plan = planWaiverProjectionWeeks(4);
    const coordinates = [
      plan.currentWeek,
      ...(plan.futureRange
        ? Array.from(
            { length: plan.futureRange.endWeek - plan.futureRange.startWeek + 1 },
            (_, index) => plan.futureRange!.startWeek + index,
          )
        : []),
    ];

    expect(coordinates).toEqual(Array.from({ length: 15 }, (_, index) => index + 4));
    expect(new Set(coordinates).size).toBe(15);
  });

  it('does not plan a future range after the week 18 current-week coordinate', () => {
    expect(planWaiverProjectionWeeks(18)).toEqual({
      currentWeek: 18,
      futureRange: null,
    });
  });
});
