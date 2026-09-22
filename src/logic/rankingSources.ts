import type { ExternalRanking, League } from '../api/types';
import type { PlayerRecord } from '../store/players';
import type { RosPlayerProjection } from './projections';

export type WaiverRankingSource = 'sleeper' | 'fantasycalc' | 'fantasypros';

export const RANKING_SOURCES: Array<{
  key: WaiverRankingSource;
  label: string;
  shortLabel: string;
  metricLabel: string;
}> = [
  { key: 'sleeper', label: 'Sleeper rest-of-season projections', shortLabel: 'Sleeper ROS', metricLabel: 'ROS pts' },
  { key: 'fantasycalc', label: 'FantasyCalc redraft market values', shortLabel: 'FantasyCalc', metricLabel: 'FC value' },
  { key: 'fantasypros', label: 'FantasyPros expert consensus rankings', shortLabel: 'FantasyPros ECR', metricLabel: 'ECR' },
];

export function getReceptionScoring(league: League): number {
  const receptions = league.scoring_settings?.rec;
  if (receptions === 1 || receptions === 0.5) return receptions;
  return 0;
}

export function hasSuperflex(league: League): boolean {
  return league.roster_positions.some((position) =>
    position === 'SUPER_FLEX' || position === 'QB_FLEX');
}

/** Map Sleeper reception scoring to FantasyPros' actual ECR page variants. */
export function getFantasyProsScoring(league: League): 'ppr' | 'half' | 'standard' {
  const receptions = getReceptionScoring(league);
  if (receptions === 1) return 'ppr';
  if (receptions === 0.5) return 'half';
  return 'standard';
}

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+(jr\.?|sr\.?|iii|ii|iv|v)$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Convert an external ranking/value feed into the same complete player map consumed by waiver
 * math. FantasyCalc IDs are preferred; normalized name + position + team is the fallback.
 * `pointsPerWeek` is a 0-30 normalized source score used only for source-relative VoRP math.
 */
export function buildExternalRankingMap(
  rankings: ExternalRanking[],
  players: Map<string, PlayerRecord>,
): { projections: Map<string, RosPlayerProjection>; unmatched: number } {
  const exact = new Map<string, string[]>();
  const namePosition = new Map<string, string[]>();
  for (const [id, player] of players) {
    if (!['QB', 'RB', 'WR', 'TE'].includes(player.position)) continue;
    const name = normalizePlayerName(player.full_name);
    const baseKey = `${name}|${player.position}`;
    const exactKey = `${baseKey}|${(player.team || '').toUpperCase()}`;
    exact.set(exactKey, [...(exact.get(exactKey) ?? []), id]);
    namePosition.set(baseKey, [...(namePosition.get(baseKey) ?? []), id]);
  }

  const usable = rankings.filter((ranking) =>
    ['QB', 'RB', 'WR', 'TE'].includes(ranking.position.toUpperCase())
      && Number.isFinite(ranking.value));
  const sourceValues = usable.map((ranking) => ranking.value);
  const minValue = Math.min(...sourceValues);
  const maxValue = Math.max(...sourceValues);
  const valueRange = Math.max(1, maxValue - minValue);
  const projections = new Map<string, RosPlayerProjection>();
  let unmatched = 0;

  for (const ranking of usable) {
    const position = ranking.position.toUpperCase();
    let playerId = ranking.sleeperId && players.has(ranking.sleeperId)
      ? ranking.sleeperId
      : undefined;
    if (!playerId) {
      const baseKey = `${normalizePlayerName(ranking.name)}|${position}`;
      const exactCandidates = exact.get(`${baseKey}|${(ranking.team || '').toUpperCase()}`) ?? [];
      const baseCandidates = namePosition.get(baseKey) ?? [];
      const candidates = exactCandidates.length === 1 ? exactCandidates : baseCandidates;
      if (candidates.length === 1) playerId = candidates[0];
    }
    if (!playerId) {
      unmatched++;
      continue;
    }

    const normalizedScore = ((ranking.value - minValue) / valueRange) * 30;
    projections.set(playerId, {
      playerId,
      position,
      totalPoints: ranking.value,
      sourceValue: ranking.value,
      sourceRank: ranking.rank,
      pointsPerWeek: normalizedScore,
      projectedWeeks: 0,
    });
  }
  return { projections, unmatched };
}
