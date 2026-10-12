import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useAllMatchups,
  useCurrentLiveMatchups,
  useLeague,
  useLeagueUsers,
  useNflState,
  useRosters,
  useWeeklyGames,
  useWeeklyProjections,
} from '../api';
import { TeamScoringDialog } from '../components/TeamScoringDialog';
import { Card, Skeleton, StatusBadge } from '../components/ui';
import {
  buildLiveScoringModel,
  buildWeeklyScoredPlayers,
  computeEliminations,
  formatLiveUpdatedAt,
  getCompletedLeagueWeek,
  getLiveDataUpdatedAt,
  getLiveFreshness,
  getProjectionScoring,
  hasCompleteMatchupCoverage,
  getUpcomingPlayingWeek,
  type LiveScoringModel,
  type LiveTeamScore,
} from '../logic';
import { useAppStore, usePlayers } from '../store';
import { getPlayerPosition } from '../store/players';

export function ScoringWeekSelector({
  week,
  latestWeek,
  onChange,
}: {
  week: number;
  latestWeek: number;
  onChange: (week: number) => void;
}) {
  const weeks = Array.from({ length: latestWeek }, (_, index) => latestWeek - index);
  return (
    <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777aa5]">
      <span>Scoring week</span>
      <select
        aria-label="Scoring week"
        value={week}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 rounded-lg border border-[#30365e] bg-[#0d1126] px-3 font-['Space_Mono'] text-xs text-[#e2e2f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]"
      >
        {weeks.map((value) => <option key={value} value={value}>Week {value}</option>)}
      </select>
    </label>
  );
}

