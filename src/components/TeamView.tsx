import type { LeagueData } from '../useLeagueLoader';
import { getTeamBids } from '../logic';
import { Trophy, Skull, ChevronDown } from 'lucide-react';
import PosBadge from './PosBadge';

export default function TeamView({ data, selectedTeam, setSelectedTeam }: {
  data: LeagueData;
  selectedTeam: number | null;
  setSelectedTeam: (t: number | null) => void;
}) {
  const { teams, weekData, bids, draftPicks } = data;

  const sortedTeams = [...teams.values()].sort((a, b) => {
    if (a.eliminatedWeek === null && b.eliminatedWeek === null) return a.displayName.localeCompare(b.displayName);
    if (a.eliminatedWeek === null) return -1;
    if (b.eliminatedWeek === null) return 1;
    return b.eliminatedWeek - a.eliminatedWeek;
  });

  const team = selectedTeam ? teams.get(selectedTeam) : null;
  const teamBids = selectedTeam ? getTeamBids(bids, selectedTeam) : [];
  const teamDraft = selectedTeam ? draftPicks.filter(p => p.roster_id === selectedTeam) : [];

  // Determine if this team is runner-up
  const lastWeek = weekData[weekData.length - 1];
  const isRunnerUp = team && team.eliminatedWeek === null && lastWeek &&
    lastWeek.teamsRemaining === 2 &&
    lastWeek.scores.find(s => s.rosterId === team.rosterId)?.rank === 2;
  const isChampion = team && team.eliminatedWeek === null && !isRunnerUp;

  const teamScores = selectedTeam
    ? weekData.map(wd => {
        const score = wd.scores.find(s => s.rosterId === selectedTeam);
        return score ? { week: wd.week, points: score.points, rank: score.rank, total: wd.teamsRemaining } : null;
      }).filter(Boolean) as { week: number; points: number; rank: number; total: number }[]
    : [];

  return (
    <div className="space-y-6">
      {/* Team Selector */}
      <div className="relative inline-block">
        <select
          value={selectedTeam || ''}
          onChange={e => setSelectedTeam(e.target.value ? parseInt(e.target.value) : null)}
          className="appearance-none px-5 py-2.5 pr-10 bg-[#0e1025] border border-[#2a2e55] rounded-lg text-[#f0f0ff] focus:outline-none focus:border-[#6366f1] focus:shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all text-sm cursor-pointer"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          <option value="">Select a team...</option>
          {sortedTeams.map(t => (
            <option key={t.rosterId} value={t.rosterId}>
              {t.displayName} {t.eliminatedWeek ? `(Elim Wk${t.eliminatedWeek})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6e99] pointer-events-none" />
      </div>

      {team && (
        <>
          {/* Team Header */}
          <div className="neon-card p-5 fade-up" style={isChampion ? { borderColor: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.2)' } : {}}>
            <div className="flex items-center gap-3">
              {isChampion && <Trophy className="w-5 h-5 text-[#10b981]" />}
              {isRunnerUp && <Trophy className="w-5 h-5 text-[#6b6e99]" />}
              {team.eliminatedWeek && <Skull className="w-5 h-5 text-[#f43f5e]" />}
              <h3 className="text-lg font-black text-[#f0f0ff]">{team.displayName}</h3>
            </div>
            <p className="mt-1 text-sm" style={{ fontFamily: "'Exo 2', sans-serif", color: isChampion ? '#10b981' : isRunnerUp ? '#6b6e99' : '#f43f5e' }}>
              {isChampion ? 'Champion' : isRunnerUp ? 'Runner-up' : `Eliminated Week ${team.eliminatedWeek}`}
            </p>
          </div>

          {/* Week-by-Week Scores */}
          <div className="fade-up" style={{ animationDelay: '50ms' }}>
            <h4 className="label text-xs mb-3">Week-by-Week Performance</h4>
            <div className="flex flex-wrap gap-2">
              {teamScores.map(s => {
                const pct = s.rank / s.total;
                const borderColor = pct <= 0.1 ? '#10b981' : pct >= 0.9 ? '#f43f5e' : pct <= 0.33 ? '#2a2e55' : '#f59e0b';
                const bgColor = pct <= 0.1 ? 'rgba(16,185,129,0.1)' : pct >= 0.9 ? 'rgba(244,63,94,0.1)' : pct <= 0.33 ? 'rgba(14,16,37,0.8)' : 'rgba(245,158,11,0.05)';
                const textColor = pct <= 0.1 ? '#10b981' : pct >= 0.9 ? '#f43f5e' : '#f0f0ff';
                return (
                  <div key={s.week} className="w-16 p-2 rounded-xl border text-center transition-all hover:scale-105" style={{ borderColor, background: bgColor }}>
                    <div className="text-[10px] text-[#6b6e99]" style={{ fontFamily: "'Exo 2', sans-serif" }}>Wk{s.week}</div>
                    <div className="mono text-sm font-bold" style={{ color: textColor }}>{s.points.toFixed(0)}</div>
                    <div className="text-[10px] text-[#6b6e99] mono">#{s.rank}/{s.total}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Draft Picks */}
          {teamDraft.length > 0 && (
            <div className="neon-card overflow-hidden fade-up" style={{ animationDelay: '100ms' }}>
              <h4 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">Draft Picks</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="label px-3 py-2 border-b border-[#2a2e55]">Rd</th>
                    <th className="label px-3 py-2 border-b border-[#2a2e55]">Pick</th>
                    <th className="label px-3 py-2 text-left border-b border-[#2a2e55]">Player</th>
                    <th className="label px-3 py-2 border-b border-[#2a2e55]">Pos</th>
                    <th className="label px-3 py-2 border-b border-[#2a2e55]">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {teamDraft.map(p => (
                    <tr key={p.pick_no} className="border-b border-[rgba(42,46,85,0.4)] hover:bg-[rgba(99,102,241,0.05)]">
                      <td className="px-3 py-2 text-center mono">{p.round}</td>
                      <td className="px-3 py-2 text-center mono">{p.pick_no}</td>
                      <td className="px-3 py-2 text-left text-[#f0f0ff]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{p.metadata?.first_name} {p.metadata?.last_name}</td>
                      <td className="px-3 py-2 text-center"><PosBadge pos={p.metadata?.position || 'UNK'} /></td>
                      <td className="px-3 py-2 text-center mono text-[#6b6e99]">{p.metadata?.team}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FAAB Spending */}
          {teamBids.length > 0 && (
            <div className="neon-card overflow-hidden fade-up" style={{ animationDelay: '150ms' }}>
              <h4 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">
                FAAB Acquisitions
                <span className="ml-2 text-[#f59e0b] mono font-normal">${teamBids.reduce((s, b) => s + b.amount, 0)} spent</span>
              </h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="label px-3 py-2 border-b border-[#2a2e55]">Wk</th>
                    <th className="label px-3 py-2 text-left border-b border-[#2a2e55]">Player</th>
                    <th className="label px-3 py-2 border-b border-[#2a2e55]">Pos</th>
                    <th className="label px-3 py-2 text-right border-b border-[#2a2e55]">Bid</th>
                  </tr>
                </thead>
                <tbody>
                  {teamBids.sort((a, b) => a.week - b.week || b.amount - a.amount).map((bid, i) => (
                    <tr key={i} className="border-b border-[rgba(42,46,85,0.4)] hover:bg-[rgba(99,102,241,0.05)]">
                      <td className="px-3 py-2 text-center mono">{bid.week}</td>
                      <td className="px-3 py-2 text-left text-[#f0f0ff]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{bid.playerName}</td>
                      <td className="px-3 py-2 text-center"><PosBadge pos={bid.position} /></td>
                      <td className={`px-3 py-2 text-right font-semibold mono ${bid.amount >= 50 ? 'text-[#f59e0b]' : bid.amount >= 10 ? 'text-[#f59e0b] opacity-70' : 'text-[#6b6e99]'}`}>
                        ${bid.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
