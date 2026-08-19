// Season Picker — horizontal pill bar for switching between league seasons

import { Loader2 } from 'lucide-react';

interface SeasonInfo {
  leagueId: string;
  season: string;
  name: string;
}

interface SeasonPickerProps {
  seasons: SeasonInfo[];
  currentSeason: string;
  onSelect: (leagueId: string, name: string, season: string) => void;
  isLoading: boolean;
}

export function SeasonPicker({ seasons, currentSeason, onSelect, isLoading }: SeasonPickerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="w-3.5 h-3.5 text-[#6366f1] animate-spin" />
        <span className="text-[10px] text-[#4a4d77] uppercase tracking-wider font-semibold">
          Loading seasons...
        </span>
      </div>
    );
  }

  if (seasons.length < 2) return null;

  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a4d77] mb-2">
        Season
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {seasons.map((s) => {
          const isActive = s.season === currentSeason;
          return (
            <button
              key={s.leagueId}
              onClick={() => {
                if (!isActive) onSelect(s.leagueId, s.name, s.season);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-['Space_Mono'] font-bold uppercase transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                  : 'bg-[#161a3a] text-[#6b6e99] hover:bg-[#1a1e3a] hover:text-[#a5b4fc]'
                }`}
            >
              {s.season}
            </button>
          );
        })}
      </div>
    </div>
  );
}
