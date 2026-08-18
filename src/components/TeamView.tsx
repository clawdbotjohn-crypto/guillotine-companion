import type { LeagueData } from '../useLeagueLoader';
import { getTeamBids } from '../logic';

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

  // Team scores across weeks
  const teamScores = selectedTeam
    ? weekData.map(wd => {
        const score = wd.scores.find(s => s.rosterId === selectedTeam);
        return score ? { week: wd.week, points: score.points, rank: score.rank, total: wd.teamsRemaining } : null;
      }).filter(Boolean) as { week: number; points: number; rank: number; total: number }[]
    : [];

  // FAAB tracking (for display)

  return (
    <div>
      {/* Team Selector */}
      <div className="mb-4">
        <select
          value={selectedTeam || ''}
          onChange={e => setSelectedTeam(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Select a team...</option>
          {sortedTeams.map(t => (
            <option key={t.rosterId} value={t.rosterId}>
              {t.displayName} {t.eliminatedWeek ? `(Elim Wk${t.eliminatedWeek})` : '🏆'}
            </option>
          ))}
        </select>
      </div>

      {team && (
        <div className="space-y-6">
          {/* Team Header */}
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold">{team.displayName}</h3>
            <p className={`text-sm ${team.eliminatedWeek ? 'text-red-400' : 'text-green-400'}`}>
              {team.eliminatedWeek ? `Eliminated Week ${team.eliminatedWeek}` : '🏆 Champion / Finalist'}
            </p>
          </div>

          {/* Week-by-Week Scores */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-300">Week-by-Week Performance</h4>
            <div className="flex flex-wrap gap-2">
              {teamScores.map(s => {
                const pct = s.rank / s.total;
                const cls = pct <= 0.1 ? 'border-green-500/50 bg-green-900/20 text-green-400'
                  : pct >= 0.9 ? 'border-red-500/50 bg-red-900/20 text-red-400'
                  : pct <= 0.33 ? 'border-slate-600 bg-slate-800'
                  : 'border-yellow-600/30 bg-yellow-900/10';
                return (
                  <div key={s.week} className={`w-16 p-2 rounded-lg border text-center ${cls}`}>
                    <div className="text-[10px] text-slate-500">Wk{s.week}</div>
                    <div className="text-sm font-bold">{s.points.toFixed(0)}</div>
                    <div className="text-[10px] text-slate-500">#{s.rank}/{s.total}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Draft Picks */}
          {teamDraft.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-slate-300">Draft Picks</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-2 py-1.5 text-slate-400">Rd</th>
                    <th className="px-2 py-1.5 text-slate-400">Pick</th>
                    <th className="px-2 py-1.5 text-left text-slate-400">Player</th>
                    <th className="px-2 py-1.5 text-slate-400">Pos</th>
                    <th className="px-2 py-1.5 text-slate-400">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {teamDraft.map(p => (
                    <tr key={p.pick_no} className="border-b border-slate-800/50">
                      <td className="px-2 py-1 text-center">{p.round}</td>
                      <td className="px-2 py-1 text-center">{p.pick_no}</td>
                      <td className="px-2 py-1 text-left">{p.metadata?.first_name} {p.metadata?.last_name}</td>
                      <td className="px-2 py-1 text-center">{p.metadata?.position}</td>
                      <td className="px-2 py-1 text-center">{p.metadata?.team}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FAAB Spending */}
          {teamBids.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-slate-300">FAAB Acquisitions (${teamBids.reduce((s, b) => s + b.amount, 0)} spent)</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-2 py-1.5 text-slate-400">Wk</th>
                    <th className="px-2 py-1.5 text-left text-slate-400">Player</th>
                    <th className="px-2 py-1.5 text-slate-400">Pos</th>
                    <th className="px-2 py-1.5 text-right text-slate-400">Bid</th>
                  </tr>
                </thead>
                <tbody>
                  {teamBids.sort((a, b) => a.week - b.week || b.amount - a.amount).map((bid, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="px-2 py-1 text-center">{bid.week}</td>
                      <td className="px-2 py-1 text-left">{bid.playerName}</td>
                      <td className="px-2 py-1 text-center">{bid.position}</td>
                      <td className={`px-2 py-1 text-right font-semibold ${bid.amount >= 50 ? 'text-green-400' : bid.amount >= 10 ? 'text-yellow-400' : 'text-slate-400'}`}>
                        ${bid.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
