import { ChevronRight, Loader2, Trophy } from 'lucide-react';
import type { UserLeague } from '../api/types';
import { Card } from './ui';

interface LeagueChoiceButtonProps {
  league: UserLeague;
  selecting: boolean;
  onSelect: (league: UserLeague) => void;
}

export function LeagueChoiceButton({ league, selecting, onSelect }: LeagueChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(league)}
      disabled={selecting}
      className="group w-full rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] disabled:cursor-wait"
      aria-label={`Select ${league.name}, ${league.total_rosters} teams, ${league.season}`}
    >
      <Card hover={!selecting} className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-[0_2px_10px_rgba(99,102,241,0.3)]">
            <Trophy className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#f0f0ff]">{league.name}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-[#6b6e99]">{league.total_rosters} teams</span>
              <span className="text-[#2a2e55]">·</span>
              <span className="font-['Space_Mono'] text-xs text-[#4a4d77]">{league.season}</span>
            </div>
          </div>
        </div>
        {selecting ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#6366f1]" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#4a4d77] transition-colors group-hover:text-[#6366f1]" aria-hidden="true" />
        )}
      </Card>
    </button>
  );
}
