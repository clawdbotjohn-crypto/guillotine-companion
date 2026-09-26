import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Minus, X } from 'lucide-react';
import type { Roster, SleeperUser } from '../api';
import type { ManagerBiddingProfile, ManagerBidEvidence, ManagerBidStyle } from '../logic';
import type { ManagerDetailData, ManagerTeamNeed } from '../logic/managerDetails';
import { currentFaab, managerName, orderManagerPredictions, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
import { faabQuartile, faabQuartileLabel, type FaabQuartileBand } from '../logic/rankingQuartiles';
import { Button, Card, Skeleton } from './ui';

const EMPTY_DETAILS: ManagerDetailData = { upcomingByes: [], teamNeeds: [] };

function styleClasses(style: ManagerBidStyle) {
  if (style === 'aggressive') return 'border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.1)] text-[#fbbf24]';
  if (style === 'conservative') return 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.1)] text-[#34d399]';
  if (style === 'standard') return 'border-[rgba(99,102,241,0.45)] bg-[rgba(99,102,241,0.1)] text-[#a5b4fc]';
  return 'border-[#34385f] bg-[#151831] text-[#8b8eb8]';
}

function styleLabel(style: Exclude<ManagerBidStyle, 'insufficient'>) {
  return `${style[0].toUpperCase()}${style.slice(1)}`;
}

function historyPlayerLabel(evidence: ManagerBidEvidence, getPlayerName: (playerId: string) => string) {
  return `${getPlayerName(evidence.playerId)} · Week ${evidence.transactionWeek}`;
}

function ratioText(value: number | null) {
  return value == null ? 'Unavailable' : `${value.toFixed(2)}x`;
}

export function ManagerStyleBadge({ profile }: { profile: ManagerBiddingProfile }) {
  if (profile.style === 'insufficient') return null;
  const multiplier = profile.managerMultiplier;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${styleClasses(profile.style)}`}>
      {styleLabel(profile.style)}
      {multiplier != null && Number.isFinite(multiplier) && (
        <span className="ml-1 font-['Space_Mono'] normal-case tabular-nums">· {multiplier.toFixed(2)}x</span>
      )}
    </span>
  );
}

function highestBid(profile: ManagerBiddingProfile): number | null {
  if (profile.evidence.length === 0) return null;
  return Math.max(...profile.evidence.map((event) => event.actualBid));
}

function HistoryEvent({ evidence, getPlayerName }: { evidence: ManagerBidEvidence; getPlayerName: (playerId: string) => string }) {
  const won = evidence.outcome === 'won';
  return (
    <article className="rounded-xl bg-[#0d1022] p-3">
      <p className="truncate text-xs font-medium text-[#f0f0ff]">{historyPlayerLabel(evidence, getPlayerName)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2" aria-label={`Bid metrics for ${getPlayerName(evidence.playerId)}`}>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Suggested bid</p>
          <p className="mt-0.5 font-['Space_Mono'] text-xs text-[#f0f0ff]">{evidence.effectiveBaseline == null ? '—' : `$${evidence.effectiveBaseline}`}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Actual bid</p>
          <p className={`mt-0.5 font-['Space_Mono'] text-xs ${won ? 'text-[#34d399]' : 'text-[#fb7185]'}`}>
            ${evidence.actualBid} · {won ? 'Won' : 'Lost'}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Pre-bid FAAB</p>
          <p className="mt-0.5 font-['Space_Mono'] text-xs text-[#f0f0ff]">${evidence.faabAvailableBeforeBid}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Ratio</p>
          <p className="mt-0.5 font-['Space_Mono'] text-xs text-[#f0f0ff]">{ratioText(evidence.eventRatio)}</p>
        </div>
      </div>
    </article>
  );
}

function UpcomingByes({ rows }: { rows: ManagerDetailData['upcomingByes'] }) {
  return (
    <section aria-labelledby="manager-upcoming-byes">
      <h3 id="manager-upcoming-byes" className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8b8eb8]">Upcoming byes</h3>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-[#0d1022] px-3 py-2 text-[11px] text-[#6b6e99]">No byes in the next few weeks.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.playerId} className="flex items-center justify-between gap-3 rounded-lg bg-[#0d1022] px-3 py-2">
              <span className="min-w-0 truncate text-xs text-[#f0f0ff]">{row.name}</span>
              <span className="shrink-0 font-['Space_Mono'] text-[10px] text-[#a5b4fc]">
                {row.position}{row.positionRank == null ? '' : ` #${row.positionRank}`} · W{row.byeWeek}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function needClasses(tier: ManagerTeamNeed['tier']) {
  if (tier === 'weak') return 'border-[rgba(244,63,94,0.5)] bg-[rgba(244,63,94,0.08)] text-[#fb7185]';
  if (tier === 'strong') return 'border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.08)] text-[#34d399]';
  return 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] text-[#fbbf24]';
}

