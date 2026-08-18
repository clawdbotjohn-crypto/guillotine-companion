import type { LeagueData } from '../useLeagueLoader';
import { Trophy } from 'lucide-react';

export default function Scoreboard({ data }: { data: LeagueData }) {
  const { weekData, teams } = data;

  const sortedTeams = [...teams.values()].sort((a, b) => {
    if (a.eliminatedWeek === null && b.eliminatedWeek === null) return 0;
    if (a.eliminatedWeek === null) return -1;
    if (b.eliminatedWeek === null) return 1;
    return b.eliminatedWeek - a.eliminatedWeek;
  });

  const isFinals = (wd: typeof weekData[0]) => wd.teamsRemaining === 2;

  return (
    <div className="space-y-8">
      {/* Weekly Scoreboard */}
      <div className="neon-card overflow-hidden fade-up">
        <h3 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">Weekly Scoreboard</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="label px-4 py-2 text-left border-b border-[#2a2e55]">Wk</th>
                <th className="label px-4 py-2 text-right border-b border-[#2a2e55]">#</th>
                <th className="label px-4 py-2 text-right border-b border-[#2a2e55]" style={{ color: '#10b981' }}>Top</th>
                <th className="label px-4 py-2 text-right border-b border-[#2a2e55]">Avg</th>
                <th className="label px-4 py-2 text-right border-b border-[#2a2e55]" style={{ color: '#f43f5e' }}>Cutoff</th>
                <th className="label px-4 py-2 text-left border-b border-[#2a2e55]">Eliminated</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map(wd => {
                const finals = isFinals(wd);
                const champion = finals ? wd.scores.find(s => s.rank === 1) : null;
                const runnerUp = finals ? wd.scores.find(s => s.rank === 2) : null;
                return (
                  <tr key={wd.week} className="hover:bg-[rgba(99,102,241,0.05)] transition-colors">
                    <td className="px-4 py-2.5 mono text-sm font-medium">Wk{wd.week}</td>
                    <td className="px-4 py-2.5 mono text-right text-sm">{wd.teamsRemaining}</td>
                    <td className="px-4 py-2.5 mono text-right text-sm text-[#10b981] font-semibold">{wd.topScore.toFixed(1)}</td>
                    <td className="px-4 py-2.5 mono text-right text-sm text-[#f0f0ff]">{wd.avgScore.toFixed(1)}</td>
                    <td className="px-4 py-2.5 mono text-right text-sm text-[#f43f5e]">{wd.cutoffScore.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-left text-xs max-w-[280px]" style={{ fontFamily: "'Exo 2', sans-serif" }}>
                      {finals ? (
                        <span className="flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-[#10b981]" />
                          <span className="text-[#10b981] font-semibold">
                            {champion ? teams.get(champion.rosterId)?.displayName : ''}
                          </span>
                          <span className="text-[#6b6e99] mx-1">|</span>
                          <span className="text-[#6b6e99]">
                            Runner-up: {runnerUp ? teams.get(runnerUp.rosterId)?.displayName : ''}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#f43f5e] opacity-80">
                          {wd.eliminated.map(id => teams.get(id)?.displayName || `#${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Team Scores */}
      <div className="neon-card overflow-hidden fade-up" style={{ animationDelay: '100ms' }}>
        <h3 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">All Team Scores by Week</h3>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="label px-3 py-2 text-left sticky left-0 z-10 border-b border-[#2a2e55]" style={{ background: '#0e1025' }}>Team</th>
                <th className="label px-3 py-2 border-b border-[#2a2e55]">Status</th>
                {weekData.map(wd => (
                  <th key={wd.week} className="label px-3 py-2 border-b border-[#2a2e55]">W{wd.week}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map(team => {
                const isChampion = team.eliminatedWeek === null;
                // Check if this team is the runner-up (finals loser)
                const lastWeek = weekData[weekData.length - 1];
                const isRunnerUp = isChampion && lastWeek && lastWeek.teamsRemaining === 2 &&
                  lastWeek.scores.find(s => s.rosterId === team.rosterId)?.rank === 2;

                return (
                  <tr key={team.rosterId} className="hover:bg-[rgba(99,102,241,0.05)] transition-colors border-b border-[rgba(42,46,85,0.4)]">
                    <td className="px-3 py-1.5 text-left sticky left-0 z-10 font-medium whitespace-nowrap text-[#f0f0ff]" style={{ background: '#06060f', fontFamily: "'Exo 2', sans-serif" }}>
                      {team.displayName}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {isChampion && !isRunnerUp ? (
                        <span className="inline-flex items-center gap-1 text-[#10b981]">
                          <Trophy className="w-3 h-3" />
                        </span>
                      ) : isRunnerUp ? (
                        <span className="mono text-[10px] text-[#6b6e99]">2nd</span>
                      ) : (
                        <span className="mono text-[10px] text-[#f43f5e]">Wk{team.eliminatedWeek}</span>
                      )}
                    </td>
                    {weekData.map(wd => {
                      const score = wd.scores.find(s => s.rosterId === team.rosterId);
                      if (!score) return <td key={wd.week} className="px-3 py-1.5 text-center text-[#2a2e55]">—</td>;
                      const isTop = score.rank === 1;
                      const isElim = wd.eliminated.includes(team.rosterId);
                      const finals = isFinals(wd);
                      const isFinalsWinner = finals && score.rank === 1;
                      const isFinalsLoser = finals && score.rank === 2;
                      return (
                        <td key={wd.week} className={`px-3 py-1.5 text-center mono text-[11px] ${
                          isFinalsWinner ? 'text-[#10b981] font-bold' :
                          isFinalsLoser ? 'text-[#6b6e99]' :
                          isTop ? 'text-[#10b981] font-bold' :
                          isElim ? 'text-[#f43f5e]' :
                          'text-[#f0f0ff]'
                        }`}>
                          {score.points.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
