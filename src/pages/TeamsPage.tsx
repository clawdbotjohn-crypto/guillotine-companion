// Teams page — rethought per John feedback (2026-09-22).
// - Rank teams by PROJECTED best-lineup points for the coming week
// - Show risk (safe / warning / at-risk) from projection
// - Per team: historical points rank + position-group scoring breakdown (FLEX its own category)
// Toggle between Projected and Historical ordering.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, usePlayers } from '../store';
import { getPlayerPosition } from '../store/players';
import {
  useLeague,
  useLeagueUsers,
  useRosters,
  useAllMatchups,
  useLeagueHistory,
  useNflState,
  useWeeklyProjections,
} from '../api';
import {
  buildWeeklyScoredPlayers,
  computeEliminations,
  getActiveRosterIds,
  getCompletedLeagueWeek,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  projectAllTeams,
  computePositionGroupRanks,
  computeProjectedLineupGroupRanks,
  computeHistoricalRanks,
  orderTeamProjections,
  type HistoricalRank,
  type PosGroupRank,
  type TeamProjection,
} from '../logic';
import { Card, Skeleton, StatusBadge } from '../components/ui';
import { TeamBidProfiles } from '../components/ManagerBiddingProfiles';
import { buildManagerDetailData } from '../logic/managerDetails';
import { useBiddingProfiles } from '../hooks/useBiddingProfiles';
import { getPlayerName } from '../store/players';
import { SeasonPicker } from '../components/SeasonPicker';
import { useSwitchSeason } from '../hooks/useSwitchSeason';
import { ChevronRight, ShieldCheck, ShieldAlert, Shield, TriangleAlert } from 'lucide-react';
import { filterTeamsByEliminatedVisibility } from '../logic/teamVisibility';
import { getTeamPositionGroups, type TeamOrder } from '../logic/teamPositionGroups';

const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF'];

function rankColor(rank: number, outOf: number): string {
  if (outOf <= 1) return '#a5b4fc';
  const pct = (rank - 1) / (outOf - 1);
  if (pct <= 0.25) return '#10b981';
  if (pct <= 0.5) return '#a5b4fc';
  if (pct <= 0.75) return '#f59e0b';
  return '#f43f5e';
}

