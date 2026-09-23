import type { TeamProjection } from './analytics';
import type { TeamInfo } from './elimination';

export type FaabTeamStatus = 'champion' | 'runner-up' | 'eliminated' | 'safe' | 'warning' | 'at-risk';

export function getFaabTeamStatus(
  team: TeamInfo | undefined,
  projection: TeamProjection | undefined,
): FaabTeamStatus | null {
  if (team?.isChampion) return 'champion';
  if (team?.isRunnerUp) return 'runner-up';
  if (team?.eliminatedWeek != null) return 'eliminated';
  if (projection?.projPoints != null && !projection.eliminated) return projection.risk;
  return null;
}

export interface FaabSummary {
  min: number | null;
  avg: number | null;
  max: number | null;
}

export function summarizeRemainingFaab(
  entries: readonly { remaining: number }[],
): FaabSummary {
  if (entries.length === 0) return { min: null, avg: null, max: null };
  const values = entries.map((entry) => entry.remaining);
  return {
    min: Math.min(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: Math.max(...values),
  };
}

export function formatFaabCurrency(value: number | null): string {
  return value == null ? '—' : `$${Math.round(value).toLocaleString('en-US')}`;
}
