import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, X } from 'lucide-react';
import type { Roster, SleeperUser } from '../api';
import type { ManagerBidEvidence, ManagerBiddingProfile } from '../logic/biddingProfiles';
import type { ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
import type { ManagerDetailData, ManagerTeamNeed, ManagerUpcomingBye } from '../logic/managerDetails';

const EMPTY_DETAILS: ManagerDetailData = { upcomingByes: [], teamNeeds: [] };

function bidAmountClass(amount: number, isCapped: boolean) {
  if (isCapped) return 'text-[#f87171]';
  if (amount >= 100) return 'text-[#f59e0b]';
  return 'text-[#34d399]';
}

function ratioText(ratio: number | null) {
  return ratio == null ? '—' : `${ratio.toFixed(2)}×`;
}

function historyPlayerLabel(evidence: ManagerBidEvidence, getPlayerName: (playerId: string) => string) {
  return `${getPlayerName(evidence.playerId)} · Week ${evidence.transactionWeek}`;
}

const STYLE_BADGE_CLASSES: Record<ManagerBiddingProfile['style'], string> = {
  conservative: 'border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#7dd3fc]',
  standard: 'border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#c4b5fd]',
  aggressive: 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]',
  insufficient: 'border-[#4a4d77]/40 bg-[#161a3a] text-[#8b8eb8]',
};

export function ManagerStyleBadge({ style }: { style: ManagerBiddingProfile['style'] }) {
  const classes = STYLE_BADGE_CLASSES[style];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${classes}`}>
      {style === 'standard' ? 'Typical' : style === 'insufficient' ? 'Learning' : `${style[0].toUpperCase()}${style.slice(1)}`}
    </span>
  );
}

function highestBidText(profile: ManagerBiddingProfile) {
  if (profile.evidence.length === 0) return 'Highest bid: No canonical bids';
  return `Highest bid: $${Math.max(...profile.evidence.map((event) => event.actualBid))}`;
}

function HistoryEvent({ evidence, getPlayerName }: { evidence: ManagerBidEvidence; getPlayerName: (playerId: string) => string }) {
  const won = evidence.outcome === 'won';
  return (
    <li className="rounded-xl border border-[#2a2e55] bg-[#0d1022] p-3">
      <p className="truncate text-xs font-medium text-[#f0f0ff]">{historyPlayerLabel(evidence, getPlayerName)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2" aria-label={`Bid metrics for ${getPlayerName(evidence.playerId)}`}>
        <div className="rounded-lg bg-[#121630] px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Suggested bid</p>
          <p className="mt-0.5 font-['Space_Mono'] text-xs text-[#f0f0ff]">${evidence.effectiveBaseline}</p>
        </div>
        <div className="rounded-lg bg-[#121630] px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Actual bid</p>
          <p className={`mt-0.5 font-['Space_Mono'] text-xs font-semibold ${won ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
            ${evidence.actualBid} · {won ? 'Won' : 'Lost'}
          </p>
        </div>
        <div className="rounded-lg bg-[#121630] px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Pre-bid FAAB</p>
          <p className="mt-0.5 font-['Space_Mono'] text-xs text-[#f0f0ff]">${evidence.faabAvailableBeforeBid}</p>
        </div>
        <div className="rounded-lg bg-[#121630] px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Ratio</p>
          <p className="mt-0.5 font-['Space_Mono'] text-xs text-[#f0f0ff]">{ratioText(evidence.eventRatio)}</p>
        </div>
      </div>
    </li>
  );
}

