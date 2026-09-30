import { useMemo } from 'react';
import type { League, NflState } from '../api/types';
import {
  useFantasyCalcRankings,
  useFantasyProsRankings,
  useRestOfSeasonProjectionWeeks,
} from '../api';
import {
  buildExternalRankingMap,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  sumRestOfSeasonProjections,
  type WaiverRankingSource,
} from '../logic';
import type { PlayerRecord } from '../store/players';

/** One shared, honest source model for Waivers and Hub. Sources are never substituted. */
export function usePlayerValues({
  league,
  nflState,
  players,
  source,
}: {
  league: League | undefined;
  nflState: NflState | undefined;
  players: Map<string, PlayerRecord> | undefined;
  source: WaiverRankingSource;
}) {
  const currentSeason = !!league && !!nflState && league.season === nflState.season;
  const startWeek = currentSeason ? getRestOfSeasonStartWeek(nflState) : null;
  const sleeperQuery = useRestOfSeasonProjectionWeeks(
    league?.season ?? null,
    startWeek,
    18,
    currentSeason && startWeek != null && startWeek <= 18,
  );
  const fantasyCalcQuery = useFantasyCalcRankings(league, source === 'fantasycalc');
  const fantasyProsQuery = useFantasyProsRankings(league, source === 'fantasypros');

  const sleeperValues = useMemo(() => {
    if (!players || !league || !sleeperQuery.data) return null;
    return sumRestOfSeasonProjections(
      sleeperQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      (id) => players.get(id)?.position,
    );
  }, [players, league, sleeperQuery.data]);

  const values = useMemo(() => {
    if (!players || !league) return null;
    if (source === 'sleeper') return sleeperValues;
    const response = source === 'fantasycalc' ? fantasyCalcQuery.data : fantasyProsQuery.data;
    return response ? buildExternalRankingMap(response.players, players).projections : null;
  }, [players, league, source, sleeperValues, fantasyCalcQuery.data, fantasyProsQuery.data]);

  const selectedQuery = source === 'sleeper'
    ? sleeperQuery
    : source === 'fantasycalc'
      ? fantasyCalcQuery
      : fantasyProsQuery;
  let unavailableReason: string | null = null;
  if (source === 'sleeper' && league && nflState && !currentSeason) {
    unavailableReason = `Sleeper ROS values are unavailable for historical season ${league.season}.`;
  } else if (source === 'sleeper' && startWeek != null && startWeek > 18) {
    unavailableReason = 'The current NFL season has no remaining Sleeper projection weeks.';
  } else if (selectedQuery.error) {
    unavailableReason = selectedQuery.error instanceof Error
      ? selectedQuery.error.message
      : 'The selected player value source could not be loaded.';
  } else if (!selectedQuery.isLoading && values?.size === 0) {
    unavailableReason = 'The selected source returned no usable matched player values.';
  }

  return {
    values,
    sleeperValues,
    startWeek,
    isLoading: source === 'sleeper' && !nflState ? true : selectedQuery.isLoading,
    isFetching: sleeperQuery.isFetching || selectedQuery.isFetching,
    error: selectedQuery.error,
    unavailableReason,
    refetch: selectedQuery.refetch,
  };
}
