import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CanonicalBidEvent, FreeAgentTeamImpact } from '../logic';
import type { ManagerDetailData } from '../logic/managerDetails';
import { isEligibleBuyerPrediction, orderManagerPredictions, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
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
  nextWeek?: number | null;
  nextWeekPoints?: number | null;
  byeWeek?: number | null;
  sourceLabel: string;
  /** Native label and preformatted display for this source metric (never inferred as currency). */
  valueLabel: string;
  valueDisplay: string;
  value: number | null;
  positionRank: number | null;
  owned: boolean;
  ownerLabel?: string;
  suggestedBid?: number | null;
  remainingFaab?: number | null;
  teamImpact?: FreeAgentTeamImpact;
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
  const winningGroups = groupedHistory.map((events) => events.filter((event) => event.outcome === 'won')).filter((events) => events.length > 0);
  const otherBidGroups = groupedHistory.map((events) => events.filter((event) => event.outcome === 'legitimate-loss')).filter((events) => events.length > 0);
  const orderedPredictions = orderManagerPredictions(data.managerPredictions ?? []);
  const supportsPrediction = !data.owned && typeof data.suggestedBid === 'number' && Number.isFinite(data.suggestedBid) && data.suggestedBid > 0;
  const predictedBid = orderedPredictions.find(isEligibleBuyerPrediction)?.predictedBid ?? null;
  const playerStatus = data.injuryStatus || data.status || 'Unavailable';
  const impact = data.teamImpact;
  const impactDelta = impact?.status === 'available'
    ? impact.lineupPoints.after - impact.lineupPoints.before
    : null;
  const faabAfterBid = typeof data.remainingFaab === 'number'
    && typeof data.suggestedBid === 'number'
    && data.suggestedBid <= data.remainingFaab
    ? data.remainingFaab - data.suggestedBid
    : null;
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
        <div className="mt-0.5 text-[10px] text-[#9ca3c7]">Week {event.decisionWeek} · {event.outcome === 'won' ? 'Won' : 'Lost'}</div>
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
            <div className="min-w-0 rounded-lg bg-[#121735] p-3"><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">{data.valueLabel}</div><div className="mt-1 truncate font-['Space_Mono'] text-lg font-bold text-[#a5b4fc]">{data.valueDisplay}</div><div className="mt-1 text-[10px] text-[#6b6e99]">{data.sourceLabel}{data.positionRank != null ? ` · ${data.position} #${data.positionRank}` : ''}</div></div>
            <div className="min-w-0 rounded-lg bg-[#121735] p-3"><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Profile</div><div className="mt-1 text-[#f0f0ff]">Age {data.age ?? 'unavailable'}</div><div className="mt-1 text-[#9ca3c7]">Status: {playerStatus}</div><div className="mt-1 text-[#9ca3c7]">{data.byeWeek != null ? `Bye Week ${data.byeWeek}` : 'Bye week unavailable'}</div><div className="mt-1 text-[#9ca3c7]">{data.nextWeek != null ? `Week ${data.nextWeek}: ${data.nextWeekPoints != null ? `${data.nextWeekPoints.toFixed(1)} projected pts` : 'projection unavailable'}` : 'Next-week projection unavailable'}</div>{data.nextWeek != null && <div className="mt-1 text-[9px] text-[#6b6e99]">Sleeper weekly projection</div>}</div>
          </section>

          <section className="rounded-lg border border-[#20264d] p-3" aria-label={data.owned ? 'Roster status' : 'Acquisition context'}>
            {data.owned ? <><h3 className="text-xs font-semibold uppercase tracking-wider text-[#10b981]">Owned / rostered</h3><p className="mt-1 text-xs text-[#9ca3c7]">{data.ownerLabel ?? 'This player is currently rostered.'} Acquisition impact is not calculated for owned players.</p></> : <div className="grid grid-cols-2 gap-2"><div><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Suggested</div><strong className="mt-1 block font-['Space_Mono'] text-lg text-[#f59e0b]">{formatDisplayCurrency(data.suggestedBid, 'Unavailable')}</strong></div><div><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Predicted</div><strong className="mt-1 block font-['Space_Mono'] text-lg text-[#a5b4fc]">{formatDisplayCurrency(predictedBid, '—')}</strong></div></div>}
          </section>

          {!data.owned && impact && (
            <section className="mt-4 rounded-lg border border-[#20264d] p-3" aria-labelledby={`${titleId}-team-impact`}>
              <h3 id={`${titleId}-team-impact`} className="text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Team impact</h3>
              {impact.status === 'unavailable' ? (
                <p className="mt-2 rounded-lg bg-[#121735] p-3 text-xs text-[#9ca3c7]">{impact.reason}</p>
              ) : (
                <>
                  <p className="mt-1 text-[10px] text-[#6b6e99]">Optimized next-week lineup · active teams only</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="min-w-0 rounded-lg bg-[#121735] p-2">
                      <div className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Overall</div>
                      <div className="mt-1 whitespace-nowrap font-['Space_Mono'] text-[10px] font-bold text-[#a5b4fc]">{impact.overallRank.before}/{impact.overallRank.outOf} → {impact.overallRank.after}/{impact.overallRank.outOf}</div>
                    </div>
                    <div className="min-w-0 rounded-lg bg-[#121735] p-2">
                      <div className="truncate text-[9px] uppercase tracking-wider text-[#6b6e99]">{impact.position}</div>
                      <div className="mt-1 whitespace-nowrap font-['Space_Mono'] text-[10px] font-bold text-[#a5b4fc]">{impact.positionRank.before}/{impact.positionRank.outOf} → {impact.positionRank.after}/{impact.positionRank.outOf}</div>
                    </div>
                    <div className="min-w-0 rounded-lg bg-[#121735] p-2">
                      <div className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Lineup pts</div>
                      <div className="mt-1 whitespace-nowrap font-['Space_Mono'] text-[10px] font-bold text-[#10b981]">{impact.lineupPoints.before.toFixed(1)} → {impact.lineupPoints.after.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-[#9ca3c7]">
                    <p><span className="text-[#6b6e99]">Projection change:</span> <span className="font-['Space_Mono'] text-[#f0f0ff]">{impactDelta != null && impactDelta > 0 ? '+' : ''}{impactDelta?.toFixed(1)} pts</span></p>
                    <p><span className="text-[#6b6e99]">Starter change:</span> {impact.incomingPlayerStarts ? impact.displacedStarterIds.length > 0 ? `${data.name} enters; ${impact.displacedStarterIds.map((playerId) => data.getPlayerName?.(playerId) ?? playerId).join(', ')} moves out.` : `${data.name} enters the optimized lineup.` : 'Optimized starters are unchanged.'}</p>
                    <p><span className="text-[#6b6e99]">Assumed drop:</span> {impact.assumedDropPlayerId ? `${data.getPlayerName?.(impact.assumedDropPlayerId) ?? impact.assumedDropPlayerId} · ${impact.dropReason === 'lowest-projected-non-starter' ? 'lowest projected non-starter' : 'lowest projected roster player'}` : 'None needed at the current roster size.'}</p>
                    <p><span className="text-[#6b6e99]">FAAB:</span> {typeof data.remainingFaab === 'number' && typeof data.suggestedBid === 'number' ? data.suggestedBid <= data.remainingFaab ? `${formatDisplayCurrency(data.remainingFaab)} → ${formatDisplayCurrency(faabAfterBid)}` : `${formatDisplayCurrency(data.suggestedBid)} suggested exceeds ${formatDisplayCurrency(data.remainingFaab)} remaining` : 'Resulting balance unavailable.'}</p>
                  </div>
                  <p className="mt-3 border-t border-[#20264d] pt-2 text-[9px] leading-relaxed text-[#6b6e99]">The suggested bid changes FAAB only. It does not change projected points.</p>
                </>
              )}
            </section>
          )}

          {!data.owned && <details className="mt-4 rounded-lg border border-[#20264d] p-3"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Predicted bidding</summary><div className="mt-3">{supportsPrediction && orderedPredictions.length > 0 ? <WaiverManagerPredictions predictions={orderedPredictions} detailsByRosterId={data.managerDetails} getPlayerName={data.getPlayerName ?? (() => 'Unknown player')} /> : <p className="rounded-lg bg-[#121735] p-3 text-xs text-[#9ca3c7]">{supportsPrediction ? 'No supported current manager prediction is available.' : 'Predicted bidding is unavailable for a $0 or unsupported acquisition value.'}</p>}</div></details>}

          <details className="mt-4 rounded-lg border border-[#20264d] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Bidding history · {data.history.length || 'None'}</summary>
            {data.history.length === 0 ? <p className="mt-3 rounded-lg bg-[#121735] p-3 text-xs text-[#9ca3c7]">None</p> : <div className="mt-3 space-y-4">{winningGroups.length > 0 && <section aria-label="Winning bids"><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">Winning bids</h4><div className="space-y-3">{winningGroups.map((events) => <div key={events[0].batchKey} aria-label={`Week ${events[0].decisionWeek} waiver event`} className="space-y-2">{events.map(renderBid)}</div>)}</div></section>}{otherBidGroups.length > 0 && <section aria-label="Other bids"><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#a5b4fc]">Other bids</h4><div className="space-y-3">{otherBidGroups.map((events) => <div key={events[0].batchKey} aria-label={`Week ${events[0].decisionWeek} waiver event`} className="space-y-2">{events.map(renderBid)}</div>)}</div></section>}</div>}
          </details>
        </div>
      </div>
    </div>, document.body,
  );
}
