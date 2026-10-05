import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { LiveScoringModel } from '../logic/liveScoring';
import { formatLiveUpdatedAt, getLiveFreshness, LIVE_FRESHNESS_MS, riskLabel } from '../logic/liveScoring';
import { Card, StatusBadge } from './ui';

export function HubLiveScoring({
  week,
  model,
  isLoading = false,
  isRefreshing = false,
  unavailableReason,
  updatedAt,
  currentRosterId,
  onRefresh,
  now,
}: {
  week: number | null;
  model: LiveScoringModel | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  unavailableReason?: string;
  updatedAt?: number | null;
  currentRosterId?: number | null;
  onRefresh: () => void | Promise<unknown>;
  now?: number;
}) {
  const [clock, setClock] = useState(now ?? Date.now);
  useEffect(() => {
    if (now != null || !updatedAt) return undefined;
    const delay = updatedAt + LIVE_FRESHNESS_MS - Date.now() + 1;
    if (delay <= 0) return undefined;
    const timer = window.setTimeout(() => setClock(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [now, updatedAt]);
  const freshness = getLiveFreshness(updatedAt, now ?? clock);
  const canRefresh = week != null && !isRefreshing;
  const refreshLabel = isRefreshing ? 'Refreshing live scores…' : 'Refresh live scores';

  return (
    <Card hover={false} className="p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#a5b4fc]">
            {week == null ? 'Live scoring' : `Week ${week} live scoring`}
          </h2>
          <p className="text-[10px] text-[#6b6e99] mt-1">
            <span className={freshness === 'stale' ? 'text-[#f59e0b]' : freshness === 'fresh' ? 'text-[#10b981]' : ''}>
              {freshness === 'fresh' ? 'Fresh' : freshness === 'stale' ? 'Stale' : 'Freshness unavailable'}
            </span>
            {' · '}{formatLiveUpdatedAt(updatedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={!canRefresh}
          aria-label={refreshLabel}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#2a2e5a] px-2.5 text-[10px] font-semibold text-[#a5b4fc] transition-colors hover:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="sr-only" aria-live="polite">{isRefreshing ? 'Refreshing live scoring data' : ''}</div>

      {isLoading && !model ? (
        <p className="py-5 text-center text-xs text-[#6b6e99]">Loading official scores and game status…</p>
      ) : !model ? (
        <div className="rounded-lg border border-[#2a2e5a] bg-[#0d1028] px-3 py-4 text-center">
          <p className="text-xs font-medium text-[#c7c8e8]">Live scoring unavailable</p>
          <p className="mt-1 text-[10px] text-[#6b6e99]">{unavailableReason ?? 'Sleeper live data is not available for this week.'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_4.8rem_5.5rem] gap-2 border-b border-[#24284f] pb-2 text-[9px] font-semibold uppercase tracking-wider text-[#6b6e99]">
            <span>Team</span>
            <span className="text-right">Official<br /><span className="normal-case tracking-normal">Sleeper</span></span>
            <span className="text-right">App projection</span>
          </div>
          <ol className="divide-y divide-[#202449]">
            {model.teams.map((team) => (
              <li
                key={team.rosterId}
                className={`grid grid-cols-[minmax(0,1fr)_4.8rem_5.5rem] gap-2 py-2.5 ${team.rosterId === currentRosterId ? 'rounded bg-[#6366f1]/[0.07]' : ''}`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-[#f0f0ff]">{team.displayName}</span>
                    {team.eliminated && <span className="shrink-0 rounded bg-[#f43f5e]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#fb7185]">Eliminated</span>}
                  </div>
                  <p className="mt-1 text-[9px] text-[#6b6e99]">
                    {team.eliminated
                      ? 'Excluded from survival rank'
                      : team.standing
                        ? `${team.standing.rank}/${model.activeTeamCount} projected · ${riskLabel(team.standing.risk)}`
                        : 'Projected survival rank unavailable'}
                  </p>
                  {(team.playersRemaining > 0 || team.playersInProgress > 0) && (
                    <p className="text-[9px] text-[#4f5390]">
                      {team.playersRemaining} remaining · {team.playersInProgress} in progress
                    </p>
                  )}
                </div>
                <span className="self-center text-right font-['Space_Mono'] text-xs tabular-nums text-[#f0f0ff]">
                  {team.officialPoints == null ? '—' : team.officialPoints.toFixed(1)}
                </span>
                <div className="self-center text-right">
                  <span className="block font-['Space_Mono'] text-xs tabular-nums text-[#a5b4fc]">
                    {team.projectedFinal == null ? '—' : team.projectedFinal.toFixed(1)}
                  </span>
                  <span className={`text-[8px] uppercase ${team.projectionQuality === 'partial' ? 'text-[#f59e0b]' : 'text-[#6b6e99]'}`}>
                    {team.projectionQuality === 'full' ? 'App projection' : team.projectionQuality}
                  </span>
                  {!team.eliminated && team.standing && <span className="mt-0.5 flex justify-end"><StatusBadge status={team.standing.risk} /></span>}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 border-t border-[#24284f] pt-2 text-[9px] leading-relaxed text-[#6b6e99]">
            {model.projectedCutline == null
              ? 'Projected cutline unavailable until every surviving team has a usable app projection.'
              : `App-projected cutline: ${model.projectedCutline.toFixed(1)} · ${model.activeTeamCount} active survivors`}
            <span className="block mt-1">App projections use actual starters, Sleeper weekly projections, and defensively available game progress. They are not official Sleeper final scores.</span>
          </div>
        </>
      )}
    </Card>
  );
}
