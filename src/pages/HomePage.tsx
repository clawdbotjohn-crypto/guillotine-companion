import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Shield, Users, ShoppingCart, ChevronRight, Trash2, Trophy } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useAppStore, type RecentLeague } from '../store';
import { useSleeperUser } from '../api';
import { getLeague } from '../api/client';
import { isGuillotineLeague } from '../logic';
import { getCurrentNflSeason, isValidSleeperLeagueId } from '../logic/season';

type DiscoveryMode = 'username' | 'league' | null;
type LeagueError = { source: 'direct' | 'saved'; message: string } | null;

export function HomePage() {
  const [input, setInput] = useState(() => useAppStore.getState().username);
  const [showLeagueId, setShowLeagueId] = useState(false);
  const [leagueIdInput, setLeagueIdInput] = useState('');
  const [searchUsername, setSearchUsername] = useState<string | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>(null);
  const [loadingLeagueId, setLoadingLeagueId] = useState<string | null>(null);
  const [leagueError, setLeagueError] = useState<LeagueError>(null);
  const [deletedLeague, setDeletedLeague] = useState<RecentLeague | null>(null);
  const requestSequence = useRef(0);
  const navigate = useNavigate();
  const {
    setUser,
    setLeague,
    startUsernameDiscovery,
    startLeagueDiscovery,
    removeRecentLeague,
    restoreRecentLeague,
    recentLeagues,
    leagueId,
    leagueName,
    teamName,
  } = useAppStore();

  const { data: sleeperUser, isLoading, isError } = useSleeperUser(searchUsername);

  useEffect(() => {
    if (discoveryMode !== 'username' || !sleeperUser || isLoading) return;
    setUser(sleeperUser.username || sleeperUser.display_name, sleeperUser.user_id);
    navigate('/leagues');
  }, [discoveryMode, isLoading, navigate, setUser, sleeperUser]);

  const handleUsernameSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextUsername = input.trim();
    if (!nextUsername) return;
    requestSequence.current += 1;
    startUsernameDiscovery();
    setInput(nextUsername);
    setLeagueError(null);
    setLoadingLeagueId(null);
    setDiscoveryMode('username');
    setSearchUsername(nextUsername);
  };

  const openLeague = async (rawLeagueId: string, source: 'direct' | 'saved') => {
    const nextLeagueId = rawLeagueId.trim();
    const request = ++requestSequence.current;
    startLeagueDiscovery();
    setDiscoveryMode('league');
    setSearchUsername(null);
    setLeagueError(null);

    if (!isValidSleeperLeagueId(nextLeagueId)) {
      setLeagueError({ source, message: 'Enter a valid numeric Sleeper league ID.' });
      return;
    }

    setLoadingLeagueId(nextLeagueId);
    try {
      const league = await getLeague(nextLeagueId);
      if (request !== requestSequence.current) return;
      if (!isGuillotineLeague(league)) {
        setLeagueError({
          source,
          message: 'That league is not a native Sleeper Guillotine league.',
        });
        return;
      }

      const currentSeason = getCurrentNflSeason();
      if (league.season !== currentSeason) {
        setLeagueError({
          source,
          message: `That league is from ${league.season}. Choose a ${currentSeason} league.`,
        });
        return;
      }

      setLeague(league.league_id, league.name, league.season);
      navigate('/team-select');
    } catch {
      if (request === requestSequence.current) {
        setLeagueError({
          source,
          message: 'League not found. Check the ID and try again.',
        });
      }
    } finally {
      if (request === requestSequence.current) setLoadingLeagueId(null);
    }
  };

  const handleLeagueIdSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void openLeague(leagueIdInput, 'direct');
  };

  const handleDeleteLeague = (league: RecentLeague) => {
    removeRecentLeague(league.leagueId);
    setDeletedLeague(league);
  };

  const handleUndoDelete = () => {
    if (!deletedLeague) return;
    restoreRecentLeague(deletedLeague);
    setDeletedLeague(null);
  };

  const features = [
    { icon: BarChart3, title: 'FAAB Tracker', desc: 'Track every bid across the league', color: '#6366f1' },
    { icon: Shield, title: 'Bid Advisor', desc: 'Smart waiver recommendations', color: '#10b981' },
    { icon: ShoppingCart, title: 'Survival %', desc: 'Know your elimination risk', color: '#f43f5e' },
    { icon: Users, title: 'Scout Teams', desc: "See who's bidding against you", color: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md">
        <div
          className="rounded-3xl p-7 sm:p-10 text-center border border-[rgba(99,102,241,0.2)]"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1), rgba(236,72,153,0.08))' }}
        >
          <div className="mb-8">
            <div className="w-28 h-28 mx-auto mb-4">
              <img src="/logo.png" alt="Guillotine Companion" className="w-full h-full object-contain drop-shadow-[0_4px_20px_rgba(99,102,241,0.4)]" />
            </div>
            <h1 className="font-['Orbitron'] text-2xl font-black uppercase tracking-[2px]
              bg-gradient-to-r from-[#f0f0ff] to-[#a5b4fc] bg-clip-text text-transparent">
              Guillotine Companion
            </h1>
            <p className="text-[#6b6e99] text-sm mt-2">Your survival toolkit for guillotine leagues</p>
          </div>

          {leagueId && teamName && (
            <div className="mb-6">
              <Card className="p-4 cursor-pointer border-l-4 border-l-[#6366f1]" onClick={() => navigate('/hub')}>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs text-[#6b6e99] uppercase tracking-wider">Continue as</p>
                    <p className="text-sm font-bold text-[#f0f0ff]">{teamName}</p>
                    {leagueName && <p className="text-xs text-[#4a4d77]">{leagueName}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#6366f1]" />
                </div>
              </Card>
              <p className="text-[#4a4d77] text-xs uppercase tracking-[2px] mt-4 mb-2">— or find a different league —</p>
            </div>
          )}

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <label htmlFor="sleeper-username" className="sr-only">Sleeper username</label>
            <input
              id="sleeper-username"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Enter your Sleeper username..."
              autoComplete="username"
              className="w-full px-5 py-4 bg-[#0e1025] border border-[#2a2e55] rounded-xl
                text-[#f0f0ff] text-base placeholder-[#4a4d77]
                outline-none transition-all duration-200
                focus:border-[#6366f1] focus:shadow-[0_0_8px_rgba(99,102,241,0.3)]"
            />
            <Button type="submit" className="w-full" disabled={isLoading || !input.trim()}>
              {discoveryMode === 'username' && isLoading ? 'Finding...' : 'Find My Leagues'}
            </Button>
          </form>

          {discoveryMode === 'username' && isError && (
            <p role="alert" className="text-[#f43f5e] text-sm mt-3">
              User not found. Check your Sleeper username.
            </p>
          )}

          <div className="mt-5">
            <p className="text-[#4a4d77] text-xs uppercase tracking-[2px] mb-3">— or —</p>
            {!showLeagueId ? (
              <button
                type="button"
                onClick={() => setShowLeagueId(true)}
                className="text-[#6366f1] text-sm underline underline-offset-4 decoration-[rgba(99,102,241,0.3)]
                  hover:text-[#8b5cf6] transition-colors"
              >
                Paste a league ID directly
              </button>
            ) : (
              <form onSubmit={handleLeagueIdSubmit} className="flex gap-2">
                <label htmlFor="league-id" className="sr-only">Sleeper league ID</label>
                <input
                  id="league-id"
                  type="text"
                  inputMode="numeric"
                  value={leagueIdInput}
                  onChange={(event) => setLeagueIdInput(event.target.value)}
                  placeholder="League ID"
                  className="min-w-0 flex-1 px-4 py-2.5 bg-[#0e1025] border border-[#2a2e55] rounded-lg
                    text-[#f0f0ff] text-sm font-['Space_Mono'] placeholder-[#4a4d77]
                    outline-none focus:border-[#6366f1]"
                />
                <Button size="sm" type="submit" disabled={loadingLeagueId != null}>
                  {loadingLeagueId === leagueIdInput.trim() ? 'Checking...' : 'Go'}
                </Button>
              </form>
            )}
            {leagueError?.source === 'direct' && (
              <p role="alert" className="text-[#f43f5e] text-sm mt-3">{leagueError.message}</p>
            )}
          </div>
        </div>

        {recentLeagues.length > 0 && (
          <section aria-labelledby="recent-leagues-heading" className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div className="text-left">
                <h2 id="recent-leagues-heading" className="font-['Orbitron'] text-xs font-bold uppercase tracking-[0.14em] text-[#a5b4fc]">
                  Saved leagues
                </h2>
                <p className="mt-1 text-xs text-[#4a4d77]">Stored only on this device</p>
              </div>
            </div>
            <div className="space-y-2">
              {recentLeagues.map((league) => (
                <div key={league.leagueId} className="flex items-stretch rounded-xl border border-[#2a2e55] bg-[rgba(14,16,37,0.8)]">
                  <button
                    type="button"
                    onClick={() => void openLeague(league.leagueId, 'saved')}
                    disabled={loadingLeagueId != null}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-4 py-3 text-left transition-colors hover:bg-[rgba(99,102,241,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6366f1] disabled:opacity-50"
                    aria-label={`Open ${league.name}, ${league.season}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(99,102,241,0.14)]">
                      <Trophy className="h-4 w-4 text-[#818cf8]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#f0f0ff]">{league.name}</span>
                      <span className="block text-xs font-['Space_Mono'] text-[#6b6e99]">{league.season}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#4a4d77]" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLeague(league)}
                    className="flex w-12 shrink-0 items-center justify-center rounded-r-xl border-l border-[#2a2e55] text-[#6b6e99] transition-colors hover:bg-[rgba(244,63,94,0.1)] hover:text-[#f43f5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f43f5e]"
                    aria-label={`Remove ${league.name} from saved leagues`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            {leagueError?.source === 'saved' && (
              <p role="alert" className="mt-3 text-sm text-[#f43f5e]">{leagueError.message}</p>
            )}
          </section>
        )}

        <div aria-live="polite" className="mt-3 min-h-8">
          {deletedLeague && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2 text-xs text-[#a5b4fc]">
              <span className="truncate">Removed {deletedLeague.name}</span>
              <button type="button" onClick={handleUndoDelete} className="shrink-0 font-bold uppercase tracking-wider text-[#818cf8] underline underline-offset-2">
                Undo
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {features.map((feature) => (
            <div key={feature.title} className="bg-[rgba(14,16,37,0.6)] border border-[#1a1e3a] rounded-xl p-4 text-left">
              <feature.icon className="w-5 h-5 mb-2" style={{ color: feature.color }} />
              <div className="text-xs font-semibold uppercase tracking-wider text-[#a5b4fc] mb-1">{feature.title}</div>
              <div className="text-[11px] text-[#6b6e99] leading-snug">{feature.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-[#4a4d77] mt-6">
          Works with any native Sleeper guillotine league
        </p>
      </div>
    </div>
  );
}
