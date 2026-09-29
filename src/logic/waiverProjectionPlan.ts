export interface WaiverProjectionPlan {
  currentWeek: number | null;
  futureRange: { startWeek: number; endWeek: number } | null;
}

export function planWaiverProjectionWeeks(
  currentWeek: number | null,
  endWeek = 18,
): WaiverProjectionPlan {
  return {
    currentWeek,
    futureRange: currentWeek != null && currentWeek < endWeek
      ? { startWeek: currentWeek + 1, endWeek }
      : null,
  };
}
