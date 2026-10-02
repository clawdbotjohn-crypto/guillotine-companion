import type { WaiverRankingSource } from './rankingSources';

const NATIVE_VALUE_NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Format selected Waivers ranking data in its native units, never as league dollars. */
export function formatWaiverSourceMetric(
  row: { sourceValue: number; sourceRank?: number },
  source: WaiverRankingSource,
): { label: string; display: string } {
  if (source === 'fantasypros') {
    return {
      label: 'ECR #',
      display: row.sourceRank != null && Number.isFinite(row.sourceRank) ? `${row.sourceRank}` : 'Unavailable',
    };
  }
  if (source === 'fantasycalc') {
    return {
      label: 'FC value',
      display: Number.isFinite(row.sourceValue) ? NATIVE_VALUE_NUMBER.format(row.sourceValue) : 'Unavailable',
    };
  }
  return {
    label: 'ROS pts',
    display: Number.isFinite(row.sourceValue) ? NATIVE_VALUE_NUMBER.format(row.sourceValue) : 'Unavailable',
  };
}
