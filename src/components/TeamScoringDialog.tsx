import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatScoringInjuryStatus } from '../logic/injuryStatus';
import type { LiveScoringModel, LiveTeamScore } from '../logic/liveScoring';
import { PositionBadge, StatusBadge } from './ui';

export function TeamScoringDialog({
  open,
  onClose,
  team,
  model,
  week,
}: {
  open: boolean;
  onClose: () => void;
  team: LiveTeamScore | null;
  model: LiveScoringModel | null;
  week: number | null;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeDialog = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open || !team) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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
      previouslyFocused?.focus();
    };
  }, [open, team, closeDialog]);

  if (!open || !team) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-hidden bg-black/70 px-3 pt-3 sm:items-center sm:pb-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}
      data-testid="team-scoring-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[#343961] bg-[#0d1126] shadow-2xl outline-none sm:max-h-[88dvh] sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#20264d] p-4 pb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="truncate font-['Orbitron'] text-base font-bold text-[#f0f0ff]">
                {team.displayName} scoring
              </h2>
              {team.eliminated
                ? <StatusBadge status="eliminated" />
                : team.standing && <StatusBadge status={team.standing.risk} />}
            </div>
            <p className="mt-1 text-xs text-[#8b8eb8]">
              {week == null ? 'Starter scoring' : `Week ${week} starters`}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDialog}
            aria-label={`Close ${team.displayName} scoring`}
            className="-mr-1 grid min-h-11 min-w-11 place-items-center rounded-lg text-[#9ca3c7] hover:bg-[#161a3a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a5b4fc]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <section aria-label="Team scoring summary" className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[#121735] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-[#777aa5]">Current</div>
              <div className="mt-1 font-['Space_Mono'] text-xl font-bold tabular-nums text-[#f0f0ff]">{team.officialPoints.toFixed(1)}</div>
            </div>
            <div className="rounded-lg bg-[#121735] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-[#777aa5]">Projected</div>
              <div className="mt-1 font-['Space_Mono'] text-xl font-bold tabular-nums text-[#a5b4fc]">{team.projectedFinal.toFixed(1)}</div>
            </div>
            <div className="rounded-lg bg-[#121735] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-[#777aa5]">Started</div>
              <div className="mt-1 font-['Space_Mono'] text-xl font-bold tabular-nums text-[#e2e2f6]">{team.startersStarted}/{team.starterCount}</div>
            </div>
          </section>

          <section aria-labelledby={`${titleId}-lineup`}>
            <h3 id={`${titleId}-lineup`} className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8b8eb8]">Starting lineup</h3>
            {team.starters.length === 0 ? (
              <p className="rounded-lg border border-[#262b50] px-3 py-4 text-center text-xs text-[#777aa5]">No valid starters were returned for this team.</p>
            ) : (
              <ol className="divide-y divide-[#20264d] rounded-xl border border-[#262b50] bg-[#0a0e21] px-3">
                {team.starters.map((starter) => (
                  <li key={starter.playerId} className="flex min-h-[4.5rem] items-center gap-3 py-3">
                    <PositionBadge position={starter.lineupPosition} className="w-[4.75rem] shrink-0 px-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-[#f0f0ff]">{starter.name}</span>
                        {starter.injuryStatus && (
                          <span
                            className="shrink-0 text-sm font-bold text-[#f87171]"
                            aria-label={starter.injuryStatus}
                            title={starter.injuryStatus}
                          >
                            {formatScoringInjuryStatus(starter.injuryStatus)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#777aa5]">
                        <span>{starter.fantasyPosition}</span>
                        {starter.context && <span>{starter.context}</span>}
                        {starter.projectedFinal != null && starter.projectedFinal !== starter.currentPoints && (
                          <span>Proj. {starter.projectedFinal.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-['Space_Mono'] text-lg font-bold tabular-nums text-[#f0f0ff]">{starter.currentPoints.toFixed(1)}</div>
                      <div className="text-[9px] uppercase tracking-wider text-[#777aa5]">points</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {!team.eliminated && team.standing && model && (
            <p className="mt-3 text-center text-[10px] text-[#777aa5]">
              Projected rank {team.standing.rank}/{model.activeTeamCount} among active teams
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
