import { AlertTriangle, BarChart3, ChevronDown, RefreshCw } from 'lucide-react';
import type { Roster, SleeperUser } from '../api';
import type { ManagerBiddingProfile, ManagerBidStyle } from '../logic';
import {
  currentFaab,
  managerName,
  type BuyerLikelihood,
  type ManagerPredictionDisplay,
} from '../logic/managerPredictionDisplay';
import { Button, Card, Skeleton } from './ui';

function behaviorLabel(style: ManagerBidStyle): string {
  if (style === 'standard') return 'Typical';
  if (style === 'insufficient') return 'Not enough history';
  return style[0].toUpperCase() + style.slice(1);
}

const BEHAVIOR_CLASSES: Record<ManagerBidStyle, string> = {
  conservative: 'border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#7dd3fc]',
  standard: 'border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#c4b5fd]',
  aggressive: 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]',
  insufficient: 'border-[#4a4d77]/40 bg-[#161a3a] text-[#8b8eb8]',
};

const LIKELIHOOD_CLASSES: Record<BuyerLikelihood, string> = {
  Likely: 'text-[#34d399]',
  Possible: 'text-[#fbbf24]',
  Unlikely: 'text-[#8b8eb8]',
};

export function BiddingHistory({
  profile,
  getPlayerName,
}: {
  profile: ManagerBiddingProfile;
  getPlayerName: (playerId: string) => string;
}) {
  return (
    <details className="group/history mt-2 rounded-lg border border-[#242849] bg-[#0a0d1a]">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#a5b4fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6366f1] [&::-webkit-details-marker]:hidden">
        Bidding History
        <ChevronDown size={13} className="transition-transform group-open/history:rotate-180" />
      </summary>
      <div className="border-t border-[#242849] px-3 py-2">
        {profile.evidence.length === 0 ? (
          <p className="text-[11px] text-[#6b6e99]">Not enough history yet.</p>
        ) : (
          <div className="space-y-1.5">
            {profile.evidence.map((row) => (
              <div key={row.transactionId} className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
                <span className="truncate text-[#f0f0ff]">{getPlayerName(row.playerId)} · Wk {row.transactionWeek} · {row.outcome === 'won' ? 'Won' : 'Lost'}</span>
                <span className="font-['Space_Mono'] text-[#8b8ec7] sm:text-right">
                  Suggested ${row.effectiveBaseline == null ? '—' : Math.round(row.effectiveBaseline)} · Actual ${Math.round(row.actualBid)} · FAAB ${Math.round(row.faabAvailableBeforeBid)} · Ratio {row.eventRatio == null ? '—' : `${row.eventRatio.toFixed(2)}×`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

export function ManagerPredictionRow({
  prediction,
  getPlayerName,
}: {
  prediction: ManagerPredictionDisplay;
  getPlayerName: (playerId: string) => string;
}) {
  return (
    <div className="rounded-lg border border-[#202442] bg-[#0c0f22] px-3 py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#f0f0ff]">{prediction.managerName}</p>
          <p className="mt-0.5 text-[9px] text-[#8b8eb8]">
            {prediction.profile.managerMultiplier?.toFixed(2)}× · {behaviorLabel(prediction.profile.style)}
          </p>
          <p className={`mt-0.5 text-[10px] ${LIKELIHOOD_CLASSES[prediction.likelihood]}`}>
            {prediction.likelihood} buyer
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-['Space_Mono'] text-sm font-bold tabular-nums text-[#34d399]">${prediction.predictedBid}</p>
          <p className="text-[9px] text-[#6b6e99]">${prediction.currentFaab} left</p>
        </div>
      </div>
      <BiddingHistory profile={prediction.profile} getPlayerName={getPlayerName} />
    </div>
  );
}

export function TeamBidProfiles({
  profiles,
  rosters,
  users,
  initialFaab,
  isLoading,
  error,
  onRetry,
  getPlayerName,
}: {
  profiles: ManagerBiddingProfile[];
  rosters: Roster[];
  users: SleeperUser[];
  initialFaab: number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  getPlayerName: (playerId: string) => string;
}) {
  const sorted = [...profiles].sort((a, b) =>
    (b.managerMultiplier ?? Number.NEGATIVE_INFINITY)
      - (a.managerMultiplier ?? Number.NEGATIVE_INFINITY)
    || managerName(a.managerRosterId, rosters, users)
      .localeCompare(managerName(b.managerRosterId, rosters, users)));

  return (
    <section className="mb-6" aria-labelledby="bid-profiles-title">
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 size={16} className="text-[#a78bfa]" />
        <h2 id="bid-profiles-title" className="text-sm font-semibold text-[#f0f0ff]">Bid Profiles</h2>
      </div>
      {isLoading ? (
        <Card hover={false} className="p-4"><Skeleton lines={3} /></Card>
      ) : error ? (
        <Card hover={false} className="p-4 text-center">
          <AlertTriangle size={24} className="mx-auto text-[#f59e0b]" />
          <p className="mt-2 text-xs text-[#8b8ec7]">Bid profiles are unavailable.</p>
          <Button size="sm" variant="ghost" className="mt-3" onClick={onRetry}><RefreshCw size={12} className="mr-1 inline" />Retry</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((profile) => {
            const faab = currentFaab(profile.managerRosterId, rosters, initialFaab);
            return (
              <details key={profile.managerRosterId} className="group rounded-xl border border-[#242849] bg-[#10132b] open:border-[#4f46e5]/50">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6366f1] [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#f0f0ff]">{managerName(profile.managerRosterId, rosters, users)}</p>
                    <p className="mt-0.5 text-[10px] text-[#6b6e99]">Current FAAB ${faab}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${BEHAVIOR_CLASSES[profile.style]}`}>
                      {profile.managerMultiplier == null ? '' : `${profile.managerMultiplier.toFixed(2)}× · `}{behaviorLabel(profile.style)}
                    </span>
                    <ChevronDown size={14} className="text-[#6b6e99] transition-transform group-open:rotate-180" />
                  </div>
                </summary>
                <div className="border-t border-[#242849] px-4 pb-4 pt-3">
                  <p className="text-[11px] leading-relaxed text-[#8b8ec7]">
                    {profile.style === 'aggressive' && 'Often bids more than the typical winning amount.'}
                    {profile.style === 'standard' && 'Usually bids near the typical winning amount.'}
                    {profile.style === 'conservative' && 'Often bids less than the typical winning amount.'}
                    {profile.style === 'insufficient' && 'Not enough usable bidding history to identify a pattern.'}
                  </p>
                  <BiddingHistory profile={profile} getPlayerName={getPlayerName} />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