function UpcomingByes({ rows }: { rows: ManagerUpcomingBye[] }) {
  return (
    <section aria-labelledby="manager-upcoming-byes">
      <h3 id="manager-upcoming-byes" className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8dc7]">
        Upcoming byes
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 rounded-lg bg-[#0d1022] px-3 py-2 text-[11px] text-[#6b6e99]">None in the next three weeks.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <li key={row.playerId} className="flex items-center justify-between gap-3 rounded-lg bg-[#0d1022] px-3 py-2">
              <span className="min-w-0 truncate text-xs text-[#f0f0ff]">{row.name}</span>
              <span className="shrink-0 text-[10px] text-[#8b8dc7]">
                {row.position}{row.positionRank ? ` #${row.positionRank}` : ''} · W{row.byeWeek}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamNeeds({ rows }: { rows: ManagerTeamNeed[] }) {
  const emphasized = rows.filter((row) => row.tier !== 'neutral');
  return (
    <section aria-labelledby="manager-team-needs">
      <h3 id="manager-team-needs" className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8dc7]">
        Team needs
      </h3>
      {emphasized.length === 0 ? (
        <p className="mt-2 rounded-lg bg-[#0d1022] px-3 py-2 text-[11px] text-[#6b6e99]">No clear strengths or needs.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {emphasized.map((row) => {
            const strong = row.tier === 'strong';
            const Icon = strong ? ArrowUp : ArrowDown;
            const label = `${row.position} ${strong ? 'strength' : 'need'}, rank ${row.rank} of ${row.outOf}`;
            return (
              <li key={row.position}>
                <span
                  aria-label={label}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${strong
                    ? 'border-[#34d399]/35 bg-[#34d399]/10 text-[#6ee7b7]'
                    : 'border-[#f87171]/35 bg-[#f87171]/10 text-[#fca5a5]'}`}
                >
                  <Icon size={12} aria-hidden="true" /> {row.position}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ManagerDetailsModal({
  profile,
  displayName,
  details = EMPTY_DETAILS,
  getPlayerName = (playerId) => playerId,
  onClose,
}: {
  profile: ManagerBiddingProfile | null;
  displayName?: string;
  details?: ManagerDetailData;
  getPlayerName?: (playerId: string) => string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!profile) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [profile, onClose]);

  if (!profile) return null;

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-detail-title"
        onKeyDown={trapFocus}
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#34386b] bg-[#161a3a] shadow-2xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#2a2e55] px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="manager-detail-title" className="truncate font-['Orbitron'] text-sm font-semibold text-[#f0f0ff]">
                {displayName ?? `Roster ${profile.managerRosterId}`}
              </h2>
              <ManagerStyleBadge style={profile.style} />
            </div>
            <p className="mt-1 text-[10px] text-[#6b6e99]">{profile.evidence.length} canonical bids · {highestBidText(profile)}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close manager details"
            className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#8b8dc7] transition hover:bg-[#24294f] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <UpcomingByes rows={details.upcomingByes} />
          <TeamNeeds rows={details.teamNeeds} />
          <section aria-labelledby="manager-bidding-history">
            <h3 id="manager-bidding-history" className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8dc7]">
              Bidding History
            </h3>
            {profile.evidence.length === 0 ? (
              <p className="mt-2 rounded-lg bg-[#0d1022] px-3 py-2 text-[11px] text-[#6b6e99]">No canonical bids yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {profile.evidence.map((event) => <HistoryEvent key={event.transactionId} evidence={event} getPlayerName={getPlayerName} />)}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ManagerRow({
  prediction,
  onOpen,
}: {
  prediction: ManagerPredictionDisplay;
  onOpen: (selection: { profile: ManagerBiddingProfile; displayName: string }) => void;
}) {
  const capped = prediction.cappedByFaab;
  return (
    <button
      type="button"
      onClick={() => onOpen({ profile: prediction.profile, displayName: prediction.managerName })}
      className={`flex min-h-11 w-full items-center gap-2 rounded-lg border border-[#2a2e55] bg-[#121630] px-3 py-2 text-left transition hover:border-[#4b51a1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8] ${prediction.likelihood === 'Unlikely' ? 'opacity-55' : ''}`}
      aria-label={`Open details for ${prediction.managerName}, predicted bid $${prediction.predictedBid}, ${prediction.likelihood} buyer`}
    >
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#f0f0ff]">{prediction.managerName}</span>
      <span className="shrink-0 text-[10px] text-[#8b8dc7]">{prediction.likelihood}</span>
      <span className={`shrink-0 font-['Space_Mono'] text-sm font-bold ${bidAmountClass(prediction.predictedBid, capped)}`}>
        ${prediction.predictedBid}
      </span>
      {capped && <span className="shrink-0 text-[9px] font-semibold uppercase text-[#fca5a5]">FAAB cap</span>}
      <ChevronRight size={14} className="shrink-0 text-[#6b6e99]" aria-hidden="true" />
      {capped && <span className="sr-only">capped by available FAAB</span>}
    </button>
  );
}

export function ManagerPredictionRow({
  prediction,
  getPlayerName = (playerId) => playerId,
  details = EMPTY_DETAILS,
}: {
  prediction: ManagerPredictionDisplay;
  getPlayerName?: (playerId: string) => string;
  details?: ManagerDetailData;
}) {
  const [selected, setSelected] = useState<{ profile: ManagerBiddingProfile; displayName: string } | null>(null);
  return (
    <>
      <ManagerRow prediction={prediction} onOpen={setSelected} />
      <ManagerDetailsModal
        profile={selected?.profile ?? null}
        displayName={selected?.displayName}
        details={details}
        getPlayerName={getPlayerName}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export function WaiverManagerPredictions({
  predictions,
  detailsByRosterId = new Map(),
  getPlayerName = (playerId) => playerId,
}: {
  predictions: ManagerPredictionDisplay[];
  detailsByRosterId?: ReadonlyMap<number, ManagerDetailData>;
  getPlayerName?: (playerId: string) => string;
}) {
  const [selected, setSelected] = useState<{ profile: ManagerBiddingProfile; displayName: string } | null>(null);
  if (!predictions.length) return null;
  return (
    <>
      <div className="space-y-1.5" data-testid="expanded-manager-list">
        {predictions.map((prediction) => (
          <ManagerRow key={prediction.rosterId} prediction={prediction} onOpen={setSelected} />
        ))}
      </div>
      <ManagerDetailsModal
        profile={selected?.profile ?? null}
        displayName={selected?.displayName}
        details={selected ? detailsByRosterId.get(selected.profile.managerRosterId) : undefined}
        getPlayerName={getPlayerName}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export function TeamBidProfiles({
  profiles,
  rosters,
  users,
  detailsByRosterId = new Map(),
  initialFaab = 1000,
  isLoading = false,
  error = null,
  onRetry,
  getPlayerName = (playerId) => playerId,
}: {
  profiles: ManagerBiddingProfile[];
  rosters: Roster[];
  users: SleeperUser[];
  initialFaab?: number;
  detailsByRosterId?: ReadonlyMap<number, ManagerDetailData>;
  isLoading?: boolean;
  error?: string | Error | null;
  onRetry?: () => void;
  getPlayerName?: (playerId: string) => string;
}) {
  const [selected, setSelected] = useState<{ profile: ManagerBiddingProfile; displayName: string } | null>(null);
  const displayName = (profile: ManagerBiddingProfile) => {
    const roster = rosters.find((row) => row.roster_id === profile.managerRosterId);
    const user = users.find((row) => row.user_id === roster?.owner_id);
    return user?.display_name || user?.username || `Roster ${profile.managerRosterId}`;
  };
  if (isLoading) return <div className="h-24 animate-pulse rounded-xl bg-[#161a3a]" aria-label="Loading bid profiles" />;
  if (error) return <div className="text-xs text-[#fca5a5]"><p>{String(error)}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-2 underline">Retry</button>}</div>;
  if (!profiles.length) {
    return <p className="text-xs text-[#6b6e99]">No canonical manager bid history is available yet.</p>;
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[...profiles]
          .sort((a, b) => (b.managerMultiplier ?? -Infinity) - (a.managerMultiplier ?? -Infinity))
          .map((profile) => {
          const roster = rosters.find((row) => row.roster_id === profile.managerRosterId);
          const currentFaab = Math.max(0, initialFaab - (roster?.settings.waiver_budget_used ?? 0));
          return (
          <button
            type="button"
            key={profile.managerRosterId}
            onClick={() => setSelected({ profile, displayName: displayName(profile) })}
            className="rounded-xl border border-[#2a2e55] bg-[#161a3a] p-4 text-left transition hover:border-[#4b51a1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]"
            aria-label={`Open bid profile for ${displayName(profile)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#f0f0ff]">{displayName(profile)}</p>
                <div className="mt-1"><ManagerStyleBadge style={profile.style} /></div>
                <p className="mt-1 text-[10px] text-[#8b8dc7]">Current FAAB ${currentFaab}</p>
                <p className="mt-0.5 text-[10px] text-[#8b8dc7]">{highestBidText(profile)}</p>
              </div>
              <div className="text-right">
                <p className="font-['Space_Mono'] text-lg font-bold text-[#c4b5fd]">{profile.managerMultiplier == null ? '—' : `${profile.managerMultiplier.toFixed(2)}×`}</p>
                <p className="text-[10px] text-[#6b6e99]">{profile.evidence.length} bids</p>
              </div>
            </div>
          </button>
          );
        })}
      </div>
      <ManagerDetailsModal
        profile={selected?.profile ?? null}
        displayName={selected?.displayName}
        details={selected ? detailsByRosterId.get(selected.profile.managerRosterId) : undefined}
        getPlayerName={getPlayerName}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
