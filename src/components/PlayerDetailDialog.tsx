import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CanonicalBidEvent, FreeAgentTeamImpact } from '../logic';
import type { ManagerDetailData } from '../logic/managerDetails';
import { isEligibleBuyerPrediction, orderManagerPredictions, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
import { formatDisplayCurrency } from '../logic/displayCurrency';
import { rankQuartile } from '../logic/rankingQuartiles';
import { WaiverManagerPredictions } from './ManagerBiddingProfiles';

export type PlayerProjectionState = 'loading' | 'error' | 'loaded' | 'unavailable';

function rankColor(rank: number, outOf: number): string {
  const quartile = rankQuartile(rank, outOf);
  if (quartile === 'top') return '#10b981';
  if (quartile === 'bottom') return '#f43f5e';
  return '#f59e0b';
}

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
  projectionState?: PlayerProjectionState;
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
  /** Selected custom-ranking valuation, kept separate from market/source metrics. */
  customValue?: number | null;
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
  const hasCustomValue = typeof data.customValue === 'number' && Number.isFinite(data.customValue);
  const acquisitionValue = hasCustomValue ? data.customValue : data.suggestedBid;
  const acquisitionValueLabel = hasCustomValue ? 'Custom value' : 'Suggested';
  const supportsPrediction = !data.owned && typeof acquisitionValue === 'number' && Number.isFinite(acquisitionValue) && acquisitionValue > 0;
  const predictedBid = orderedPredictions.find((prediction) => (
    isEligibleBuyerPrediction(prediction)
    && Number.isFinite(prediction.predictedBid)
    && prediction.predictedBid > 0
  ))?.predictedBid ?? null;
  const playerStatus = data.injuryStatus || data.status || 'Unavailable';
  const projectionState = data.projectionState ?? (data.nextWeek != null ? 'loaded' : 'unavailable');
  const projectionValue = projectionState === 'loading'
    ? 'Loading…'
    : projectionState === 'error' || projectionState === 'unavailable'
      ? 'Unavailable'
      : (data.nextWeekPoints ?? 0).toFixed(1).replace(/\.0$/, '');
  const projectionWeek = data.nextWeek == null ? '' : ` (W${data.nextWeek})`;
  const impact = data.teamImpact;
  const impactDelta = impact?.status === 'available'
    ? impact.lineupPoints.after - impact.lineupPoints.before
    : null;
  const hasNoTeamImpact = impact?.status === 'available' && (
    acquisitionValue === 0
    || (
      !impact.incomingPlayerStarts
      && impact.displacedStarterIds.length === 0
      && impact.lineupPoints.before === impact.lineupPoints.after
      && impact.overallRank.before === impact.overallRank.after
      && impact.positionRank.before === impact.positionRank.after
    )
  );
  const hasPrediction = supportsPrediction && predictedBid != null && orderedPredictions.length > 0;
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
            <div className="min-w-0 rounded-lg bg-[#121735] p-3"><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Profile</div><div className="mt-1 text-[#f0f0ff]">Age: {data.age ?? 'Unavailable'}</div><div className="mt-1 text-[#9ca3c7]">Status: {playerStatus}</div><div className="mt-1 text-[#9ca3c7]">Bye: {data.byeWeek ?? 'Unavailable'}</div><div className="mt-1 text-[#9ca3c7]">Proj.: {projectionValue}{projectionWeek}</div></div>
          </section>

          {!data.owned && <section className="rounded-lg border border-[#20264d] p-3" aria-label="Acquisition context">
            <div className="grid grid-cols-2 gap-2"><div><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">{acquisitionValueLabel}</div><strong className="mt-1 block font-['Space_Mono'] text-lg text-[#f59e0b]">{formatDisplayCurrency(acquisitionValue, 'Unavailable')}</strong></div><div><div className="text-[10px] uppercase tracking-wider text-[#6b6e99]">Predicted</div><strong className="mt-1 block font-['Space_Mono'] text-lg text-[#a5b4fc]">{formatDisplayCurrency(predictedBid, '$0')}</strong></div></div>
          </section>}

          {!data.owned && impact && (
            <section className="mt-4 rounded-lg border border-[#20264d] p-3" aria-labelledby={`${titleId}-team-impact`}>
              <h3 id={`${titleId}-team-impact`} className="text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Team Impact</h3>
              {impact.status === 'unavailable' ? (
                <p aria-label={`Impact unavailable: ${impact.reason}`} className="mt-1 text-xs text-[#9ca3c7]">None</p>
              ) : hasNoTeamImpact ? (
                <p className="mt-1 text-xs text-[#9ca3c7]">None</p>
              ) : (
                <div className="mt-2 space-y-1.5 text-xs text-[#9ca3c7]">
                  <p
                    aria-label={`Lineup points delta ${impactDelta != null && impactDelta > 0 ? 'plus ' : impactDelta != null && impactDelta < 0 ? 'minus ' : ''}${Math.abs(impactDelta ?? 0).toFixed(1)}`}
                    className="font-['Space_Mono'] text-xl font-bold leading-none text-[#f0f0ff]"
                  >
                    {impactDelta != null && impactDelta > 0 ? '+' : ''}{impactDelta?.toFixed(1)}
                  </p>
                  <p
                    aria-label={`Overall: ${impact.overallRank.before}/${impact.overallRank.outOf} to ${impact.overallRank.after}/${impact.overallRank.outOf}`}
                    className="font-['Space_Mono']"
                  >
                    <span aria-hidden="true">Overall: </span>
                    <span data-testid="team-impact-overall-before" style={{ color: rankColor(impact.overallRank.before, impact.overallRank.outOf) }}>{impact.overallRank.before}/{impact.overallRank.outOf}</span>
                    <span aria-hidden="true"> → </span>
                    <span data-testid="team-impact-overall-after" style={{ color: rankColor(impact.overallRank.after, impact.overallRank.outOf) }}>{impact.overallRank.after}/{impact.overallRank.outOf}</span>
                  </p>
                  <p
                    aria-label={`${impact.position}: ${impact.positionRank.before}/${impact.positionRank.outOf} to ${impact.positionRank.after}/${impact.positionRank.outOf}`}
                    className="font-['Space_Mono']"
                  >
                    <span aria-hidden="true">{impact.position}: </span>
                    <span data-testid="team-impact-position-before" style={{ color: rankColor(impact.positionRank.before, impact.positionRank.outOf) }}>{impact.positionRank.before}/{impact.positionRank.outOf}</span>
                    <span aria-hidden="true"> → </span>
                    <span data-testid="team-impact-position-after" style={{ color: rankColor(impact.positionRank.after, impact.positionRank.outOf) }}>{impact.positionRank.after}/{impact.positionRank.outOf}</span>
                  </p>
                  <p className="font-['Space_Mono']">Lineup pts: {impact.lineupPoints.before.toFixed(1)} → {impact.lineupPoints.after.toFixed(1)}</p>
                </div>
              )}
            </section>
          )}

          {!data.owned && (hasPrediction ? <details className="mt-4 rounded-lg border border-[#20264d] p-3"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Predicted bidding</summary><div className="mt-3"><WaiverManagerPredictions predictions={orderedPredictions} detailsByRosterId={data.managerDetails} getPlayerName={data.getPlayerName ?? (() => 'Unknown player')} /></div></details> : <section className="mt-4 rounded-lg border border-[#20264d] p-3" aria-label="Predicted bidding"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Predicted bidding</h3><p className="mt-1 text-xs text-[#9ca3c7]">None</p></section>)}

          {data.history.length > 0 ? <details open className="mt-4 rounded-lg border border-[#20264d] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Bidding history · {data.history.length}</summary>
            <div className="mt-3 space-y-4">{winningGroups.length > 0 && <section aria-label="Winning bids"><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">Winning bids</h4><div className="space-y-3">{winningGroups.map((events) => <div key={events[0].batchKey} aria-label={`Week ${events[0].decisionWeek} waiver event`} className="space-y-2">{events.map(renderBid)}</div>)}</div></section>}{otherBidGroups.length > 0 && <section aria-label="Other bids"><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#a5b4fc]">Other bids</h4><div className="space-y-3">{otherBidGroups.map((events) => <div key={events[0].batchKey} aria-label={`Week ${events[0].decisionWeek} waiver event`} className="space-y-2">{events.map(renderBid)}</div>)}</div></section>}</div>
          </details> : <section className="mt-4 rounded-lg border border-[#20264d] p-3" aria-label="Bidding history"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#f0f0ff]">Bidding history</h3><p className="mt-1 text-xs text-[#9ca3c7]">No bidding history.</p></section>}
        </div>
      </div>
    </div>, document.body,
  );
}
