import { useState } from 'react';
import type { HubRosterRow } from '../logic/hubRoster';
import { Card, PositionBadge } from './ui';
import { PlayerDetailDialog, type PlayerDetailData, type PlayerProjectionState } from './PlayerDetailDialog';
import { formatWholeDollars } from '../logic/displayCurrency';

function projectionLabel(row: HubRosterRow, state: PlayerProjectionState): string {
  if (state === 'loading') return 'Projection loading';
  if (state === 'error' || state === 'unavailable') return 'Projection unavailable';
  const points = row.projection ?? 0;
  return `${points === 0 ? '0' : points.toFixed(1)} projected points`;
}

function acquisitionLabel(row: HubRosterRow): string {
  if (row.acquisition.faab != null) return `Paid $${row.acquisition.faab}`;
  if (row.acquisition.kind === 'draft') return 'Drafted';
  if (row.acquisition.kind === 'trade') return 'Traded';
  if (row.acquisition.kind === 'free_agent') return 'Free agent pickup';
  return 'Acquisition price unavailable';
}

function RosterPlayerRow({ row, value, projectionState, onOpen }: {
  row: HubRosterRow;
  value: number | null;
  projectionState: PlayerProjectionState;
  onOpen: () => void;
}) {
  const status = row.injuryStatus || (row.status && row.status !== 'Active' ? row.status : null);
  return (
    <button
      type="button"
      data-testid={`roster-player-${row.playerId}`}
      onClick={onOpen}
      aria-label={`Open details for ${row.name}`}
      className="w-full min-w-0 min-h-16 rounded-lg bg-[#0f1330]/70 p-2.5 text-left hover:bg-[#161a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]"
    >
      <div className="flex min-w-0 items-start gap-2">
        <PositionBadge position={row.position} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-sm font-semibold text-[#f0f0ff]">{row.name}</span>
            <span className="shrink-0 text-[10px] text-[#6b6e99]">{row.team ?? 'Team unavailable'}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[#6b6e99]">
            <span>{row.isStarter ? 'Starter' : 'Bench'}</span>
            {row.starterSlot && row.starterSlot !== row.position && <span>{row.starterSlot}</span>}
            <span>{row.byeWeek == null ? 'Bye unavailable' : `Bye Wk ${row.byeWeek}`}</span>
            {status && <span className="font-semibold text-[#f59e0b]">{status}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div aria-label={projectionLabel(row, projectionState)} className="font-['Space_Mono'] text-xs tabular-nums text-[#a5b4fc]">
            {projectionState === 'loading'
              ? 'Loading…'
              : projectionState === 'error' || projectionState === 'unavailable'
                ? '— proj'
                : `${row.projection == null || row.projection === 0 ? '0' : row.projection.toFixed(1)} proj`}
          </div>
          <div className="mt-0.5 font-['Space_Mono'] text-[10px] tabular-nums text-[#10b981]" aria-label={value == null || !Number.isFinite(value) ? 'Max VORP value unavailable' : `Max VORP value ${formatWholeDollars(value)}`}>
            Max VORP value {formatWholeDollars(value)}
          </div>
          <div aria-label={acquisitionLabel(row)} className="mt-0.5 font-['Space_Mono'] text-[10px] tabular-nums text-[#f59e0b]">
            {row.acquisition.faab != null
              ? `Paid $${row.acquisition.faab}`
              : row.acquisition.kind === 'draft'
                ? 'Drafted'
                : row.acquisition.kind === 'trade'
                  ? 'Traded'
                  : row.acquisition.kind === 'free_agent'
                    ? 'Free agent'
                    : 'Acq —'}
          </div>
        </div>
      </div>
    </button>
  );
}

export function HubRosterCard({
  rows,
  week,
  optimized,
  values = new Map(),
  details = new Map(),
  projectionState = 'loaded',
}: {
  rows: HubRosterRow[];
  week: number | null;
  optimized: boolean;
  values?: ReadonlyMap<string, number | null>;
  details?: ReadonlyMap<string, PlayerDetailData>;
  projectionState?: PlayerProjectionState;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const starters = rows.filter((row) => row.isStarter);
  const bench = rows.filter((row) => !row.isStarter);
  const selected = selectedPlayerId ? details.get(selectedPlayerId) : undefined;
  const subtitle = optimized && week != null
    ? `Optimized for NFL Week ${week} · Sleeper projections`
    : 'Current Sleeper lineup · weekly projections unavailable';

  return (
    <>
      <Card hover={false} className="p-4 mb-6 min-w-0 overflow-hidden">
        <div className="mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99]">Full Roster</h2>
          <p className="mt-1 text-[10px] text-[#4a4d77]">{subtitle}</p>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-[#6b6e99]">Roster unavailable</p>
        ) : (
          <div className="space-y-4">
            <section aria-labelledby="hub-starters-heading">
              <h3 id="hub-starters-heading" className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#a5b4fc]">Starters</h3>
              <div className="space-y-1.5">{starters.map((row) => <RosterPlayerRow key={row.playerId} row={row} value={values.get(row.playerId) ?? null} projectionState={projectionState} onOpen={() => setSelectedPlayerId(row.playerId)} />)}</div>
            </section>
            <section aria-labelledby="hub-bench-heading">
              <h3 id="hub-bench-heading" className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6b6e99]">Bench</h3>
              <div className="space-y-1.5">{bench.map((row) => <RosterPlayerRow key={row.playerId} row={row} value={values.get(row.playerId) ?? null} projectionState={projectionState} onOpen={() => setSelectedPlayerId(row.playerId)} />)}</div>
            </section>
          </div>
        )}
      </Card>
      {selected && <PlayerDetailDialog open data={selected} onClose={() => setSelectedPlayerId(null)} />}
    </>
  );
}
