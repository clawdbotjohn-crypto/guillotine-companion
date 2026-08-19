import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function TopHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { leagueName, leagueSeason, reset } = useAppStore();

  const isTeamProfile = location.pathname.startsWith('/teams/');

  const handleHome = () => {
    reset();
    navigate('/');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: '#0a0d1a',
        borderBottom: '1px solid #2a2e55',
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {isTeamProfile && (
          <button
            onClick={() => navigate('/teams')}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Back to teams"
          >
            <ArrowLeft size={18} color="#6b6e99" />
          </button>
        )}
        <button
          onClick={handleHome}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
          }}
          aria-label="Switch league"
        >
          <span
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#f0f0ff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '180px',
              display: 'block',
            }}
          >
            {leagueName || 'League'}
          </span>
          {leagueSeason && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: "'Space Mono', monospace",
                color: '#6b6e99',
                background: '#1a1d3a',
                borderRadius: '4px',
                padding: '1px 5px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {leagueSeason}
            </span>
          )}
        </button>
      </div>

      {/* Right side */}
      <button
        onClick={handleHome}
        style={{
          background: 'none',
          border: 'none',
          padding: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '6px',
        }}
        aria-label="Switch league"
      >
        <ArrowLeftRight size={18} color="#6b6e99" />
      </button>
    </header>
  );
}