export function EliminatedTeamsVisibilityToggle({
  eliminatedCount,
}: {
  eliminatedCount: number;
}) {
  const showEliminatedTeams = useAppStore((state) => state.showEliminatedTeams);
  const setShowEliminatedTeams = useAppStore((state) => state.setShowEliminatedTeams);

  return (
    <label
      className={`mb-3 flex w-fit items-center gap-2 text-[11px] text-[#a5b4fc]
        ${eliminatedCount === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        checked={showEliminatedTeams}
        disabled={eliminatedCount === 0}
        onChange={(event) => setShowEliminatedTeams(event.target.checked)}
        className="h-4 w-4 rounded border-[#4a4d77] bg-[#0a0d1a] accent-[#6366f1]"
      />
      <span>Show eliminated teams ({eliminatedCount})</span>
    </label>
  );
}

export function TeamStandingDetails({
  team,
  historical,
  orderBy,
}: {
  team: TeamProjection;
  historical: HistoricalRank | undefined;
  orderBy: TeamOrder;
}) {
  if (team.eliminated) return <StatusBadge status="eliminated" />;
  if (orderBy === 'projected' && team.projPoints == null) {
    return <span className="text-[10px] text-[#6b6e99]">Sleeper projection unavailable</span>;
  }

  const status = orderBy === 'projected' ? team.risk : historical?.risk ?? 'warning';
  const rank = orderBy === 'projected' ? team.projRank : historical?.rank;
  const outOf = orderBy === 'projected' ? team.projOutOf : historical?.outOf;
  const points = orderBy === 'projected' ? team.projPoints : historical?.totalPoints;
  const label = orderBy === 'projected' ? 'proj' : 'hist';

  return (
    <>
      {rank != null && outOf != null && (
        <span
          className="font-['Space_Mono'] text-[10px] text-[#a5b4fc] tabular-nums"
          data-testid="current-team-standing"
        >
          {label} #{rank}/{outOf}
          {points != null && ` · ${points.toFixed(1)} pts`}
        </span>
      )}
      <StatusBadge status={status} />
    </>
  );
}

export function TeamsPage() {
  const navigate = useNavigate();
  const {
    leagueId,
    leagueName,
    leagueSeason,
    rootLeagueId,
    rosterId: myRosterId,
    showEliminatedTeams,
  } = useAppStore();
  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const { data: players, isLoading: playersLoading } = usePlayers();
  const nflStateQuery = useNflState();
  const completedWeek = getCompletedLeagueWeek(league, nflStateQuery.data);
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, completedWeek);
  const { data: leagueHistory, isLoading: historyLoading } = useLeagueHistory(rootLeagueId);
  const projectionWeek = league && nflStateQuery.data && league.season === nflStateQuery.data.season
    ? getRestOfSeasonStartWeek(nflStateQuery.data)
    : null;
  const weeklyProjectionQuery = useWeeklyProjections(
    league?.season ?? null,
    projectionWeek,
    projectionWeek != null,
  );
  const handleSwitchSeason = useSwitchSeason();
  const biddingProfiles = useBiddingProfiles({ leagueId, league, rosters, players });

  const [view, setView] = useState<'teams' | 'profiles'>('teams');
  const [orderBy, setOrderBy] = useState<TeamOrder>('projected');
  const [expanded, setExpanded] = useState<number | null>(null);

  const seasons = (leagueHistory || [])
    .map((l) => ({ leagueId: l.league_id, season: l.season, name: l.name }))
    .reverse();

  const isLoading = matchupsLoading || playersLoading;

  const model = useMemo(() => {
    if (!matchups || !rosters || !users) return null;
    const elim = computeEliminations(matchups, rosters, users);
    const weeklyScoredPlayers = weeklyProjectionQuery.data
      ? buildWeeklyScoredPlayers(
          weeklyProjectionQuery.data,
          getProjectionScoring(league?.scoring_settings?.rec),
          getPlayerPosition,
        )
      : null;
    const projections = projectAllTeams(rosters, weeklyScoredPlayers, league, elim);
    const activeRosterIds = getActiveRosterIds(elim);
    const historicalPosRanks = computePositionGroupRanks(matchups, league, activeRosterIds);
    const projectedPosRanks = computeProjectedLineupGroupRanks(
      projections,
      weeklyScoredPlayers,
      league,
    );
    const histRanks = computeHistoricalRanks(elim);
    return { elim, projections, weeklyScoredPlayers, historicalPosRanks, projectedPosRanks, histRanks };
  }, [matchups, rosters, users, league, weeklyProjectionQuery.data]);

  if (!leagueId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b6e99] text-sm">Select a league first</p>
      </div>
    );
  }

  if (isLoading || !model) {
    return (
      <div className="px-6 py-8 pb-24 max-w-lg mx-auto space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} hover={false} className="p-4"><Skeleton lines={1} /></Card>
        ))}
      </div>
    );
  }

  const { elim, projections, weeklyScoredPlayers, historicalPosRanks, projectedPosRanks, histRanks } = model;
  const hasScores = elim.weeks.length > 0;
  const scoredPlayers = weeklyScoredPlayers ?? new Map();
  const playerValues = new Map<string, number>(
    [...scoredPlayers.values()].map((row) => [row.playerId, row.points]),
  );
  const playerPositionRanks = new Map<string, number>();
  const byPosition = new Map<string, Array<{ playerId: string; position: string; points: number }>>();
  for (const row of scoredPlayers.values()) {
    const group = byPosition.get(row.position) ?? [];
    group.push(row);
    byPosition.set(row.position, group);
  }
  for (const group of byPosition.values()) {
    group.sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId))
      .forEach((row, index) => playerPositionRanks.set(row.playerId, index + 1));
  }
  const managerDetails = buildManagerDetailData({
    profiles: biddingProfiles.profiles,
    rosters: rosters!,
    players: players!,
    season: league?.season,
    currentWeek: nflStateQuery.data?.week ?? null,
    playerValues,
    positionRanks: playerPositionRanks,
    projectedPositionRanks: projectedPosRanks.byRosterId,
  });

  const rows = orderTeamProjections(projections, histRanks, orderBy);
  const eliminatedCount = projections.filter((team) => team.eliminated).length;
  const visibleRows = filterTeamsByEliminatedVisibility(rows, showEliminatedTeams);

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-1">
        Teams
      </h1>
      <p className="text-xs text-[#6b6e99] mb-4">
        {leagueName} · {elim.activeTeamCount} active · {rows.length} total
      </p>

      <SeasonPicker
        seasons={seasons}
        currentSeason={leagueSeason || ''}
        onSelect={handleSwitchSeason}
        isLoading={historyLoading}
      />

      <EliminatedTeamsVisibilityToggle eliminatedCount={eliminatedCount} />

      <div className="mb-4 grid grid-cols-2 rounded-lg bg-[#0a0d1a] p-1" aria-label="Teams sections">
        <button type="button" onClick={() => setView('teams')} className={`min-h-10 rounded-md text-[11px] font-semibold uppercase tracking-wider ${view === 'teams' ? 'bg-[#252957] text-white' : 'text-[#6b6e99]'}`}>Teams</button>
        <button type="button" onClick={() => setView('profiles')} className={`min-h-10 rounded-md text-[11px] font-semibold uppercase tracking-wider ${view === 'profiles' ? 'bg-[#252957] text-white' : 'text-[#6b6e99]'}`}>Bid Profiles</button>
      </div>

      {view === 'profiles' ? (
        <TeamBidProfiles
          profiles={biddingProfiles.profiles}
          rosters={rosters!}
          users={users!}
          initialFaab={league?.settings?.waiver_budget ?? 1000}
          activeRosterIds={getActiveRosterIds(elim)}
          isLoading={biddingProfiles.isLoading}
          error={biddingProfiles.error}
          onRetry={biddingProfiles.retry}
          getPlayerName={getPlayerName}
          detailsByRosterId={managerDetails}
        />
      ) : (<>
      {/* Order toggle */}
      {hasScores && (
        <div className="flex gap-1 bg-[#0a0d1a] rounded-lg p-1 mb-2 w-fit">
          {(['projected', 'historical'] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrderBy(o)}
              className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-all
                ${orderBy === o
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'text-[#4a4d77] hover:text-[#6b6e99]'
                }`}
            >
              {o === 'projected' ? 'Projected' : 'Historical'}
            </button>
          ))}
        </div>
      )}

      {hasScores && orderBy === 'projected' && (
        <p className="text-[10px] text-[#4a4d77] mb-4">
          {weeklyProjectionQuery.isLoading || nflStateQuery.isLoading
            ? 'Loading Sleeper weekly projections…'
            : projectionWeek != null && projections.some((team) => team.projPoints != null)
              ? `NFL Week ${projectionWeek} · Sleeper weekly projections`
              : 'Sleeper weekly projections unavailable for this scoring week.'}
        </p>
      )}

      {!hasScores && (
        <p className="text-[#6b6e99] text-sm mb-4">
          Projections appear once the season has weekly scores. Showing roster list.
        </p>
      )}

      <div className="space-y-2">
        {visibleRows.map((t) => {
          const hist = histRanks.get(t.rosterId);
          const groups = getTeamPositionGroups(
            t.rosterId,
            orderBy,
            projectedPosRanks.byRosterId,
            historicalPosRanks,
          )
            .filter((g) => g.outOf > 0)
            .sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position));
          const isMine = t.rosterId === myRosterId;
          const modeRisk = orderBy === 'projected' ? t.risk : hist?.risk ?? 'warning';
          const isOpen = expanded === t.rosterId;

          return (
            <Card key={t.rosterId} hover={false} className={`p-3 ${isMine ? 'border-l-4 border-l-[#6366f1]' : ''}`}>
              <div className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : t.rosterId)}>
                <div className="flex items-center gap-3 min-w-0">
                  <RiskIcon risk={t.eliminated ? 'eliminated' : modeRisk} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${t.eliminated ? 'text-[#4a4d77]' : 'text-[#f0f0ff]'}`}>
                      {t.displayName}{isMine && <span className="text-[#6366f1] text-[10px] ml-1">YOU</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {hasScores && (
                        <TeamStandingDetails team={t} historical={hist} orderBy={orderBy} />
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#4a4d77] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </div>

              {/* Position-group breakdown */}
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-[#1a1e3a]">
                  <PositionGroupBreakdown
                    groups={groups}
                    eliminated={t.eliminated}
                    unavailableMessage={orderBy === 'projected'
                      ? 'Projected lineup-group rankings unavailable.'
                      : 'No starter scoring data yet.'}
                  />
                  <button
                    onClick={() => navigate(`/teams/${t.rosterId}`)}
                    className="mt-3 text-[11px] text-[#6366f1] underline underline-offset-4 hover:text-[#8b5cf6]"
                  >
                    Full team profile →
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      </>)}
    </div>
  );
}

export function PositionGroupBreakdown({
  groups,
  eliminated,
  unavailableMessage = 'No starter scoring data yet.',
}: {
  groups: PosGroupRank[];
  eliminated: boolean;
  unavailableMessage?: string;
}) {
  if (eliminated) {
    return (
      <p className="text-[10px] text-[#4a4d77]">
        Eliminated — no current positional standing.
      </p>
    );
  }
  if (groups.length === 0) {
    return <p className="text-[10px] text-[#4a4d77]">{unavailableMessage}</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-2">
      {groups.map((g) => (
        <PosCell key={g.position} g={g} />
      ))}
    </div>
  );
}

function RiskIcon({ risk }: { risk: 'safe' | 'warning' | 'at-risk' | 'eliminated' }) {
  if (risk === 'safe') return <ShieldCheck size={18} className="text-[#10b981] shrink-0" />;
  if (risk === 'at-risk') return <ShieldAlert size={18} className="text-[#f43f5e] shrink-0" />;
  if (risk === 'warning') return <TriangleAlert size={18} className="text-[#f59e0b] shrink-0" />;
  return <Shield size={18} className="text-[#4a4d77] shrink-0" />;
}

function PosCell({ g }: { g: PosGroupRank }) {
  const color = rankColor(g.rank, g.outOf);
  return (
    <div className="bg-[#0e1025] rounded-lg p-2 text-center border border-[#1a1e3a]">
      <div className="text-[9px] text-[#6b6e99] uppercase tracking-wider">{g.position}</div>
      <div className="font-['Space_Mono'] text-sm font-bold tabular-nums" style={{ color }}>
        #{g.rank}
      </div>
      <div className="text-[8px] text-[#4a4d77] font-['Space_Mono']">{g.points.toFixed(0)}p</div>
    </div>
  );
}
