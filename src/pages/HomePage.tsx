import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Shield, Users, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui';
import { useAppStore } from '../store';
import { useSleeperUser } from '../api';

export function HomePage() {
  const [input, setInput] = useState('');
  const [showLeagueId, setShowLeagueId] = useState(false);
  const [leagueIdInput, setLeagueIdInput] = useState('');
  const navigate = useNavigate();
  const { setUser, setLeague } = useAppStore();

  // Username lookup
  const [searchUsername, setSearchUsername] = useState<string | null>(null);
  const { data: sleeperUser, isLoading, isError } = useSleeperUser(searchUsername);

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setSearchUsername(input.trim());
    }
  };

  const handleLeagueIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leagueIdInput.trim()) {
      setLeague(leagueIdInput.trim(), '', '');
      navigate('/leagues');
    }
  };

  // Once we have a user, navigate to league picker
  if (sleeperUser && !isLoading) {
    setUser(sleeperUser.username || sleeperUser.display_name, sleeperUser.user_id);
    navigate('/leagues');
  }

  const features = [
    { icon: BarChart3, title: 'FAAB Tracker', desc: 'Track every bid across the league', color: '#6366f1' },
    { icon: Shield, title: 'Bid Advisor', desc: 'Smart waiver recommendations', color: '#10b981' },
    { icon: ShoppingCart, title: 'Survival %', desc: 'Know your elimination risk', color: '#f43f5e' },
    { icon: Users, title: 'Scout Teams', desc: "See who's bidding against you", color: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="rounded-3xl p-10 text-center border border-[rgba(99,102,241,0.2)]"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1), rgba(236,72,153,0.08))' }}>

          {/* Logo */}
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

          {/* Username Input */}
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your Sleeper username..."
              className="w-full px-5 py-4 bg-[#0e1025] border border-[#2a2e55] rounded-xl
                text-[#f0f0ff] text-base placeholder-[#4a4d77]
                outline-none transition-all duration-200
                focus:border-[#6366f1] focus:shadow-[0_0_8px_rgba(99,102,241,0.3)]"
            />
            <Button type="submit" className="w-full" disabled={isLoading || !input.trim()}>
              {isLoading ? 'Finding...' : 'Find My Leagues'}
            </Button>
          </form>

          {isError && (
            <p className="text-[#f43f5e] text-sm mt-3">
              User not found. Check your Sleeper username.
            </p>
          )}

          {/* League ID fallback */}
          <div className="mt-5">
            <p className="text-[#4a4d77] text-xs uppercase tracking-[2px] mb-3">— or —</p>
            {!showLeagueId ? (
              <button
                onClick={() => setShowLeagueId(true)}
                className="text-[#6366f1] text-sm underline underline-offset-4 decoration-[rgba(99,102,241,0.3)]
                  hover:text-[#8b5cf6] transition-colors"
              >
                Paste a league ID directly
              </button>
            ) : (
              <form onSubmit={handleLeagueIdSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={leagueIdInput}
                  onChange={(e) => setLeagueIdInput(e.target.value)}
                  placeholder="League ID"
                  className="flex-1 px-4 py-2.5 bg-[#0e1025] border border-[#2a2e55] rounded-lg
                    text-[#f0f0ff] text-sm font-['Space_Mono'] placeholder-[#4a4d77]
                    outline-none focus:border-[#6366f1]"
                />
                <Button size="sm" type="submit">Go</Button>
              </form>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          {features.map((f) => (
            <div key={f.title} className="bg-[rgba(14,16,37,0.6)] border border-[#1a1e3a] rounded-xl p-4 text-left">
              <f.icon className="w-5 h-5 mb-2" style={{ color: f.color }} />
              <div className="text-xs font-semibold uppercase tracking-wider text-[#a5b4fc] mb-1">{f.title}</div>
              <div className="text-[11px] text-[#6b6e99] leading-snug">{f.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-[#4a4d77] mt-6">
          Works with any Sleeper guillotine league
        </p>
      </div>
    </div>
  );
}
