import { useMemo } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useAllMatchups,
  useAllTransactions,
  useLeague,
  useLeagueUsers,
  useNflState,
  useRosters,
  useWeeklyProjections,
} from '../api';
import { Card, Skeleton, StatusBadge } from '../components/ui';
import { usePlayerValues } from '../hooks/usePlayerValues';
import {
  buildWeeklyProjectionContext,
  buildWeeklyScoredPlayers,
  computeEliminations,
  extractBids,
  getActiveRosterIds,
  getCompletedLeagueWeek,
  getProjectionScoring,
  getTeamByeWeek,
} from '../logic';
import type { TeamRisk } from '../logic/analytics';
import {
  buildLeagueContext,
  buildMaxVorpCalibration,
  buildVorpCalibration,
  buildWaiverBoard,
  buildWaiverBoardModel,
  computeAvailablePlayers,
  type WaiverPlayerRow,
} from '../logic/waivers';
import { buildWeeklyBidPlan, isFinalBiddingRound, type WeeklyBidRecommendation } from '../logic/weeklyBidPlan';
import { getPlayerName, getPlayerPosition } from '../store/players';
import { useAppStore, usePlayers } from '../store';
import { WaiverPlayerCard } from './WaiversPage';

function riskLabel(risk: TeamRisk): string {
  if (risk === 'at-risk') return 'Danger';
  return risk === 'warning' ? 'Warning' : 'Safe';
}

function targetRowWithBid(recommendation: WeeklyBidRecommendation): WaiverPlayerRow {
  const existingSafe = recommendation.target.suggestions.find((suggestion) => suggestion.strategy === 'safe');
  return {
    ...recommendation.target,
    suggestions: [
      ...recommendation.target.suggestions.filter((suggestion) => suggestion.strategy !== 'safe'),
      existingSafe
        ? { ...existingSafe, value: recommendation.suggestedBid }
        : { strategy: 'safe', label: 'Safe', value: recommendation.suggestedBid, pctOfBudget: null },
    ],
  };
}

function WeeklyTargetCard({
  recommendation,
  playingWeek,
  remainingFaab,
  weeklyContext,
  players,
  season,
}: {
  recommendation: WeeklyBidRecommendation;
  playingWeek: number | null;
  remainingFaab: number;
  weeklyContext: ReturnType<typeof buildWeeklyProjectionContext>;
  players: ReturnType<typeof usePlayers>['data'];
  season: string;
}) {
  const target = recommendation.target;
  const weekly = weeklyContext.get(target.playerId);
  const player = players?.get(target.playerId);
  const transition = recommendation.beforeRisk === recommendation.afterRisk
    ? `${riskLabel(recommendation.beforeRisk)} posture`
    : `${riskLabel(recommendation.beforeRisk)} → ${riskLabel(recommendation.afterRisk)}`;
  const cap = recommendation.budgetCapApplied
    ? ` · capped by $${remainingFaab} scenario budget`
    : recommendation.opponentCapApplied
      ? ' · capped at richest active opponent + $1'
      : '';
  return (
    <div className="min-w-0" data-testid="weekly-target-card">
      <WaiverPlayerCard
        row={targetRowWithBid(recommendation)}
        strategy="safe"
        remainingFaab={remainingFaab}
        nflTeam={player?.team}
        age={player?.age}
        status={player?.status}
        injuryStatus={player?.injury_status}
        weeklyPoints={weekly?.points}
        weeklyRank={weekly?.positionRank}
        byeWeek={getTeamByeWeek(season, player?.team)}
        playingWeek={playingWeek}
        sourceLabel="Sleeper ROS"
      />
      <p className="-mt-1 mb-3 px-1 text-[10px] leading-4 text-[#8b8eb8]">
        +{recommendation.weeklyGain.toFixed(1)} this week · +{recommendation.rosGain.toFixed(1)} ROS · {transition}{cap}
      </p>
    </div>
  );
}

