import type { LeagueData } from '../useLeagueLoader';

export default function Scoreboard({ data }: { data: LeagueData }) {
  const { weekData, teams } = data;

  // Get top 5 teams to show as columns (by final placement)
  const sortedTeams = [...teams.values()].sort((a, b) => {
    if (a.eliminatedWeek === null && b.eliminatedWeek === null) return 0;
    if (a.eliminatedWeek === null) return -1;
    if (b.eliminatedWeek === null) return 1;
    return b.eliminatedWeek - a.eliminatedWeek;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-800">
            <th className="px-2 py-2 text-left text-slate-400 font-semibold">Wk</th>
            <th className="px-2 py-2 text-slate-400 font-semibold">#</th>
            <th className="px-2 py-2 text-green-400 font-semibold">Top</th>
            <th className="px-2 py-2 text-slate-400 font-semibold">Avg</th>
            <th className="px-2 py-2 text-red-400 font-semibold">Cut</th>
            <th className="px-2 py-2 text-left text-slate-400 font-semibold">Eliminated</th>
          </tr>
        </thead>
        <tbody>
          {weekData.map(wd => (
            <tr key={wd.week} className="border-b border-slate-800 hover:bg-slate-800/50">
              <td className="px-2 py-1.5 font-medium">Wk{wd.week}</td>
              <td className="px-2 py-1.5 text-center">{wd.teamsRemaining}</td>
              <td className="px-2 py-1.5 text-center text-green-400 font-semibold">{wd.topScore.toFixed(1)}</td>
              <td className="px-2 py-1.5 text-center text-slate-300">{wd.avgScore.toFixed(1)}</td>
              <td className="px-2 py-1.5 text-center text-red-400">{wd.cutoffScore.toFixed(1)}</td>
              <td className="px-2 py-1.5 text-left text-red-400 text-xs max-w-[200px] truncate">
                {wd.eliminated.map(id => teams.get(id)?.displayName || `#${id}`).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Scores detail table - all teams */}
      <h3 className="text-sm font-semibold mt-6 mb-3 text-slate-300">All Team Scores by Week</h3>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800">
              <th className="px-2 py-2 text-left text-slate-400 font-semibold sticky left-0 bg-slate-800 z-10">Team</th>
              <th className="px-2 py-2 text-slate-400 font-semibold">Elim</th>
              {weekData.map(wd => (
                <th key={wd.week} className="px-2 py-2 text-slate-400 font-semibold">W{wd.week}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map(team => (
              <tr key={team.rosterId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-2 py-1 text-left sticky left-0 bg-[#0f1117] font-medium whitespace-nowrap">
                  {team.displayName}
                </td>
                <td className={`px-2 py-1 text-center ${team.eliminatedWeek ? 'text-red-400' : 'text-green-400'}`}>
                  {team.eliminatedWeek ? `Wk${team.eliminatedWeek}` : '🏆'}
                </td>
                {weekData.map(wd => {
                  const score = wd.scores.find(s => s.rosterId === team.rosterId);
                  if (!score) return <td key={wd.week} className="px-2 py-1 text-center text-slate-600">—</td>;
                  const isTop = score.rank === 1;
                  const isElim = wd.eliminated.includes(team.rosterId);
                  return (
                    <td key={wd.week} className={`px-2 py-1 text-center ${isTop ? 'text-green-400 font-bold' : isElim ? 'text-red-400' : 'text-slate-300'}`}>
                      {score.points.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
