import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ChevronRight } from 'lucide-react';
import { Card, Skeleton } from '../components/ui';
import { useAppStore } from '../store';
import { useLeagueUsers, useRosters } from '../api';

export function TeamSelectPage() {
  const navigate = useNavigate();
  const { leagueId, leagueName, setTeam } = useAppStore();

  const { data: users, isLoading: usersLoading } = useLeagueUsers(leagueId);
  const { data: rosters, isLoading: rostersLoading } = useRosters(leagueId);

  const isLoading = usersLoading || rostersLoading;

  const userMap = new Map(users?.map((u) => [u.user_id, u]) || []);

  const teams = rosters
    ?.map((r) => {
      const user = userMap.get(r.owner_id);
      return {
        rosterId: r.roster_id,
        displayName: user?.display_name || `Team ${r.roster_id}`,
        avatar: user?.avatar || null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName)) || [];

  const handleSelect = (team: (typeof teams)[0]) => {
    setTeam(team.rosterId, team.displayName);
    navigate('/hub');
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/leagues')}
            className="text-[#4a4d77] hover:text-[#a5b4fc] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff]">
              Your Team
            </h1>
            <p className="text-sm text-[#6b6e99]">{leagueName || 'Select your team'}</p>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} hover={false} className="p-4">
                <Skeleton lines={1} />
              </Card>
            ))}
          </div>
        )}

        {/* Team list */}
        <div className="space-y-2">
          {teams.map((team) => (
            <Card
              key={team.rosterId}
              onClick={() => handleSelect(team)}
              className="p-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#161a3a] flex items-center justify-center">
                  {team.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${team.avatar}`}
                      alt=""
                      className="w-9 h-9 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4 text-[#4a4d77]" />
                  )}
                </div>
                <span className="text-[#f0f0ff] font-medium text-sm">{team.displayName}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#4a4d77] group-hover:text-[#6366f1] transition-colors" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
