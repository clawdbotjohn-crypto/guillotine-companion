import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CanonicalBidEvent } from '../logic';
import type { ManagerDetailData } from '../logic/managerDetails';
import { orderManagerPredictions, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
import { formatDisplayCurrency } from '../logic/displayCurrency';
import { WaiverManagerPredictions } from './ManagerBiddingProfiles';

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
  managerDetails?: ReadonlyMap<number, ManagerDetailData>;
  managerLabels?: ReadonlyMap<number, string>;
  getPlayerName?: (playerId: string) => string;
  history: CanonicalBidEvent[];
}

export function PlayerDetailDialog({ open, onClose, data }: { open: boolean; onClose: () => void; data: PlayerDetailData }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const groupedHistory = useMemo(() => {
    const groups = new Map<string, CanonicalBidEvent[]>();
    for (const event of data.history) groups.set(event.batchKey, [...(groups.get(event.batchKey) ?? []), event]);
    return [...groups.values()]
      .map((events) => [...events].sort((a, b) => Number(b.outcome === 'won') - Number(a.outcome === 'won') || b.actualBid - a.actualBid || a.transactionId.localeCompare(b.transactionId)))
      .sort((a, b) => (b[0]?.createdAt ?? 0) - (a[0]?.createdAt ?? 0));
  }, [data.history]);
  const winners = groupedHistory.flatMap((events) => events.filter((event) => event.outcome === 'won'));
  const otherBids = groupedHistory.flatMap((events) => events.filter((event) => event.outcome === 'legitimate-loss'));
  const orderedPredictions = orderManagerPredictions(data.managerPredictions ?? []);
  const supportsPrediction = !data.owned && typeof data.suggestedBid === 'number' && Number.isFinite(data.suggestedBid) && data.suggestedBid > 0;
  const closeDialog = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => dialogRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (focusable.length === 0) return;
      const [first] = focusable;
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = originalOverflow; previous?.focus(); };
  }, [open, closeDialog]);

  if (!open) return null;
  const managerLabel = (event: CanonicalBidEvent) => data.managerLabels?.get(event.managerRosterId) ?? `Roster ${event.managerRosterId}`;
  const renderBid = (event: CanonicalBidEvent) => (
    <div key={event.transactionId} className="flex items-start justify-between gap-3 rounded-lg bg-[#121735] p-3 text-xs">
      <div className="min-w-0">
        <div className="truncate font-semibold text-[#f0f0ff]">{managerLabel(event)}</div>
        <div className="mt-0.5 text-[10px] text-[#9ca3c7]">Week {event.decisionWeek} · {event.outcome === 'won' ? 'Won' : 'Lost'} · canonical waiver event</div>
      </div>
      <span className="shrink-0 font-['Space_Mono'] text-sm font-bold text-[#f59e0b]">{formatDisplayCurrency(event.actualBid)}</span>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/70 px-3 [padding-top:max(0.75rem,env(safe-area-inset-top))] [padding-bottom:calc(env(safe-area-inset-bottom)+4.75rem)] sm:items-center sm:[padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
      data-testid="player-detail-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#2b315f] bg-[#0d1126] shadow-2xl outline-none sm:max-h-[90dvh]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#20264d] p-4 pb-3">
          <div className="min-w-0"><h2 id={titleId} className="truncate font-['Orbitron'] text-base font-bold text-[#f0f0ff]">{data.name}</h2><p className="mt-1 text-xs text-[#9ca3c7]">{data.position}{data.positionRank != null ? ` #${data.positionRank}` : ''} · {data.team ?? 'NFL team unavailable'}</p></div>
          <button type="button" onClick={closeDialog} aria-label={`Close ${data.name} details`} className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[#9ca3c7] hover:bg-[#161a3a] hover:text-white"><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <section aria-label="Player profile" className="grid grid-cols-2 gap-2 pb-4 text-xs">
            <div className="min-w-0 rounded-lg bg-[#121735] p-3"><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Current Value</div><div className="mt-1 truncate font-['Space_Mono'] text-lg font-bold text-[#a5b4fc]">{formatDisplayCurrency(data.value, 'Unavailable')}</div><div className="mt-1 text-[10px] text-[#6b6e99]">{data.sourceLabel}{data.positionRank != null ? ` · ${data.position} #${data.positionRank}` : ''}</div></div>
            <div className="min-w-0 rounded-lg bg-[#121735] p-3"><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Profile</div><div className="mt-1 text-[#f0f0ff]">Age {data.age ?? 'unavailable'}</div><div className="mt-1 text-[#9ca3c7]">Status: {data.status || 'Unavailable'}</div><div className="mt-1 text-[#9ca3c7]">Injury: {data.injuryStatus || 'None reported'}</div></div>
          </section>

          <section className="rounded-lg border border-[#20264d] p-3" aria-label={data.owned ? 'Roster status' : 'Acquisition context'}>
            {data.owned ? <><h3 className="text-xs font-semibold uppercase tracking-wider text-[#10b981]">Owned / rostered</h3><p className="mt-1 text-xs text-[#9ca3c7]">{data.ownerLabel ?? 'This player is currently rostered.'} Acquisition impact is not calculated for owned players.</p></> : <><h3 className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">Free agent context</h3><p className="mt-2 text-xs text-[#9ca3c7]">Suggested bid <strong className="font-['Space_Mono'] text-[#f0f0ff]">{formatDisplayCurrency(data.suggestedBid, 'Unavailable')}</strong></p></>}
          </section>

          {!data.owned && <section className="mt-4" aria-labelledby={`${titleId}-predictions`}><h3 id={`${titleId}-predictions`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Predicted Bidding</h3>{supportsPrediction && orderedPredictions.length > 0 ? <WaiverManagerPredictions predictions={orderedPredictions} detailsByRosterId={data.managerDetails} getPlayerName={data.getPlayerName ?? (() => 'Unknown player')} /> : <p className="rounded-lg bg-[#121735] p-3 text-xs text-[#9ca3c7]">{supportsPrediction ? 'No supported current manager prediction is available.' : 'Predicted bidding is unavailable for a $0 or unsupported acquisition value.'}</p>}</section>}

          <section className="mt-4" aria-labelledby={`${titleId}-history`}>
            <h3 id={`${titleId}-history`} className="text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Bidding History</h3>
            {data.history.length === 0 ? <p className="mt-2 rounded-lg bg-[#121735] p-3 text-xs text-[#9ca3c7]">No canonical waiver history is available for this player in the loaded league weeks.</p> : <div className="mt-2 space-y-4">{winners.length > 0 && <section aria-label="Winning bids"><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">Winning bids</h4><div className="space-y-2">{winners.map(renderBid)}</div></section>}{otherBids.length > 0 && <section aria-label="Other bids"><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#a5b4fc]">Other bids</h4><div className="space-y-2">{otherBids.map(renderBid)}</div></section>}</div>}
          </section>
        </div>
      </div>
    </div>, document.body,
  );
}
