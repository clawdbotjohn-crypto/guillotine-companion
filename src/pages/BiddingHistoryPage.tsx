import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, ChevronRight, History, RefreshCw } from 'lucide-react';
import { useAllMatchups, useAllTransactions, useLeague, useLeagueUsers, useNflState, useRosters } from '../api';
import { useAppStore, usePlayers } from '../store';
import { getPlayer, getPlayerName, getPlayerPosition, type PlayerRecord } from '../store/players';
import {
  buildCompletedAuctions,
  classifyCanonicalBidEvents,
  computeEliminations,
  getCompletedLeagueWeek,
  summarizeBiddingHistory,
  type CanonicalBidEvent,
  type CompletedAuction,
} from '../logic';
import { formatDisplayCurrency } from '../logic/displayCurrency';
import { Card, PositionBadge, Skeleton } from '../components/ui';
import { PlayerDetailDialog, type PlayerDetailData } from '../components/PlayerDetailDialog';

interface BiddingHistoryViewProps {
  auctions: CompletedAuction[];
  events: CanonicalBidEvent[];
  managerLabels: ReadonlyMap<number, string>;
  eliminatedRosterIds: ReadonlySet<number>;
  players?: ReadonlyMap<string, PlayerRecord>;
  eliminationStatusUnavailable?: boolean;
}

type WeekSelection = number | 'all' | null;

const amount = (value: number | null) => formatDisplayCurrency(value, '—');

