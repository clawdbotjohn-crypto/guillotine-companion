import { Card, PositionBadge } from './ui';
import type { HubRosterRow } from '../logic/hubRoster';

function playerStatusLabels(row: HubRosterRow): string[] {
  const labels = [row.injuryStatus];
  if (row.status && row.status.toLowerCase() !== 'active') labels.push(row.status);
  return [...new Set(labels.filter((label): label is string => !!label))];
}

function RosterPlayerRow({ row, week }: { row: HubRosterRow; week: number | null }) {
  const role = row.isStarter ? 'Starter' : 'Bench';
  const statusLabels = playerStatusLabels(row);

  return (
    <li
      className="grid grid-cols-[minmax(0,1fr)_4.25rem_3.25rem] items-center gap-2 border-t border-[#202445] px-3 py-2.5 first:border-t-0"
      data-testid={`roster-player-${row.playerId}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <PositionBadge position={row.position} className="shrink-0 px-1.5" />
          <span className="truncate text-[13px] font-medium text-[#f0f0ff]">{row.name}</span>
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px] uppercase tracking-wide text-[#6b6e99]">
          <span className={row.isStarter ? 'text-[#a5b4fc]' : 'text-[#4a4d77]'}>{role}</span>
          <span aria-hidden="true">·</span>
          <span>{row.team ?? 'Team unavailable'}</span>
          <span aria-hidden="true">·</span>
          <span>{row.byeWeek == null ? 'Bye unavailable' : `Bye W${row.byeWeek}`}</span>
          {statusLabels.map((label) => (
            <span
              key={label}
              className="rounded bg-[rgba(245,158,11,0.14)] px-1.5 py-0.5 font-semibold text-[#f59e0b]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="text-right font-['Space_Mono'] tabular-nums">
        <div className="text-[8px] uppercase tracking-wider text-[#4a4d77]">
          {week == null ? 'Proj' : `W${week} proj`}
        </div>
        <div
          className={`text-xs font-bold ${row.projection == null ? 'text-[#6b6e99]' : 'text-[#a5b4fc]'}`}
          aria-label={row.projection == null ? 'Projection unavailable' : `${row.projection.toFixed(1)} projected points`}
        >
          {row.projection == null ? '—' : row.projection.toFixed(1)}
        </div>
      </div>

      <div className="text-right font-['Space_Mono'] tabular-nums">
        <div className="text-[8px] uppercase tracking-wider text-[#4a4d77]">FAAB</div>
        <div
          className={`text-xs font-bold ${row.acquisition.faab == null ? 'text-[#4a4d77]' : 'text-[#f59e0b]'}`}
          aria-label={row.acquisition.faab == null
            ? 'Acquisition price unavailable'
            : `${row.acquisition.faab} dollars FAAB`}
        >
          {row.acquisition.faab == null ? '—' : `$${row.acquisition.faab}`}
        </div>
      </div>
    </li>
  );
}

export function HubRosterCard({
  rows,
  week,
  optimized,
}: {
  rows: HubRosterRow[];
  week: number | null;
  optimized: boolean;
}) {
  const starters = rows.filter((row) => row.isStarter);
  const bench = rows.filter((row) => !row.isStarter);

  return (
    <Card hover={false} className="mb-6 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#a5b4fc]">
            Full Roster
          </h2>
          <p className="mt-1 text-[9px] text-[#4a4d77]">
            {optimized && week != null
              ? `Optimized for NFL Week ${week} · Sleeper projections`
              : 'Current Sleeper lineup · weekly projections unavailable'}
          </p>
        </div>
        <span className="shrink-0 font-['Space_Mono'] text-[10px] text-[#6b6e99]">
          {rows.length} players
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-[#202445] px-4 py-5 text-center text-xs text-[#6b6e99]">
          Roster unavailable
        </p>
      ) : (
        <>
          <section aria-labelledby="hub-roster-starters">
            <div className="flex items-center justify-between border-y border-[#2a2e55] bg-[rgba(99,102,241,0.08)] px-3 py-1.5">
              <h3 id="hub-roster-starters" className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#a5b4fc]">
                Starters
              </h3>
              <span className="font-['Space_Mono'] text-[9px] text-[#6b6e99]">{starters.length}</span>
            </div>
            <ul>{starters.map((row) => <RosterPlayerRow key={row.playerId} row={row} week={week} />)}</ul>
          </section>

          <section aria-labelledby="hub-roster-bench">
            <div className="flex items-center justify-between border-y border-[#2a2e55] bg-[rgba(22,26,58,0.55)] px-3 py-1.5">
              <h3 id="hub-roster-bench" className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6b6e99]">
                Bench
              </h3>
              <span className="font-['Space_Mono'] text-[9px] text-[#4a4d77]">{bench.length}</span>
            </div>
            <ul>{bench.map((row) => <RosterPlayerRow key={row.playerId} row={row} week={week} />)}</ul>
          </section>
        </>
      )}
    </Card>
  );
}
