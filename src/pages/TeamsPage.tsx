// Teams page — rethought per John feedback (2026-09-22).
// - Rank teams by PROJECTED best-lineup points for the coming week
// - Show risk (safe / middle / at-risk) from projection
// - Per team: historical points rank + position-group scoring breakdown (FLEX its own category)
// Toggle between Projected and Historical ordering.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, usePlayers } from '../store';
import { useLeague, useLeagueUsers, useRosters, useAllMatchups, useLeagueHistory } from '../api';
import {
  computeEliminations,
  buildPlayerSeasons,
  projectAllTeams,
  computePositionGroupRanks,
  computeHistoricalRanks,
  type PosGroupRank,
} from '../logic';
import { Card, Skeleton, StatusBadge } from '../components/ui';
import { SeasonPicker } from '../components/SeasonPicker';
import { useSwitchSeason } from '../hooks/useSwitchSeason';
import { ChevronRight, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'];

function rankColor(rank: number, outOf: number): string {
  if (outOf <= 1) return '#a5b4fc';
  const pct = (rank - 1) / (outOf - 1);
  if (pct <= 0.25) return '#10b981';
  if (pct <= 0.5) return '#a5b4fc';
  if (pct <= 0.75) return '#f59e0b';
  return '#f43f5e';
}

export function TeamsPage() {
  const navigate = useNavigate();
  const { leagueId, leagueName, leagueSeason, rootLeagueId, rosterId: myRosterId } = useAppStore();
  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const { isLoading: playersLoading } = usePlayers();
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, 18);
  const { data: leagueHistory, isLoading: historyLoading } = useLeagueHistory(rootLeagueId);
  const handleSwitchSeason = useSwitchSeason();

  const [orderBy, setOrderBy] = useState<'projected' | 'historical'>('projected');
  const [expanded, setExpanded] = useState<number | null>(null);

  const seasons = (leagueHistory || [])
    .map((l) => ({ leagueId: l.league_id, season: l.season, name: l.name }))
    .reverse();

  const isLoading = matchupsLoading || playersLoading;

  const model = useMemo(() => {
    if (!matchups || !rosters || !users) return null;
    const elim = computeEliminations(matchups, rosters, users);
    const playerSeasons = buildPlayerSeasons(matchups);
    const projections = projectAllTeams(rosters, playerSeasons, league, elim);
    const activeRosterIds = new Set(
      [...elim.teams.values()]
        .filter((team) => team.eliminatedWeek == null)
        .map((team) => team.rosterId),
    );
    const posRanks = computePositionGroupRanks(matchups, league, activeRosterIds);
    const histRanks = computeHistoricalRanks(elim);
    return { elim, projections, posRanks, histRanks };
  }, [matchups, rosters, users, league]);

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

  const { elim, projections, posRanks, histRanks } = model;
  const hasScores = elim.weeks.length > 0;

  // Order rows
  const rows = [...projections].sort((a, b) => {
    // eliminated always last
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (orderBy === 'projected') return b.projPoints - a.projPoints;
    const ah = histRanks.get(a.rosterId)?.rank ?? 999;
    const bh = histRanks.get(b.rosterId)?.rank ?? 999;
    return ah - bh;
  });

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-1">
        Teams
      </h1>
      <p className="text-xs text-[#6b6e99] mb-4">{leagueName} · {rows.length} teams</p>

      <SeasonPicker
        seasons={seasons}
        currentSeason={leagueSeason || ''}
        onSelect={handleSwitchSeason}
        isLoading={historyLoading}
      />

      {/* Order toggle */}
      {hasScores && (
        <div className="flex gap-1 bg-[#0a0d1a] rounded-lg p-1 mb-4 w-fit">
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

      {!hasScores && (
        <p className="text-[#6b6e99] text-sm mb-4">
          Projections appear once the season has weekly scores. Showing roster list.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((t) => {
          const hist = histRanks.get(t.rosterId);
          const groups = (posRanks.get(t.rosterId) ?? [])
            .filter((g) => g.outOf > 0)
            .sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position));
          const isMine = t.rosterId === myRosterId;
          const status = t.eliminated ? 'eliminated' : t.risk;
          const isOpen = expanded === t.rosterId;

          return (
            <Card key={t.rosterId} hover={false} className={`p-3 ${isMine ? 'border-l-4 border-l-[#6366f1]' : ''}`}>
              <div className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : t.rosterId)}>
                <div className="flex items-center gap-3 min-w-0">
                  <RiskIcon risk={t.eliminated ? 'eliminated' : t.risk} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${t.eliminated ? 'text-[#4a4d77]' : 'text-[#f0f0ff]'}`}>
                      {t.displayName}{isMine && <span className="text-[#6366f1] text-[10px] ml-1">YOU</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {hasScores && !t.eliminated && (
                        <span className="font-['Space_Mono'] text-[10px] text-[#a5b4fc] tabular-nums">
                          proj {t.projPoints.toFixed(1)}
                        </span>
                      )}
                      {hist && (
                        <span className="font-['Space_Mono'] text-[10px] tabular-nums"
                          style={{ color: rankColor(hist.rank, hist.outOf) }}>
                          hist #{hist.rank}/{hist.outOf}
                        </span>
                      )}
                      <StatusBadge status={status as never} />
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#4a4d77] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </div>

              {/* Position-group breakdown */}
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-[#1a1e3a]">
                  <PositionGroupBreakdown groups={groups} eliminated={t.eliminated} />
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
    </div>
  );
}

export function PositionGroupBreakdown({
  groups,
  eliminated,
}: {
  groups: PosGroupRank[];
  eliminated: boolean;
}) {
  if (eliminated) {
    return (
      <p className="text-[10px] text-[#4a4d77]">
        Eliminated — no current positional standing.
      </p>
    );
  }
  if (groups.length === 0) {
    return <p className="text-[10px] text-[#4a4d77]">No starter scoring data yet.</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-2">
      {groups.map((g) => (
        <PosCell key={g.position} g={g} />
      ))}
    </div>
  );
}

function RiskIcon({ risk }: { risk: 'safe' | 'middle' | 'at-risk' | 'eliminated' }) {
  if (risk === 'safe') return <ShieldCheck size={18} className="text-[#10b981] shrink-0" />;
  if (risk === 'at-risk') return <ShieldAlert size={18} className="text-[#f43f5e] shrink-0" />;
  if (risk === 'eliminated') return <Shield size={18} className="text-[#4a4d77] shrink-0" />;
  return <Shield size={18} className="text-[#a5b4fc] shrink-0" />;
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
