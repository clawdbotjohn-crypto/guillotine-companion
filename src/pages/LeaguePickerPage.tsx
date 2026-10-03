import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import { Card, Skeleton } from '../components/ui';
import { useAppStore } from '../store';
import { useUserLeagues } from '../api';
import { getLeagueRosters, getLeagueUsers } from '../api/client';
import { classifyGuillotineLeague } from '../logic';
import { groupLeagueChoices } from '../logic/leagueIdentity';
import { LeagueChoiceButton } from '../components/LeagueChoiceButton';

export function LeaguePickerPage() {
  const navigate = useNavigate();
  const { username, userId, setLeague, reset } = useAppStore();
  const currentSeason = dayjs().month() >= 2 ? dayjs().year().toString() : (dayjs().year() - 1).toString();

  const { data: leagues, isLoading, isError } = useUserLeagues(userId, currentSeason);

  // Sleeper's native type is the format authority. Unknown values stay visible but quarantined.
  const leagueChoices = groupLeagueChoices(leagues);
  const guillotineLeagues = leagueChoices.guillotine;

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
            type="button"
            aria-label="Back to home"
            onClick={() => { reset(); navigate('/'); }}
            className="rounded text-[#4a4d77] transition-colors hover:text-[#a5b4fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
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
              No NFL leagues identified by Sleeper as type 3 were found.
              Unknown formats are listed below but cannot be opened safely.
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
            <LeagueChoiceButton
              key={league.league_id}
              league={league}
              selecting={selectingId === league.league_id}
              onSelect={(selectedLeague) => void handleSelect(selectedLeague)}
            />
          ))}

          {(leagueChoices.unknown.length > 0 || leagueChoices.other.length > 0) && (
            <section className="pt-5" aria-labelledby="other-leagues-heading">
              <h2 id="other-leagues-heading" className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6e99]">
                Other Sleeper leagues
              </h2>
              <div className="space-y-2">
                {[...leagueChoices.unknown, ...leagueChoices.other].map((league) => {
                  const unknown = classifyGuillotineLeague(league) === 'unknown';
                  return (
                    <Card key={league.league_id} hover={false} className="flex items-center justify-between gap-3 p-4 opacity-75">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#c7c9e8]">{league.name}</div>
                        <div className="mt-1 text-xs text-[#6b6e99]">{league.total_rosters} teams · {league.season}</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${unknown ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]' : 'border-[#4a4d77] bg-[#161a3a] text-[#8b8fb5]'}`}>
                        {unknown ? 'Format unknown' : 'Not guillotine'}
                      </span>
                    </Card>
                  );
                })}
              </div>
              {leagueChoices.unknown.length > 0 && (
                <p className="mt-2 text-[10px] leading-relaxed text-[#6b6e99]">
                  Missing or unrecognized Sleeper sport/type values are not accepted as guillotine leagues.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