function popupTeamNeeds(rows: ManagerDetailData['teamNeeds']): ManagerDetailData['teamNeeds'] {
  const seenPositions = new Set<string>();
  return [...rows.filter((row) => row.tier === 'strong'), ...rows.filter((row) => row.tier === 'weak')]
    .filter((row) => {
      const positionKey = row.position.trim().toUpperCase();
      if (seenPositions.has(positionKey)) return false;
      seenPositions.add(positionKey);
      return true;
    });
}

function TeamNeeds({ rows }: { rows: ManagerDetailData['teamNeeds'] }) {
  const visibleRows = popupTeamNeeds(rows);
  return (
    <section aria-labelledby="manager-team-needs">
      <h3 id="manager-team-needs" className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8b8eb8]">Team needs</h3>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-[#0d1022] px-3 py-2 text-[11px] text-[#6b6e99]">Position strength is unavailable.</p>
      ) : visibleRows.length === 0 ? (
        <p className="rounded-lg bg-[#0d1022] px-3 py-2 text-[11px] text-[#6b6e99]">No notable position strengths or needs.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleRows.map((row) => {
            const semantic = row.tier === 'strong' ? 'strength' : row.tier === 'weak' ? 'need' : 'neutral';
            return (
              <span
                key={row.position}
                aria-label={`${row.position} ${semantic}, rank ${row.rank} of ${row.outOf}`}
                data-team-need-tier={row.tier}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${needClasses(row.tier)}`}
              >
                {row.tier === 'weak' ? <ArrowDown size={12} /> : row.tier === 'strong' ? <ArrowUp size={12} /> : <Minus size={12} />}
                {row.position}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

function faabClasses(band: FaabQuartileBand) {
  if (band === 'top') return 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.1)] text-[#34d399]';
  if (band === 'bottom') return 'border-[rgba(244,63,94,0.45)] bg-[rgba(244,63,94,0.1)] text-[#fb7185]';
  return 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] text-[#fbbf24]';
}

function faabTextClass(band: FaabQuartileBand) {
  if (band === 'top') return 'text-[#34d399]';
  if (band === 'bottom') return 'text-[#fb7185]';
  return 'text-[#fbbf24]';
}

function likelihoodTextClass(likelihood: ManagerPredictionDisplay['likelihood']) {
  if (likelihood === 'Likely') return 'text-[#34d399]';
  if (likelihood === 'Unlikely') return 'text-[#fb7185]';
  return 'text-[#fbbf24]';
}

function RemainingFaab({ amount, activeAmounts, prominent = false }: {
  amount: number;
  activeAmounts: readonly number[];
  prominent?: boolean;
}) {
  const band = faabQuartile(amount, activeAmounts);
  const label = faabQuartileLabel(band);
  return (
    <div
      role="group"
      aria-label={`Remaining FAAB $${amount}, ${label}`}
      className={`rounded-xl border ${prominent ? 'px-4 py-3' : 'px-2.5 py-2'} ${faabClasses(band)}`}
      data-faab-quartile={band}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em]">Remaining FAAB</p>
      <p className={`${prominent ? 'text-2xl' : 'text-sm'} mt-0.5 font-['Space_Mono'] font-bold tabular-nums`}>${amount}</p>
    </div>
  );
}

export function ManagerDetailsModal({
  profile,
  manager,
  currentFaabAmount,
  activeFaabAmounts,
  details,
  getPlayerName,
  onClose,
}: {
  profile: ManagerBiddingProfile;
  manager: string;
  currentFaabAmount: number;
  activeFaabAmounts: readonly number[];
  details: ManagerDetailData;
  getPlayerName: (playerId: string) => string;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oldOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/70 px-3 [padding-top:max(0.75rem,env(safe-area-inset-top))] [padding-bottom:calc(env(safe-area-inset-bottom)+4.75rem)] sm:[padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      data-testid="manager-modal-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`manager-dialog-${profile.managerRosterId}`}
        className="flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#4a4f8c] bg-[#15183f] shadow-2xl sm:h-auto sm:max-h-[90vh]"
        data-testid="manager-details-modal"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#2d3262] px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id={`manager-dialog-${profile.managerRosterId}`} className="truncate font-['Orbitron'] text-base font-bold text-[#f0f0ff]">{manager}</h2>
            <div className="mt-2"><ManagerStyleBadge profile={profile} /></div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close manager details" className="-mr-1 min-h-11 min-w-11 rounded-lg p-2 text-[#a5a8cf] hover:bg-[#242855] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a5b4fc]">
            <X size={21} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <RemainingFaab amount={currentFaabAmount} activeAmounts={activeFaabAmounts} prominent />
          <UpcomingByes rows={details.upcomingByes} />
          <TeamNeeds rows={details.teamNeeds} />
          <section aria-labelledby="manager-bidding-history">
            <h3 id="manager-bidding-history" className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8b8eb8]">Bidding History</h3>
            {profile.evidence.length === 0 ? (
              <p className="rounded-lg bg-[#0d1022] px-3 py-2 text-[11px] text-[#6b6e99]">Bid history is unavailable.</p>
            ) : (
              <div className="space-y-2">
                {profile.evidence.map((event) => <HistoryEvent key={event.transactionId} evidence={event} getPlayerName={getPlayerName} />)}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ManagerPredictionRow({
  prediction,
  details = EMPTY_DETAILS,
  activeFaabAmounts,
  getPlayerName,
}: {
  prediction: ManagerPredictionDisplay;
  details?: ManagerDetailData;
  activeFaabAmounts?: readonly number[];
  getPlayerName: (playerId: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const faabAmounts = activeFaabAmounts ?? [prediction.currentFaab];
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open details for ${prediction.managerName}`}
        className={`w-full rounded-xl bg-[#0d1022] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] ${prediction.likelihood === 'Unlikely' ? 'opacity-55' : ''}`}
      >
        <span className="flex items-start justify-between gap-3" data-testid="prediction-row-layout">
          <span className="min-w-0" data-testid="prediction-manager-side">
            <span className="block min-w-0" data-testid="prediction-manager-heading">
              <span className="block min-w-0 truncate text-xs font-semibold text-[#f0f0ff]">{prediction.managerName}</span>
            </span>
            <span className={`mt-2 block text-[10px] font-semibold ${likelihoodTextClass(prediction.likelihood)}`}>{prediction.likelihood} bidder</span>
          </span>
          <span className="flex min-w-0 flex-col items-end gap-1.5 text-right" data-testid="prediction-side">
              <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap" data-testid="predicted-label-value">
                <span className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Predicted</span>
                <span className={`font-['Space_Mono'] text-sm font-bold tabular-nums ${prediction.cappedByFaab ? 'text-[#f87171]' : 'text-[#fbbf24]'}`}>
                  ${prediction.predictedBid}
                  {prediction.cappedByFaab && <span className="sr-only"> capped by remaining FAAB</span>}
                </span>
              </span>
              <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap" data-testid="remaining-faab-label-value">
                <span className="text-[9px] uppercase tracking-wide text-[#6b6e99]">Remaining FAAB</span>
                <span
                  className={`font-['Space_Mono'] text-xs font-semibold tabular-nums ${faabTextClass(faabQuartile(prediction.currentFaab, faabAmounts))}`}
                  data-faab-quartile={faabQuartile(prediction.currentFaab, faabAmounts)}
                >
                  ${prediction.currentFaab}<span className="sr-only">, {faabQuartileLabel(faabQuartile(prediction.currentFaab, faabAmounts))}</span>
                </span>
              </span>
          </span>
        </span>
      </button>
      {isOpen && (
        <ManagerDetailsModal
          profile={prediction.profile}
          manager={prediction.managerName}
          currentFaabAmount={prediction.currentFaab}
          activeFaabAmounts={faabAmounts}
          details={details}
          getPlayerName={getPlayerName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export function WaiverManagerPredictions({
  predictions,
  detailsByRosterId = new Map(),
  getPlayerName,
}: {
  predictions: ManagerPredictionDisplay[];
  detailsByRosterId?: ReadonlyMap<number, ManagerDetailData>;
  getPlayerName: (playerId: string) => string;
}) {
  const orderedPredictions = orderManagerPredictions(predictions);
  const activeFaabAmounts = orderedPredictions.map((prediction) => prediction.currentFaab);
  return (
    <div className="space-y-2" data-testid="expanded-manager-list">
      {orderedPredictions.map((prediction) => (
        <ManagerPredictionRow
          key={prediction.rosterId}
          prediction={prediction}
          details={detailsByRosterId.get(prediction.rosterId)}
          activeFaabAmounts={activeFaabAmounts}
          getPlayerName={getPlayerName}
        />
      ))}
    </div>
  );
}

export function TeamBidProfiles({
  profiles,
  rosters,
  users,
  initialFaab,
  activeRosterIds,
  showEliminatedTeams = true,
  isLoading,
  error,
  onRetry,
  getPlayerName,
  detailsByRosterId = new Map(),
}: {
  profiles: ManagerBiddingProfile[];
  rosters: Roster[];
  users: SleeperUser[];
  initialFaab: number;
  activeRosterIds?: ReadonlySet<number>;
  showEliminatedTeams?: boolean;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  getPlayerName: (playerId: string) => string;
  detailsByRosterId?: ReadonlyMap<number, ManagerDetailData>;
}) {
  const [selected, setSelected] = useState<ManagerBiddingProfile | null>(null);
  useEffect(() => {
    if (
      selected
      && !showEliminatedTeams
      && activeRosterIds
      && !activeRosterIds.has(selected.managerRosterId)
    ) {
      setSelected(null);
    }
  }, [activeRosterIds, selected, showEliminatedTeams]);
  if (isLoading) return <Card hover={false} className="p-4"><Skeleton lines={4} /></Card>;
  if (error) {
    return (
      <Card hover={false} className="p-4 text-center">
        <p className="text-xs text-[#f87171]">Bid profiles could not be loaded.</p>
        <Button size="sm" variant="ghost" className="mt-3" onClick={onRetry}>Retry</Button>
      </Card>
    );
  }
  if (profiles.length === 0) {
    return <p className="text-xs text-[#6b6e99]">Manager bid history is unavailable.</p>;
  }

  const ordered = [...profiles].sort((a, b) => {
    const aMultiplier = a.managerMultiplier ?? Number.NEGATIVE_INFINITY;
    const bMultiplier = b.managerMultiplier ?? Number.NEGATIVE_INFINITY;
    if (aMultiplier !== bMultiplier) return bMultiplier - aMultiplier;
    const byName = managerName(a.managerRosterId, rosters, users)
      .localeCompare(managerName(b.managerRosterId, rosters, users));
    return byName || a.managerRosterId - b.managerRosterId;
  });
  const activeProfiles = ordered.filter((profile) => activeRosterIds?.has(profile.managerRosterId) ?? true);
  const visibleProfiles = showEliminatedTeams ? ordered : activeProfiles;
  const activeFaabAmounts = activeProfiles.map((profile) => currentFaab(profile.managerRosterId, rosters, initialFaab));
  const selectedName = selected ? managerName(selected.managerRosterId, rosters, users) : '';
  const selectedFaab = selected ? currentFaab(selected.managerRosterId, rosters, initialFaab) : 0;

  return (
    <>
      <div className="space-y-2">
        {visibleProfiles.length === 0 && (
          <p className="text-xs text-[#6b6e99]">No active manager bid profiles are available.</p>
        )}
        {visibleProfiles.map((profile) => {
          const name = managerName(profile.managerRosterId, rosters, users);
          const faab = currentFaab(profile.managerRosterId, rosters, initialFaab);
          const faabBand = faabQuartile(faab, activeFaabAmounts);
          const highBid = highestBid(profile);
          return (
            <button
              key={profile.managerRosterId}
              type="button"
              onClick={() => setSelected(profile)}
              aria-label={`Open bid profile for ${name}`}
              className="w-full rounded-xl border border-[#1a1e3a] bg-[#0e1025] p-3 text-left transition-colors hover:border-[#3a3f75] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#f0f0ff]">{name}</span>
                  <span className="mt-1 block text-[10px] text-[#8b8eb8]">Highest bid: <span className="font-['Space_Mono'] tabular-nums">{highBid == null ? '—' : `$${highBid}`}</span></span>
                </span>
                <span className="shrink-0 text-right">
                  <ManagerStyleBadge profile={profile} />
                  <span className="mt-1.5 block text-[10px] text-[#8b8eb8]">
                    Current FAAB{' '}
                    <span
                      className={`font-['Space_Mono'] font-semibold tabular-nums ${faabTextClass(faabBand)}`}
                      data-faab-quartile={faabBand}
                      aria-label={`$${faab}, ${faabQuartileLabel(faabBand)}`}
                    >
                      ${faab}<span className="sr-only">, {faabQuartileLabel(faabBand)}</span>
                    </span>
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {selected && (
        <ManagerDetailsModal
          profile={selected}
          manager={selectedName}
          currentFaabAmount={selectedFaab}
          activeFaabAmounts={activeFaabAmounts}
          details={detailsByRosterId.get(selected.managerRosterId) ?? EMPTY_DETAILS}
          getPlayerName={getPlayerName}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
