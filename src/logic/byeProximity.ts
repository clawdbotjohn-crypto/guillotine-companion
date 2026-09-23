export type ByeProximity = 'urgent' | 'soon' | 'passed' | 'neutral';

export function getByeProximity(byeWeek: number | null | undefined, currentWeek: number | null | undefined): ByeProximity {
  if (!Number.isInteger(byeWeek) || !Number.isInteger(currentWeek) || byeWeek! < 1 || currentWeek! < 1) return 'neutral';
  const distance = byeWeek! - currentWeek!;
  if (distance < 0) return 'passed';
  if (distance <= 1) return 'urgent';
  if (distance <= 3) return 'soon';
  return 'neutral';
}

export function byeProximityClass(proximity: ByeProximity): string {
  if (proximity === 'urgent') return 'text-[#f43f5e]';
  if (proximity === 'soon') return 'text-[#f59e0b]';
  if (proximity === 'passed') return 'text-[#10b981]';
  return 'text-[#6b6e99]';
}
