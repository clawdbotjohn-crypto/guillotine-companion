import { useState, useCallback } from 'react';
import {
  fetchLeague, fetchUsers, fetchRosters, fetchMatchups, fetchTransactions,
  fetchDraftPicks, fetchPlayers,
} from './api';
import type { League, User, Roster, Matchup, Transaction, DraftPick } from './api';
import { buildTeamMap, computeEliminations, extractBids } from './logic';
import type { WeekData, TeamInfo, BidInfo } from './logic';

export interface LeagueData {
  league: League;
  users: User[];
  rosters: Roster[];
  teams: Map<number, TeamInfo>;
  weekData: WeekData[];
  elimOrder: Map<number, number>;
  bids: BidInfo[];
  draftPicks: DraftPick[];
  weekMatchups: Map<number, Matchup[]>;
}

export function useLeagueLoader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeagueData | null>(null);
  const [progress, setProgress] = useState('');

  const load = useCallback(async (leagueId: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      setProgress('Fetching league info...');
      const league = await fetchLeague(leagueId);

      setProgress('Loading player database...');
      await fetchPlayers();

      setProgress('Fetching users & rosters...');
      const [users, rosters] = await Promise.all([
        fetchUsers(leagueId),
        fetchRosters(leagueId),
      ]);

      const totalTeams = rosters.length;
      // NFL regular season = 18 weeks max, but most guillotines run 17
      const maxWeek = 17;

      setProgress('Fetching weekly matchups...');
      const weekMatchups = new Map<number, Matchup[]>();
      for (let w = 1; w <= maxWeek; w++) {
        const m = await fetchMatchups(leagueId, w);
        if (m && m.length > 0 && m.some(x => x.points != null && x.points > 0)) {
          weekMatchups.set(w, m);
        } else {
          break; // No more data
        }
      }

      setProgress('Fetching transactions...');
      const weekTransactions = new Map<number, Transaction[]>();
      for (let w = 1; w <= maxWeek; w++) {
        if (!weekMatchups.has(w)) break;
        const t = await fetchTransactions(leagueId, w);
        weekTransactions.set(w, t || []);
      }

      setProgress('Fetching draft...');
      let draftPicks: DraftPick[] = [];
      if (league.draft_id) {
        draftPicks = await fetchDraftPicks(league.draft_id);
      }

      setProgress('Computing eliminations...');
      const teams = buildTeamMap(rosters, users);
      const { weekData, elimOrder } = computeEliminations(weekMatchups, totalTeams, maxWeek);

      // Update teams with elimination data
      for (const [rosterId, week] of elimOrder.entries()) {
        const team = teams.get(rosterId);
        if (team) team.eliminatedWeek = week;
      }

      const bids = extractBids(weekTransactions);

      setData({ league, users, rosters, teams, weekData, elimOrder, bids, draftPicks, weekMatchups });
      setProgress('');
    } catch (e: any) {
      setError(e.message || 'Failed to load league');
    } finally {
      setLoading(false);
    }
  }, []);

  return { load, loading, error, data, progress };
}
