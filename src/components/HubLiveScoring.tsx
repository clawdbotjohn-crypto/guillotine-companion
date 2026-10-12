import { useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import type { LiveScoringModel } from '../logic/liveScoring';
import { TeamScoringDialog } from './TeamScoringDialog';
import { StatusBadge } from './ui';

export function HubLiveScoring({
  week,
  model,
  isActive,
  isLoading = false,
  isRefreshing = false,
  unavailableReason,
  currentRosterId,
  onRefresh,
}: {
  week: number | null;
  model: LiveScoringModel | null;
  isActive: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
  unavailableReason?: string;
  currentRosterId?: number | null;
  onRefresh: () => void | Promise<unknown>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const owner = model?.teams.find((team) => team.rosterId === currentRosterId) ?? null;

  if (!isActive) return null;

  if (!owner || !model) {
    return (
      <div className="mb-4 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#4b3040] bg-[#351b25]/35 px-3 py-2" role="status">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#df7d8a]">Live scoring</p>
          <p className="mt-0.5 truncate text-xs text-[#aaaac8]">
            {isLoading ? 'Loading official scores…' : unavailableReason ?? 'Scoring data is unavailable.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading || isRefreshing}
          aria-label={isRefreshing ? 'Refreshing live scores…' : 'Retry live scores'}
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[#df7d8a] hover:bg-[#5c2633]/30 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label={`Open Week ${week ?? ''} scoring for ${owner.displayName}`.replace('Week  scoring', 'scoring')}
        className="mb-4 flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#8a3d4d]/55 bg-[#4a202b]/25 px-3 py-2.5 text-left shadow-[0_8px_28px_rgba(95,31,45,0.12)] transition-colors hover:border-[#b95768]/70 hover:bg-[#4a202b]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#de7b88]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7a3040]/25 text-[#e0838f]">
          <Radio className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#e0838f]">
            Live{week == null ? '' : ` · Week ${week}`}
          </span>
          <span className="mt-0.5 flex min-w-0 items-baseline gap-2">
            <span className="font-['Space_Mono'] text-xl font-bold tabular-nums text-[#f6f0f3]">{owner.officialPoints.toFixed(1)}</span>
            <span className="truncate text-[10px] text-[#9d9dbb]">current points</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {owner.eliminated ? (
            <StatusBadge status="eliminated" />
          ) : owner.standing ? (
            <>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-[#9393b2]">Projected rank</span>
              <span className="font-['Space_Mono'] text-xs font-semibold tabular-nums text-[#d6d6ec]">
                {owner.standing.rank}/{model.activeTeamCount}
              </span>
              <StatusBadge status={owner.standing.risk} />
            </>
          ) : null}
        </span>
      </button>
      <TeamScoringDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        team={owner}
        model={model}
        week={week}
      />
    </>
  );
}
