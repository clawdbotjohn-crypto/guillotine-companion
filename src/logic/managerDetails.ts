import type { Roster } from '../api';
import type { PlayerRecord } from '../store/players';
import type { ManagerBiddingProfile } from './biddingProfiles';
import type { ProjectedLineupGroupRank } from './analytics';
import { getTeamByeWeek } from './projections';
import { buyerLikelihood } from './managerPredictionDisplay';

export interface ManagerUpcomingBye {
  playerId: string;
  name: string;
  position: string;
  positionRank: number | null;
  byeWeek: number;
  value: number;
}

export interface ManagerTeamNeed {
  position: string;
  rank: number;
  outOf: number;
  tier: 'strong' | 'neutral' | 'weak';
}

export interface ManagerDetailData {
  upcomingByes: ManagerUpcomingBye[];
  teamNeeds: ManagerTeamNeed[];
}

export function teamNeedTier(rank: number, outOf: number): ManagerTeamNeed['tier'] {
  const likelihood = buyerLikelihood(rank, outOf);
  if (likelihood === 'Unlikely') return 'strong';
  if (likelihood === 'Likely') return 'weak';
  return 'neutral';
}

export function buildManagerDetailData({
  profiles,
  rosters,
  players,
  season,
  currentWeek,
  playerValues,
  positionRanks,
  projectedPositionRanks,
}: {
  profiles: readonly ManagerBiddingProfile[];
  rosters: readonly Roster[];
  players: ReadonlyMap<string, PlayerRecord>;
  season: string | undefined;
  currentWeek: number | null;
  playerValues: ReadonlyMap<string, number>;
  positionRanks: ReadonlyMap<string, number>;
  projectedPositionRanks: ReadonlyMap<number, Array<Pick<ProjectedLineupGroupRank, 'group' | 'rank' | 'outOf'>>>;
}): Map<number, ManagerDetailData> {
  const result = new Map<number, ManagerDetailData>();
  for (const profile of profiles) {
    const roster = rosters.find((row) => row.roster_id === profile.managerRosterId);
    const upcomingByes: ManagerUpcomingBye[] = [];
    if (season && currentWeek != null) {
      for (const playerId of roster?.players ?? []) {
        const player = players.get(playerId);
        if (!player) continue;
        const byeWeek = getTeamByeWeek(season, player.team);
        if (byeWeek == null || byeWeek < currentWeek || byeWeek > currentWeek + 2) continue;
        upcomingByes.push({
          playerId,
          name: player.full_name || `${player.first_name} ${player.last_name}`.trim() || playerId,
          position: player.position || 'UNK',
          positionRank: positionRanks.get(playerId) ?? null,
          byeWeek,
          value: playerValues.get(playerId) ?? 0,
        });
      }
      upcomingByes.sort((a, b) => a.byeWeek - b.byeWeek || b.value - a.value || a.name.localeCompare(b.name));
    }

    const teamNeeds = (projectedPositionRanks.get(profile.managerRosterId) ?? []).map((row) => ({
      position: row.group,
      rank: row.rank,
      outOf: row.outOf,
      tier: teamNeedTier(row.rank, row.outOf),
    }));
    result.set(profile.managerRosterId, { upcomingByes, teamNeeds });
  }
  return result;
}
