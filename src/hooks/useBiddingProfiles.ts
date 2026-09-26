import { useMemo } from 'react';
import {
  useAllTransactions,
  useProjectionSnapshots,
  type League,
  type Roster,
} from '../api';
import {
  buildManagerBiddingProfiles,
  calculateHistoricalBaseline,
  classifyCanonicalBidEvents,
  getProjectionScoring,
  selectTopCanonicalBids,
  type HistoricalBaselineEvidence,
} from '../logic';

export function useBiddingProfiles({
  leagueId,
  league,
  rosters,
  players,
}: {
  leagueId: string | null;
  league: League | undefined;
  rosters: Roster[] | undefined;
  players: ReadonlyMap<string, { position: string }> | undefined;
}) {
  const transactionsQuery = useAllTransactions(leagueId, 18);
  const canonicalBidEvents = useMemo(() => {
    if (!transactionsQuery.data || !league) return [];
    return classifyCanonicalBidEvents(
      transactionsQuery.data,
      league.settings?.waiver_budget ?? 1000,
    );
  }, [transactionsQuery.data, league]);
  const selectedBidEvents = useMemo(
    () => selectTopCanonicalBids(canonicalBidEvents),
    [canonicalBidEvents],
  );
  const decisionWeeks = useMemo(() => [...new Set(selectedBidEvents
    .map((event) => event.decisionWeek)
    .filter((week) => week >= 1 && week <= 18))], [selectedBidEvents]);
  const snapshotSeason = league && /^\d{4}$/.test(league.season) ? Number(league.season) : null;
  const snapshotQuery = useProjectionSnapshots(
    snapshotSeason,
    decisionWeeks,
    selectedBidEvents.length > 0,
  );
  const historicalEvidence = useMemo(() => {
    const evidence = new Map<string, HistoricalBaselineEvidence>();
    if (!league || !players) return evidence;
    const scoring = getProjectionScoring(league.scoring_settings?.rec);
    for (const event of selectedBidEvents) {
      const snapshot = snapshotQuery.data?.snapshots.get(event.decisionWeek);
      const snapshotError = snapshotQuery.data?.errors.get(event.decisionWeek);
      if (event.decisionWeek < 1 || event.decisionWeek > 18) {
        evidence.set(event.transactionId, {
          baseline: null,
          provenance: null,
          captureProvenance: null,
          matchesRequestedDecisionWeek: null,
          snapshotDecisionWeek: null,
          unavailableReason: `Decision Week ${event.decisionWeek} is outside the supported NFL projection calendar.`,
        });
      } else if (snapshot) {
        evidence.set(event.transactionId, calculateHistoricalBaseline(
          event,
          snapshot,
          league,
          scoring,
          (playerId) => players.get(playerId)?.position,
        ));
      } else if (snapshotError) {
        evidence.set(event.transactionId, {
          baseline: null,
          provenance: null,
          captureProvenance: null,
          matchesRequestedDecisionWeek: null,
          snapshotDecisionWeek: null,
          unavailableReason: `Decision Week ${event.decisionWeek} snapshot read failed: ${snapshotError.message}`,
        });
      }
    }
    return evidence;
  }, [league, players, selectedBidEvents, snapshotQuery.data]);
  const profiles = useMemo(() => buildManagerBiddingProfiles(
    rosters?.map((roster) => roster.roster_id) ?? [],
    selectedBidEvents,
    historicalEvidence,
  ), [rosters, selectedBidEvents, historicalEvidence]);

  return {
    profiles,
    hasHistory: selectedBidEvents.length > 0,
    isLoading: transactionsQuery.isLoading
      || (selectedBidEvents.length > 0 && snapshotQuery.isLoading),
    error: (transactionsQuery.error instanceof Error ? transactionsQuery.error : null)
      ?? snapshotQuery.error,
    partialErrorCount: snapshotQuery.data?.errors.size ?? 0,
    retry: () => {
      void transactionsQuery.refetch();
      void snapshotQuery.refetch();
    },
  };
}
