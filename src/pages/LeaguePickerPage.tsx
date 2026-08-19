import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import { Card, Skeleton } from '../components/ui';
import { useAppStore } from '../store';
import { useUserLeagues } from '../api';
import { getLeagueRosters, getLeagueUsers } from '../api/client';
import { isGuillotineLeague } from '../logic';

export function LeaguePickerPage() {
  const navigate = useNavigate();
  const { username, userId, setLeague, reset } = useAppStore();
  const currentSeason = dayjs().month() >= 2 ? dayjs().year().toString() : (dayjs().year() - 1).toString();

  const { data: leagues, isLoading, isError } = useUserLeagues(userId, currentSeason);

  // Filter to guillotine leagues only
  const guillotineLeagues = leagues?.filter((l) => isGuillotineLeague(l)) || [];

  const [selectingId, setSelectingId] = useState<string | null>(null);
  const { setTeam } = useAppStore();

  const handleSelect = async (league: (typeof guillotineLeagues)[0]) => {
    setLeague(league.league_id, league.name, league.season);

    // If we know the userId (entered via username), try to auto-match their roster
    if (userId) {
      setSelectingId(league.league_id);
      try {
        const [rosters, users] = await Promise.all([
          getLeagueRosters(league.league_id),
          getLeagueUsers(league.league_id),
        ]);

        const myRoster = rosters.find((r) => r.owner_id === userId);
        if (myRoster) {
          const myUser = users.find((u) => u.user_id === userId);
          const displayName = myUser?.display_name ?? username;
          setTeam(myRoster.roster_id, displayName);
          navigate('/hub');
          return;
        }
      } catch {
        // On error, fall through to manual team select
      } finally {
        setSelectingId(null);
      }
    }

    navigate('/team-select');
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => { reset(); navigate('/'); }}
            className="text-[#4a4d77] hover:text-[#a5b4fc] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff]">
              Select League
            </h1>
            <p className="text-sm text-[#6b6e99]">{username}'s guillotine leagues</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} hover={false} className="p-5">
                <Skeleton lines={2} />
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card hover={false} className="p-6 text-center">
            <p className="text-[#f43f5e] text-sm mb-3">Failed to load leagues</p>
            <button
              onClick={() => navigate('/')}
              className="text-[#6366f1] text-sm underline"
            >
              Try again
            </button>
          </Card>
        )}

        {/* No guillotine leagues */}
        {!isLoading && !isError && guillotineLeagues.length === 0 && (
          <Card hover={false} className="p-6 text-center">
            <Trophy className="w-8 h-8 text-[#4a4d77] mx-auto mb-3" />
            <p className="text-[#6b6e99] text-sm mb-1">No guillotine leagues found</p>
            <p className="text-[#4a4d77] text-xs">
              Only leagues with no playoffs (guillotine format) are shown.
              Try a different username or paste a league ID directly.
            </p>
            <button
              onClick={() => navigate('/')}
              className="text-[#6366f1] text-sm underline mt-4"
            >
              Go back
            </button>
          </Card>
        )}

        {/* League list */}
        <div className="space-y-3">
          {guillotineLeagues.map((league) => (
            <Card
              key={league.league_id}
              onClick={() => handleSelect(league)}
              className="p-5 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]
                  flex items-center justify-center shadow-[0_2px_10px_rgba(99,102,241,0.3)]">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[#f0f0ff] font-semibold text-sm">{league.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#6b6e99]">{league.total_rosters} teams</span>
                    <span className="text-[#2a2e55]">·</span>
                    <span className="text-xs font-['Space_Mono'] text-[#4a4d77]">{league.season}</span>
                  </div>
                </div>
              </div>
              {selectingId === league.league_id ? (
                <Loader2 className="w-4 h-4 text-[#6366f1] animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#4a4d77] group-hover:text-[#6366f1] transition-colors" />
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