export function ScoresBoard({
  model,
  currentRosterId,
  onSelectTeam,
}: {
  model: LiveScoringModel;
  currentRosterId: number | null;
  onSelectTeam: (team: LiveTeamScore) => void;
}) {
  return (
    <section aria-label="Team scores" className="space-y-2">
      {model.teams.map((team) => (
        <button
          key={team.rosterId}
          type="button"
          onClick={() => onSelectTeam(team)}
          aria-label={`Open scoring for ${team.displayName}`}
          className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] ${
            team.eliminated
              ? 'border-[#352739] bg-[#20151d]/55 opacity-70 hover:opacity-90'
              : team.rosterId === currentRosterId
                ? 'border-[#545aa0] bg-[#171a3b] hover:border-[#7379cf]'
                : 'border-[#272c51] bg-[rgba(14,16,37,0.82)] hover:border-[#4a4f8c]'
          }`}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-[#f0f0ff]">{team.displayName}</span>
                {team.rosterId === currentRosterId && <span className="text-[9px] font-bold uppercase tracking-wider text-[#8d93de]">You</span>}
              </span>
              <span className="mt-1.5 block text-[10px] text-[#777aa5]">
                Started <span className="font-['Space_Mono'] tabular-nums text-[#aaaac8]">{team.startersStarted}/{team.starterCount}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-right">
                <span className="block font-['Space_Mono'] text-xl font-bold tabular-nums text-[#f0f0ff]">{team.officialPoints.toFixed(1)}</span>
                <span className="block font-['Space_Mono'] text-[10px] tabular-nums text-[#8d93de]">Proj. {team.projectedFinal.toFixed(1)}</span>
              </span>
              <span className="flex min-w-[4.7rem] flex-col items-end gap-1">
                {team.eliminated ? (
                  <StatusBadge status="eliminated" />
                ) : team.standing ? (
                  <>
                    <span className="font-['Space_Mono'] text-[10px] tabular-nums text-[#aaaac8]">{team.standing.rank}/{model.activeTeamCount}</span>
                    <StatusBadge status={team.standing.risk} />
                  </>
                ) : null}
              </span>
            </span>
          </span>
        </button>
      ))}
    </section>
  );
}

export function ScoresPage() {
  const navigate = useNavigate();
  const { leagueId, leagueName, rosterId } = useAppStore();
  const leagueQuery = useLeague(leagueId);
  const usersQuery = useLeagueUsers(leagueId);
  const rostersQuery = useRosters(leagueId);
  const playersQuery = usePlayers();
  const league = leagueQuery.data;
  const users = usersQuery.data;
  const rosters = rostersQuery.data;
  const players = playersQuery.data;
  const nflStateQuery = useNflState();
  const completedWeek = getCompletedLeagueWeek(league, nflStateQuery.data);
  const playingWeek = getUpcomingPlayingWeek(league, nflStateQuery.data);
  const latestWeek = playingWeek ?? completedWeek ?? 0;
  const [requestedWeek, setRequestedWeek] = useState<number | null>(null);
  const selectedWeek = latestWeek > 0
    ? Math.min(Math.max(1, requestedWeek ?? latestWeek), latestWeek)
    : null;

  const priorMatchupsQuery = useAllMatchups(
    leagueId,
    selectedWeek == null ? null : Math.max(0, selectedWeek - 1),
  );
  const weeklyProjectionQuery = useWeeklyProjections(
    league?.season ?? null,
    selectedWeek,
    selectedWeek != null,
  );
  const weeklyGamesQuery = useWeeklyGames(
    league?.season ?? null,
    selectedWeek,
    selectedWeek != null,
  );
  const scoringMatchupsQuery = useCurrentLiveMatchups(
    leagueId,
    selectedWeek,
    selectedWeek != null,
    weeklyGamesQuery.data,
  );

  const matchupCoverageComplete = !!rosters
    && !!scoringMatchupsQuery.data
    && hasCompleteMatchupCoverage(rosters, scoringMatchupsQuery.data);

  const model = useMemo(() => {
    if (
      selectedWeek == null
      || !rosters
      || !users
      || !players
      || !priorMatchupsQuery.data
      || !scoringMatchupsQuery.data
      || !weeklyGamesQuery.data
      || !weeklyProjectionQuery.data
      || !matchupCoverageComplete
    ) return null;
    const elimination = computeEliminations(priorMatchupsQuery.data, rosters, users);
    const weeklyScoredPlayers = buildWeeklyScoredPlayers(
      weeklyProjectionQuery.data,
      getProjectionScoring(league?.scoring_settings?.rec),
      getPlayerPosition,
    );
    return buildLiveScoringModel({
      rosters,
      matchups: scoringMatchupsQuery.data,
      weeklyProjections: weeklyScoredPlayers,
      games: weeklyGamesQuery.data,
      players,
      elimination,
      lineupPositions: league?.roster_positions,
    });
  }, [
    selectedWeek,
    rosters,
    users,
    players,
    priorMatchupsQuery.data,
    scoringMatchupsQuery.data,
    weeklyGamesQuery.data,
    weeklyProjectionQuery.data,
    matchupCoverageComplete,
    league,
  ]);

  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);
  const selectedTeam = model?.teams.find((team) => team.rosterId === selectedRosterId) ?? null;
  const updatedAt = model
    ? getLiveDataUpdatedAt(scoringMatchupsQuery.dataUpdatedAt, weeklyGamesQuery.dataUpdatedAt)
    : null;
  const freshness = getLiveFreshness(updatedAt);
  const isLoading = playersQuery.isLoading
    || leagueQuery.isLoading
    || usersQuery.isLoading
    || rostersQuery.isLoading
    || nflStateQuery.isLoading
    || priorMatchupsQuery.isLoading
    || scoringMatchupsQuery.isLoading
    || weeklyGamesQuery.isLoading
    || weeklyProjectionQuery.isLoading;
  const isRefreshing = playersQuery.isFetching
    || leagueQuery.isFetching
    || usersQuery.isFetching
    || rostersQuery.isFetching
    || nflStateQuery.isFetching
    || priorMatchupsQuery.isFetching
    || scoringMatchupsQuery.isFetching
    || weeklyGamesQuery.isFetching
    || weeklyProjectionQuery.isFetching;
  const hasEndpointError = playersQuery.isError
    || leagueQuery.isError
    || usersQuery.isError
    || rostersQuery.isError
    || nflStateQuery.isError
    || priorMatchupsQuery.isError
    || scoringMatchupsQuery.isError
    || (!!scoringMatchupsQuery.data && !!rosters && !matchupCoverageComplete)
    || weeklyGamesQuery.isError
    || weeklyProjectionQuery.isError;
  const retry = async () => {
    await Promise.all([
      playersQuery.refetch(),
      leagueQuery.refetch(),
      usersQuery.refetch(),
      rostersQuery.refetch(),
      nflStateQuery.refetch(),
      priorMatchupsQuery.refetch(),
      scoringMatchupsQuery.refetch(),
      weeklyGamesQuery.refetch(),
      weeklyProjectionQuery.refetch(),
    ]);
  };

  if (!leagueId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        <p className="text-sm text-[#777aa5]">No league selected</p>
        <button type="button" onClick={() => navigate('/')} className="mt-3 text-sm text-[#818cf8] underline">Select a league</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff]">Scores</h1>
          <p className="mt-1 truncate text-xs text-[#777aa5]">{leagueName}</p>
        </div>
        {selectedWeek != null && latestWeek > 0 && (
          <ScoringWeekSelector week={selectedWeek} latestWeek={latestWeek} onChange={setRequestedWeek} />
        )}
      </div>

      {model && (
        <div className="mb-3 flex items-center justify-between gap-3 px-1 text-[10px] text-[#777aa5]">
          <span>
            {model.activeTeamCount} active · {model.teams.length} total
            {model.projectedCutline != null && ` · Cutline ${model.projectedCutline.toFixed(1)}`}
          </span>
          <span className={freshness === 'stale' ? 'text-[#f59e0b]' : ''}>
            {formatLiveUpdatedAt(updatedAt)}{freshness === 'stale' ? ' · Stale' : ''}
          </span>
        </div>
      )}

      {isLoading && !model ? (
        <div className="space-y-2" aria-label="Loading team scores">
          {[1, 2, 3, 4, 5].map((key) => <Card key={key} hover={false} className="p-4"><Skeleton lines={2} /></Card>)}
        </div>
      ) : !model ? (
        <Card hover={false} className="p-5 text-center">
          <h2 className="text-sm font-semibold text-[#f0f0ff]">Scores unavailable</h2>
          <p className="mt-2 text-xs text-[#777aa5]">
            {latestWeek <= 0
              ? 'There is no completed or current scoring week yet.'
              : hasEndpointError
                ? 'One or more Sleeper scoring requests failed.'
                : 'Sleeper has not returned scoring data for this week.'}
          </p>
          {latestWeek > 0 && (
            <button
              type="button"
              onClick={() => void retry()}
              disabled={isRefreshing}
              className="mx-auto mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#343961] px-4 text-xs font-semibold text-[#a5b4fc] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {isRefreshing ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </Card>
      ) : (
        <ScoresBoard
          model={model}
          currentRosterId={rosterId}
          onSelectTeam={(team) => setSelectedRosterId(team.rosterId)}
        />
      )}

      <TeamScoringDialog
        open={selectedTeam != null}
        onClose={() => setSelectedRosterId(null)}
        team={selectedTeam}
        model={model}
        week={selectedWeek}
      />
    </div>
  );
}