export function WeeklyBidPlanPage() {
  const navigate = useNavigate();
  const { leagueId, rosterId, teamName } = useAppStore();
  const leagueQuery = useLeague(leagueId);
  const usersQuery = useLeagueUsers(leagueId);
  const rostersQuery = useRosters(leagueId);
  const playersQuery = usePlayers();
  const nflStateQuery = useNflState();
  const completedWeek = getCompletedLeagueWeek(leagueQuery.data, nflStateQuery.data);
  const matchupsQuery = useAllMatchups(leagueId, completedWeek);
  const transactionsQuery = useAllTransactions(leagueId, 18);
  const valuesModel = usePlayerValues({
    league: leagueQuery.data,
    nflState: nflStateQuery.data,
    players: playersQuery.data,
    source: 'sleeper',
  });
  const playingWeek = valuesModel.startWeek;
  const weeklyQuery = useWeeklyProjections(
    leagueQuery.data?.season ?? null,
    playingWeek,
    !!leagueQuery.data && !!nflStateQuery.data
      && leagueQuery.data.season === nflStateQuery.data.season,
  );

  const model = useMemo(() => {
    const league = leagueQuery.data;
    const users = usersQuery.data;
    const rosters = rostersQuery.data;
    const players = playersQuery.data;
    const matchups = matchupsQuery.data;
    const ros = valuesModel.values;
    if (!league || !users || !rosters || !players || !matchups || !ros || !weeklyQuery.data
      || rosterId == null || playingWeek == null) return null;

    const elimination = computeEliminations(matchups, rosters, users);
    const activeRosterIds = getActiveRosterIds(elimination);
    const weekly = buildWeeklyScoredPlayers(
      weeklyQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      getPlayerPosition,
    );
    const ctx = buildLeagueContext(league, elimination, playingWeek);
    const availablePlayerIds = computeAvailablePlayers(rosters, ros, elimination);
    const vorpCalibration = buildVorpCalibration(ros, ctx.startersPerPos, ctx.teamsRemaining, ctx.budget);
    const maxVorpCalibration = buildMaxVorpCalibration(ros, ctx.startersPerPos, ctx.teamsRemaining, ctx.budget);
    const boardModel = buildWaiverBoardModel(ros, ctx);
    const availableRows = buildWaiverBoard(
      availablePlayerIds,
      ros,
      ctx,
      extractBids(transactionsQuery.data ?? new Map()),
      getPlayerName,
      {
        sleeperRosProjections: ros,
        replacementTeamCount: ctx.teamsRemaining,
        vorpCalibration,
        maxVorpCalibration,
        boardModel,
        maxPerPos: Number.POSITIVE_INFINITY,
      },
    );
    const rosteredIds = new Set(rosters.flatMap((roster) => roster.players ?? []));
    const allAvailableIds = [...weekly.keys()].filter((playerId) => !rosteredIds.has(playerId));
    const streamRows: WaiverPlayerRow[] = allAvailableIds
      .filter((playerId) => ['DEF', 'K'].includes(weekly.get(playerId)?.position ?? ''))
      .map((playerId) => {
        const projection = weekly.get(playerId)!;
        const playerRos = ros.get(playerId);
        return {
          playerId,
          name: getPlayerName(playerId),
          position: projection.position,
          posRank: 0,
          rosPoints: playerRos?.totalPoints ?? projection.points,
          projectedPointsPerWeek: playerRos?.pointsPerWeek ?? projection.points,
          sourceValue: playerRos?.totalPoints ?? projection.points,
          starterWeeks: 0,
          possibleStarterWeeks: 0,
          suggestions: [{ strategy: 'safe', label: 'Safe', value: 0, pctOfBudget: 0 }],
          predictedWinningBid: 0,
        };
      });
    const plan = buildWeeklyBidPlan({
      selectedRosterId: rosterId,
      rosters,
      activeRosterIds,
      lineupPositions: league.roster_positions ?? [],
      weeklyProjections: weekly,
      rosProjections: ros,
      availableRows: [...availableRows, ...streamRows],
      availablePlayerIds: allAvailableIds,
      initialBudget: ctx.budget,
      eliminationsPerWeek: ctx.teamsRemaining > 16 ? 2 : 1,
    });
    return {
      plan,
      weeklyContext: buildWeeklyProjectionContext(
        weeklyQuery.data,
        getProjectionScoring(league.scoring_settings?.rec),
        (playerId) => players.get(playerId)?.position,
      ),
      finalRound: isFinalBiddingRound(
        league.settings,
        playingWeek,
        ctx.teamsRemaining,
      ),
    };
  }, [
    leagueQuery.data,
    usersQuery.data,
    rostersQuery.data,
    playersQuery.data,
    matchupsQuery.data,
    valuesModel.values,
    weeklyQuery.data,
    rosterId,
    playingWeek,
    transactionsQuery.data,
  ]);

  const isLoading = leagueQuery.isLoading || usersQuery.isLoading || rostersQuery.isLoading
    || playersQuery.isLoading || nflStateQuery.isLoading || matchupsQuery.isLoading
    || valuesModel.isLoading || weeklyQuery.isLoading;
  const error = leagueQuery.error || usersQuery.error || rostersQuery.error || playersQuery.error
    || nflStateQuery.error || matchupsQuery.error || valuesModel.error || weeklyQuery.error;
  const close = () => navigate('/hub');
  const plan = model?.plan;
  const positionMoveCount = plan?.rows.filter((row) => row.kind === 'position').length ?? 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06060f] px-4 pb-12 pt-4 text-[#f0f0ff] sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="sticky top-0 z-20 -mx-4 mb-5 flex items-center gap-3 border-b border-[#1a1e3a] bg-[#06060f]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <button type="button" onClick={close} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#a5b4fc] hover:bg-[#11142b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]" aria-label="Back to Hub">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-['Orbitron'] text-sm font-bold uppercase tracking-[0.08em]">Weekly Bid Plan</h1>
            <p className="mt-0.5 truncate text-[10px] text-[#6b6e99]">{teamName || 'Your team'} · read-only advisory</p>
          </div>
          <button type="button" onClick={close} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#8b8eb8] hover:bg-[#11142b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]" aria-label="Close weekly bid plan">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {isLoading && <div aria-label="Loading weekly bid plan"><Skeleton lines={6} /></div>}
        {!isLoading && error && (
          <Card hover={false} className="p-5">
            <h2 className="font-semibold">Plan unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-[#8b8eb8]">Live Sleeper projections or league data could not be loaded. No fallback recommendations were fabricated.</p>
          </Card>
        )}
        {!isLoading && !error && !plan && (
          <Card hover={false} className="p-5">
            <h2 className="font-semibold">No plan available</h2>
            <p className="mt-2 text-sm leading-6 text-[#8b8eb8]">A current active roster plus both weekly and ROS projections are required. No placeholder bids are shown.</p>
          </Card>
        )}
        {!isLoading && !error && plan && (
          <>
            <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Bid plan summary">
              <Card hover={false} className="p-3"><p className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Posture</p><div className="mt-1"><StatusBadge status={plan.startingRisk} /></div></Card>
              <Card hover={false} className="p-3"><p className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Projected rank</p><p className="mt-1 font-['Space_Mono'] text-lg font-bold text-[#a5b4fc]">{plan.startingRank}/{plan.activeTeamCount}</p></Card>
              <Card hover={false} className="p-3"><p className="text-[9px] uppercase tracking-wider text-[#6b6e99]">FAAB available</p><p className="mt-1 font-['Space_Mono'] text-lg font-bold text-[#10b981]">${plan.initialBudgetRemaining}</p></Card>
              <Card hover={false} className="p-3"><p className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Position moves</p><p className="mt-1 font-['Space_Mono'] text-lg font-bold">{positionMoveCount}</p></Card>
            </section>
            <p className="mb-4 text-xs leading-5 text-[#8b8eb8]">
              Each later row assumes the first target above it was won, subtracts that bid, rebuilds your best lineup, and reprices from the new survival posture. Richest other active owner: ${plan.richestOtherActiveBudget}. Final bidding round: {model?.finalRound ? 'Yes' : 'No'}; no terminal-round uplift is applied.
            </p>

            {plan.rows.length === 0 ? (
              <Card hover={false} className="p-6 text-center">
                <h2 className="font-semibold">No qualifying improvements</h2>
                <p className="mt-2 text-sm leading-6 text-[#8b8eb8]">No available player is better than a proposed drop both this week and for the rest of the season.</p>
              </Card>
            ) : (
              <section aria-label="Weekly add drop recommendations" className="overflow-hidden rounded-xl border border-[#1a1e3a]">
                <div className="grid grid-cols-[minmax(6rem,0.7fr)_minmax(0,2fr)] gap-2 border-b border-[#2a2e55] bg-[#0c0f22] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6b6e99] sm:grid-cols-[minmax(11rem,0.75fr)_minmax(0,2fr)] sm:gap-4 sm:px-4">
                  <span>Player to drop</span><span>Recommended targets &amp; bids</span>
                </div>
                {plan.rows.map((row, rowIndex) => {
                  const drop = playersQuery.data?.get(row.dropPlayerId);
                  return (
                    <article key={`${row.kind}-${row.dropPlayerId}`} className="grid min-w-0 grid-cols-[minmax(6rem,0.7fr)_minmax(0,2fr)] gap-2 border-b border-[#1a1e3a] bg-[#090a18] px-3 py-4 last:border-b-0 sm:grid-cols-[minmax(11rem,0.75fr)_minmax(0,2fr)] sm:gap-4 sm:px-4" data-testid="weekly-drop-row">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-md bg-[#1b1e3b] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#a5b4fc]">{row.dropPosition}</span>
                        <h2 className="mt-2 break-words text-xs font-semibold leading-5 text-[#f0f0ff] sm:text-sm">{drop ? getPlayerName(row.dropPlayerId) : row.dropPlayerId}</h2>
                        <p className="mt-1 text-[10px] leading-4 text-[#6b6e99]">{row.kind === 'streamer' ? '$0 like-for-like upgrade' : rowIndex === 0 ? 'Weakest qualifying hold' : `After assumed win · $${row.scenarioBudgetBefore} left`}</p>
                      </div>
                      <div className="min-w-0">
                        {row.recommendations.map((recommendation) => (
                          <WeeklyTargetCard key={recommendation.target.playerId} recommendation={recommendation} playingWeek={playingWeek} remainingFaab={row.scenarioBudgetBefore} weeklyContext={model!.weeklyContext} players={playersQuery.data} season={leagueQuery.data?.season ?? ''} />
                        ))}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
            <p className="mt-4 text-[10px] leading-4 text-[#5c5f88]">Advisory only. This page cannot submit claims, write provider data, or reserve FAAB. Weekly projections drive immediate effects; Sleeper ROS projections protect long-term assets.</p>
          </>
        )}
      </div>
    </main>
  );
}
