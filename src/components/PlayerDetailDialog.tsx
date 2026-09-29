import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CanonicalBidEvent } from '../logic';
import type { ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';

export interface PlayerDetailData {
  playerId: string;
  name: string;
  position: string;
  team: string | null;
  age?: number | null;
  status?: string | null;
  injuryStatus?: string | null;
  sourceLabel: string;
  value: number | null;
  positionRank: number | null;
  owned: boolean;
  ownerLabel?: string;
  suggestedBid?: number | null;
  managerPredictions?: ManagerPredictionDisplay[];
  history: CanonicalBidEvent[];
}

function money(value: number): string {
  return `$${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

export function PlayerDetailDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: PlayerDetailData;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showLosingBids, setShowLosingBids] = useState(false);

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, CanonicalBidEvent[]>();
    for (const event of data.history) {
      const events = groups.get(event.batchKey) ?? [];
      events.push(event);
      groups.set(event.batchKey, events);
    }
    return [...groups.values()]
      .map((events) => [...events].sort((a, b) => Number(b.outcome === 'won') - Number(a.outcome === 'won') || b.actualBid - a.actualBid || a.transactionId.localeCompare(b.transactionId)))
      .sort((a, b) => (b[0]?.createdAt ?? 0) - (a[0]?.createdAt ?? 0));
  }, [data.history]);
  const losingCount = data.history.filter((event) => event.outcome === 'legitimate-loss').length;
  const closeDialog = useCallback(() => {
    setShowLosingBids(false);
    onClose();
  }, [onClose]);
  const eligiblePredictions = (data.managerPredictions ?? [])
    .filter((prediction) => prediction.likelihood !== 'Unlikely')
    .sort((a, b) => b.predictedBid - a.predictedBid || a.rosterId - b.rosterId);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => dialogRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, [open, closeDialog]);

  if (!open) return null;
  const visibleHistory = groupedHistory.map((events) => showLosingBids
    ? events
    : events.filter((event) => event.outcome === 'won'));

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#2b315f] bg-[#0d1126] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#20264d] pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate font-['Orbitron'] text-base font-bold text-[#f0f0ff]">{data.name}</h2>
            <p className="mt-1 text-xs text-[#9ca3c7]">
              {data.position}{data.positionRank != null ? ` #${data.positionRank}` : ''} · {data.team ?? 'NFL team unavailable'}
            </p>
          </div>
          <button type="button" onClick={closeDialog} aria-label={`Close ${data.name} details`} className="min-h-11 min-w-11 rounded-lg text-[#9ca3c7] hover:bg-[#161a3a] hover:text-white grid place-items-center">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <section aria-label="Player profile" className="grid grid-cols-2 gap-2 py-4 text-xs">
          <div className="rounded-lg bg-[#121735] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Current Value</div>
            <div className="mt-1 font-['Space_Mono'] text-lg font-bold text-[#a5b4fc]">{data.value == null ? 'Unavailable' : money(data.value)}</div>
            <div className="mt-1 text-[10px] text-[#6b6e99]">{data.sourceLabel}{data.positionRank != null ? ` · ${data.position} #${data.positionRank}` : ''}</div>
          </div>
          <div className="rounded-lg bg-[#121735] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Profile</div>
            <div className="mt-1 text-[#f0f0ff]">Age {data.age ?? 'unavailable'}</div>
            <div className="mt-1 text-[#9ca3c7]">Status: {data.status || 'Unavailable'}</div>
            <div className="mt-1 text-[#9ca3c7]">Injury: {data.injuryStatus || 'None reported'}</div>
          </div>
        </section>

        <section className="rounded-lg border border-[#20264d] p-3" aria-label={data.owned ? 'Roster status' : 'Acquisition context'}>
          {data.owned ? (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#10b981]">Owned / rostered</h3>
              <p className="mt-1 text-xs text-[#9ca3c7]">{data.ownerLabel ?? 'This player is currently rostered.'} Acquisition impact is not calculated for owned players.</p>
            </>
          ) : (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">Free agent context</h3>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span className="text-[#9ca3c7]">Suggested bid <strong className="font-['Space_Mono'] text-[#f0f0ff]">{data.suggestedBid == null ? 'Unavailable' : money(data.suggestedBid)}</strong></span>
                <span className="text-[#9ca3c7]">Manager prediction <strong className="font-['Space_Mono'] text-[#f0f0ff]">{eligiblePredictions[0] ? money(eligiblePredictions[0].predictedBid) : 'Unavailable'}</strong></span>
              </div>
              <p className="mt-1 text-[10px] text-[#6b6e99]">{eligiblePredictions.length ? `${eligiblePredictions.length} likely/possible competing prediction${eligiblePredictions.length === 1 ? '' : 's'}` : 'No supported current manager prediction.'}</p>
            </>
          )}
        </section>

        <section className="mt-4" aria-labelledby={`${titleId}-history`}>
          <div className="flex items-center justify-between gap-3">
            <h3 id={`${titleId}-history`} className="text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Bidding History</h3>
            {losingCount > 0 && (
              <button type="button" aria-pressed={showLosingBids} onClick={() => setShowLosingBids((show) => !show)} className="min-h-11 rounded-lg border border-[#6366f1] px-3 text-xs font-semibold text-[#a5b4fc] hover:bg-[#161a3a]">
                {showLosingBids ? 'Hide losing bids' : `Show losing bids (${losingCount})`}
              </button>
            )}
          </div>
          {data.history.length === 0 ? (
            <p className="mt-2 rounded-lg bg-[#121735] p-3 text-xs text-[#9ca3c7]">No canonical waiver history is available for this player in the loaded league weeks.</p>
          ) : visibleHistory.every((events) => events.length === 0) ? (
            <p className="mt-2 rounded-lg bg-[#121735] p-3 text-xs text-[#9ca3c7]">Only legitimate competing claims are available. Show losing bids to view them.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {visibleHistory.flatMap((events) => events).map((event) => (
                <div key={event.transactionId} className="flex items-center justify-between gap-3 rounded-lg bg-[#121735] p-3 text-xs">
                  <div>
                    <div className="font-semibold text-[#f0f0ff]">Week {event.decisionWeek} · {event.outcome === 'won' ? 'Winner' : 'Competing bid'}</div>
                    <div className="mt-0.5 text-[10px] text-[#6b6e99]">Canonical transaction record</div>
                  </div>
                  <span className="font-['Space_Mono'] text-sm font-bold text-[#f59e0b]">{money(event.actualBid)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}
