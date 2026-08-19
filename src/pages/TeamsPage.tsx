// Teams page — Browse any team's profile
// Phase 1: List of all teams with status

import { useAppStore, usePlayers } from '../store';
import { useLeagueUsers, useRosters, useAllMatchups } from '../api';
import { computeEliminations } from '../logic';
import { Card, Skeleton, StatusBadge } from '../components/ui';
import { ChevronRight } from 'lucide-react';

export function TeamsPage() {
  const { leagueId, leagueName } = useAppStore();
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const { isLoading: playersLoading } = usePlayers();
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, 18);

  const isLoading = matchupsLoading || playersLoading;

  if (!leagueId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b6e99] text-sm">Select a league first</p>
      </div>
    );
  }

  if (isLoading || !matchups || !rosters || !users) {
    return (
      <div className="px-6 py-8 pb-24 max-w-lg mx-auto space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} hover={false} className="p-4">
            <Skeleton lines={1} />
          </Card>
        ))}
      </div>
    );
  }

  const elimResult = computeEliminations(matchups, rosters, users);

  // Sort: active first (by last score rank), then eliminated (by elimination week desc)
  const teamList = [...elimResult.teams.values()].sort((a, b) => {
    if (a.eliminatedWeek && !b.eliminatedWeek) return 1;
    if (!a.eliminatedWeek && b.eliminatedWeek) return -1;
    if (a.eliminatedWeek && b.eliminatedWeek) return b.eliminatedWeek - a.eliminatedWeek;
    // Both active — sort by last week rank
    const lastWeek = elimResult.weeks[elimResult.weeks.length - 1];
    const aScore = lastWeek?.scores.find((s) => s.rosterId === a.rosterId);
    const bScore = lastWeek?.scores.find((s) => s.rosterId === b.rosterId);
    return (aScore?.rank || 999) - (bScore?.rank || 999);
  });

  // Total points per team
  const totalPoints = new Map<number, number>();
  for (const w of elimResult.weeks) {
    for (const s of w.scores) {
      totalPoints.set(s.rosterId, (totalPoints.get(s.rosterId) || 0) + s.points);
    }
  }

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-1">
        Teams
      </h1>
      <p className="text-xs text-[#6b6e99] mb-6">
        {leagueName} · {teamList.length} teams
      </p>

      <div className="space-y-2">
        {teamList.map((team) => {
          let status: 'champion' | 'runner-up' | 'eliminated' | 'safe' | 'at-risk' | 'middle' = 'middle';
          if (team.isChampion) status = 'champion';
          else if (team.isRunnerUp) status = 'runner-up';
          else if (team.eliminatedWeek) status = 'eliminated';

          const pts = totalPoints.get(team.rosterId) || 0;

          return (
            <Card key={team.rosterId} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-['Space_Mono']
                  ${team.isChampion ? 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white' :
                    team.eliminatedWeek ? 'bg-[#161a3a] text-[#4a4d77]' :
                    'bg-[#161a3a] text-[#6b6e99]'}`}>
                  {team.isChampion ? '1' : team.eliminatedWeek ? `W${team.eliminatedWeek}` : '—'}
                </div>
                <div>
                  <div className={`text-sm font-medium ${team.eliminatedWeek && !team.isChampion && !team.isRunnerUp ? 'text-[#4a4d77]' : 'text-[#f0f0ff]'}`}>
                    {team.displayName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-['Space_Mono'] text-[10px] text-[#6b6e99] tabular-nums">
                      {pts.toFixed(1)} pts
                    </span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#4a4d77]" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