export function BiddingHistoryView({
  auctions,
  events,
  managerLabels,
  eliminatedRosterIds,
  players,
  eliminationStatusUnavailable = false,
}: BiddingHistoryViewProps) {
  const weeks = useMemo(
    () => [...new Set(auctions.map((auction) => auction.decisionWeek))].sort((a, b) => b - a),
    [auctions],
  );
  const [selectedWeek, setSelectedWeek] = useState<WeekSelection>(null);
  const [selectedAuction, setSelectedAuction] = useState<CompletedAuction | null>(null);
  const effectiveWeek = selectedWeek ?? weeks[0] ?? 'all';
  const visibleAuctions = effectiveWeek === 'all'
    ? auctions
    : auctions.filter((auction) => auction.decisionWeek === effectiveWeek);
  const summary = summarizeBiddingHistory(visibleAuctions);
  const maxPrice = Math.max(1, ...visibleAuctions.map((auction) => auction.winner.actualBid));

  const playerDetail = useMemo<PlayerDetailData | null>(() => {
    if (!selectedAuction) return null;
    const player = players?.get(selectedAuction.playerId) ?? getPlayer(selectedAuction.playerId);
    return {
      playerId: selectedAuction.playerId,
      name: player?.full_name || getPlayerName(selectedAuction.playerId),
      position: player?.position || getPlayerPosition(selectedAuction.playerId),
      team: player?.team || null,
      age: player?.age ?? null,
      status: player?.status ?? null,
      injuryStatus: player?.injury_status ?? null,
      sourceLabel: 'Sleeper completed waiver',
      valueLabel: 'Winning price',
      valueDisplay: amount(selectedAuction.winner.actualBid),
      value: selectedAuction.winner.actualBid,
      positionRank: null,
      // Historical auction details must not invent current acquisition/prediction semantics.
      owned: true,
      managerLabels,
      history: events.filter((event) => event.playerId === selectedAuction.playerId),
    };
  }, [events, managerLabels, players, selectedAuction]);

  if (auctions.length === 0) {
    return (
      <Card hover={false} className="p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#161a3a]">
          <History className="h-6 w-6 text-[#6366f1]" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-[#f0f0ff]">No completed auctions yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8b8fb5]">
          Completed waiver wins will appear here. Failed roster moves, unmatched failures, trades,
          and other non-bids are intentionally excluded.
        </p>
      </Card>
    );
  }

  return (
    <>
      <section aria-label="Bidding week" className="mb-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6e99]">Waiver week</div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {weeks.map((week) => (
            <button
              key={week}
              type="button"
              onClick={() => setSelectedWeek(week)}
              aria-pressed={effectiveWeek === week}
              className={`min-h-11 shrink-0 rounded-lg px-4 font-['Space_Mono'] text-xs font-bold transition-colors ${effectiveWeek === week ? 'bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'border border-[#2a2e55] bg-[#12152d] text-[#8b8fb5] hover:border-[#6366f1]'}`}
            >
              Week {week}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedWeek('all')}
            aria-pressed={effectiveWeek === 'all'}
            className={`min-h-11 shrink-0 rounded-lg px-4 text-xs font-semibold transition-colors ${effectiveWeek === 'all' ? 'bg-[#6366f1] text-white' : 'border border-[#2a2e55] bg-[#12152d] text-[#8b8fb5] hover:border-[#6366f1]'}`}
          >
            All weeks
          </button>
        </div>
      </section>

      <section aria-label="Auction summary" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Auctions', String(summary.auctionCount), '#a5b4fc'],
          ['Median win', amount(summary.medianWinningBid), '#f59e0b'],
          ['FAAB spent', amount(summary.totalFaabSpent), '#10b981'],
          ['Top prices', summary.topWinningPrices.length ? summary.topWinningPrices.map((price) => amount(price)).join(' · ') : '—', '#c4b5fd'],
        ].map(([label, value, color]) => (
          <Card key={label} hover={false} className="min-w-0 p-3 sm:p-4">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6b6e99]">{label}</div>
            <div className="mt-1 truncate font-['Space_Mono'] text-lg font-bold tabular-nums sm:text-xl" style={{ color }}>{value}</div>
          </Card>
        ))}
      </section>

      <div role="note" className="mb-5 flex gap-3 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.07] p-3 text-[11px] leading-relaxed text-[#d3b56f]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" aria-hidden="true" />
        <p>
          Amounts are completed winning prices and canonically proven losing bids only—not predicted
          bids, Max VORP, acquisition proxies, or assumed participation. Missing participation is never $0.
        </p>
      </div>
      {eliminationStatusUnavailable && (
        <p role="status" className="-mt-2 mb-5 text-[10px] text-[#fbbf24]">
          Current elimination status is unavailable; manager names and bid evidence are unaffected.
        </p>
      )}

      {visibleAuctions.length === 0 ? (
        <Card hover={false} className="p-6 text-center text-sm text-[#8b8fb5]">No completed auctions for this week.</Card>
      ) : (
        <section aria-label="Completed auctions" className="space-y-3">
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#6366f1]" aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c7c9e8]">Completed auctions</h2>
          </div>
          {visibleAuctions.map((auction) => {
            const player = players?.get(auction.playerId);
            const playerName = player?.full_name || getPlayerName(auction.playerId);
            const position = player?.position || getPlayerPosition(auction.playerId);
            const winnerName = managerLabels.get(auction.winner.managerRosterId) ?? `Roster ${auction.winner.managerRosterId}`;
            const winnerEliminated = eliminatedRosterIds.has(auction.winner.managerRosterId);
            const width = auction.winner.actualBid === 0 ? 0 : Math.max(4, (auction.winner.actualBid / maxPrice) * 100);
            return (
              <Card key={auction.auctionKey} hover={false} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedAuction(auction)}
                  className="group w-full p-4 text-left sm:p-5"
                  aria-label={`Open ${playerName} details, winning price ${amount(auction.winner.actualBid)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-[#f0f0ff] group-hover:text-[#c7d2fe]">{playerName}</span>
                        <PositionBadge position={position} />
                        {auction.winner.actualBid === 0 && <span className="rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#34d399]">True $0 claim</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[#8b8fb5]">
                        <span>{winnerName}</span>
                        {winnerEliminated && <span className="rounded-full bg-[#f43f5e]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#fb7185]">Eliminated</span>}
                        <span className="text-[#3e4269]">·</span>
                        <span>Week {auction.decisionWeek}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Winning price</div>
                        <div className="font-['Space_Mono'] text-xl font-bold text-[#f59e0b]">{amount(auction.winner.actualBid)}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#4a4d77] group-hover:text-[#a5b4fc]" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#181c3c]" aria-hidden="true">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#f59e0b]" style={{ width: `${width}%` }} />
                  </div>
                </button>

                <div className="border-t border-[#20264d] bg-[#0b0e20] px-4 py-3 sm:px-5">
                  {auction.runnerUp ? (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 text-[#9ca3c7]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6b6e99]">Runner-up evidence</span>
                          <div className="mt-0.5 truncate">
                            {managerLabels.get(auction.runnerUp.managerRosterId) ?? `Roster ${auction.runnerUp.managerRosterId}`}
                            {eliminatedRosterIds.has(auction.runnerUp.managerRosterId) && <span className="ml-1 text-[#fb7185]">(eliminated)</span>}
                          </div>
                        </div>
                        <div className="font-['Space_Mono'] text-sm font-bold text-[#a5b4fc]">{amount(auction.runnerUp.actualBid)}</div>
                      </div>
                      {auction.legitimateLosses.length > 1 && (
                        <p className="mt-2 text-[10px] text-[#6b6e99]">{auction.legitimateLosses.length} canonical losing bids · runner-up is the highest.</p>
                      )}
                      {auction.legitimateLosses.some((loss) => loss.duplicateCount > 1) && (
                        <p className="mt-1 text-[10px] text-[#6b6e99]">Equivalent alternative/drop paths were consolidated, not counted as extra bids.</p>
                      )}
                      {auction.legitimateLosses.some((loss) => loss.faabReconstruction === 'inferred-minimum') && (
                        <p className="mt-1 text-[10px] text-[#fbbf24]">At least one bidder's available FAAB is an inferred minimum; the bid amount itself is observed.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] leading-relaxed text-[#6b6e99]">
                      Winning-price evidence only. Losing-bid participation is unavailable and is not treated as $0.
                    </p>
                  )}
                  {auction.hasAmbiguousWinnerEvidence && (
                    <p className="mt-2 text-[10px] text-[#fb7185]">Conflicting winner evidence was returned; the highest completed price is shown.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {playerDetail && (
        <PlayerDetailDialog open data={playerDetail} onClose={() => setSelectedAuction(null)} />
      )}
    </>
  );
}

export function BiddingHistoryPage() {
  const { leagueId, leagueName } = useAppStore();
  const leagueQuery = useLeague(leagueId);
  const usersQuery = useLeagueUsers(leagueId);
  const rostersQuery = useRosters(leagueId);
  const playersQuery = usePlayers();
  const nflStateQuery = useNflState();
  const completedWeek = getCompletedLeagueWeek(leagueQuery.data, nflStateQuery.data);
  const matchupsQuery = useAllMatchups(leagueId, completedWeek);
  // Keep the shared query key/range identical to Hub, Waivers, and League.
  const transactionsQuery = useAllTransactions(leagueId, 18);

  const events = useMemo(() => transactionsQuery.data && leagueQuery.data
    ? classifyCanonicalBidEvents(transactionsQuery.data, leagueQuery.data.settings?.waiver_budget ?? 1000)
    : [], [leagueQuery.data, transactionsQuery.data]);
  const auctions = useMemo(() => buildCompletedAuctions(events), [events]);
  const managerLabels = useMemo(() => {
    const userNames = new Map((usersQuery.data ?? []).map((user) => [user.user_id, user.display_name]));
    return new Map((rostersQuery.data ?? []).map((roster) => [
      roster.roster_id,
      userNames.get(roster.owner_id) ?? `Team ${roster.roster_id}`,
    ]));
  }, [rostersQuery.data, usersQuery.data]);
  const eliminatedRosterIds = useMemo(() => {
    if (!matchupsQuery.data || !rostersQuery.data || !usersQuery.data) return new Set<number>();
    const result = computeEliminations(matchupsQuery.data, rostersQuery.data, usersQuery.data);
    return new Set([...result.teams.values()].filter((team) => team.eliminatedWeek != null).map((team) => team.rosterId));
  }, [matchupsQuery.data, rostersQuery.data, usersQuery.data]);

  if (!leagueId) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#6b6e99]">Select a league first</div>;
  }

  const isLoading = leagueQuery.isLoading || usersQuery.isLoading || rostersQuery.isLoading
    || playersQuery.isLoading || transactionsQuery.isLoading || nflStateQuery.isLoading
    || (completedWeek > 0 && matchupsQuery.isLoading);
  const error = leagueQuery.error || usersQuery.error || rostersQuery.error || playersQuery.error || transactionsQuery.error;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-[#8b5cf6]"><History className="h-4 w-4" aria-hidden="true" /><span className="text-[10px] font-bold uppercase tracking-[0.18em]">League-wide</span></div>
        <h1 className="mt-1 font-['Orbitron'] text-xl font-bold uppercase tracking-wider text-[#f0f0ff]">Bidding History</h1>
        <p className="mt-1 text-xs text-[#6b6e99]">{leagueName}</p>
      </header>

      {isLoading ? (
        <div aria-label="Loading bidding history" className="space-y-4"><Skeleton lines={2} /><div className="grid grid-cols-2 gap-2"><Card hover={false} className="h-24 animate-pulse">&nbsp;</Card><Card hover={false} className="h-24 animate-pulse">&nbsp;</Card></div><Skeleton lines={5} /></div>
      ) : error ? (
        <Card hover={false} className="p-7 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-[#f43f5e]" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-[#f0f0ff]">Bidding history unavailable</h2>
          <p className="mt-1 text-sm text-[#8b8fb5]">Sleeper transaction history could not be loaded. No bid values were inferred.</p>
          <button type="button" onClick={() => void transactionsQuery.refetch()} className="mx-auto mt-4 flex min-h-11 items-center gap-2 rounded-lg border border-[#6366f1] px-4 text-xs font-semibold text-[#a5b4fc]"><RefreshCw className="h-4 w-4" />Retry</button>
        </Card>
      ) : (
        <BiddingHistoryView
          auctions={auctions}
          events={events}
          managerLabels={managerLabels}
          eliminatedRosterIds={eliminatedRosterIds}
          players={playersQuery.data}
          eliminationStatusUnavailable={matchupsQuery.isError}
        />
      )}
    </main>
  );
}
