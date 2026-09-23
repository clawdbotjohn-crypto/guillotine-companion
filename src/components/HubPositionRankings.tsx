import type { ProjectedLineupGroup, ProjectedLineupGroupRank } from '../logic';
import { Card } from './ui';

const GROUP_LABELS: Record<ProjectedLineupGroup, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  FLEX: 'Flex',
  SUPER_FLEX: 'Super Flex',
  K: 'K',
  DEF: 'DEF',
};

function groupLabel(group: ProjectedLineupGroup, slotCount: number): string {
  const label = GROUP_LABELS[group];
  return slotCount > 1 ? `${label} ×${slotCount}` : label;
}

function rankColor(rank: number, outOf: number): string {
  if (outOf <= 1) return '#a5b4fc';
  const percentile = (rank - 1) / (outOf - 1);
  if (percentile <= 0.25) return '#10b981';
  if (percentile >= 0.75) return '#f43f5e';
  return '#f59e0b';
}

export function HubPositionRankings({
  rows,
  week,
  isLoading = false,
  unavailableGroups = [],
  unavailableReason,
}: {
  rows: ProjectedLineupGroupRank[];
  week: number | null;
  isLoading?: boolean;
  unavailableGroups?: ProjectedLineupGroup[];
  unavailableReason?: string;
}) {
  const hasRows = rows.length > 0;
  const omittedLabels = unavailableGroups.map((group) => GROUP_LABELS[group]).join(', ');

  return (
    <Card hover={false} className="p-4 mb-6">
      <section aria-labelledby="projected-position-rankings-heading">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2
              id="projected-position-rankings-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99]"
            >
              Projected Lineup Strength
            </h2>
            <p className="text-[10px] text-[#4a4d77] mt-1">
              {week == null ? 'NFL week unavailable' : `NFL Week ${week}`} · Sleeper
            </p>
          </div>
          {hasRows && (
            <span className="text-[9px] uppercase tracking-wider text-[#4a4d77] shrink-0">
              Active teams
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-[#6b6e99]" role="status">Loading projected position ranks…</p>
        ) : hasRows ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {rows.map((row) => {
                const label = groupLabel(row.group, row.slotCount);
                return (
                  <div
                    key={row.group}
                    className="min-w-0 rounded-lg border border-[#1a1e3a] bg-[#0a0d1a] px-3 py-2.5"
                    aria-label={`${label}: ${row.points.toFixed(1)} projected points for ${week == null ? 'the upcoming NFL week' : `NFL Week ${week}`}, rank ${row.rank} of ${row.outOf} active teams`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#a5b4fc]">
                        {label}
                      </span>
                      <span className="font-['Space_Mono'] text-[10px] tabular-nums text-[#6b6e99] shrink-0">
                        {row.points.toFixed(1)} pts
                      </span>
                    </div>
                    <div
                      className="mt-1 font-['Space_Mono'] text-xs font-bold tabular-nums"
                      style={{ color: rankColor(row.rank, row.outOf) }}
                    >
                      {row.rank}/{row.outOf}
                    </div>
                  </div>
                );
              })}
            </div>
            {unavailableGroups.length > 0 && (
              <p className="mt-2 text-[10px] text-[#6b6e99]">
                Complete weekly projections unavailable for: {omittedLabels}.
              </p>
            )}
          </>
        ) : (
          <div role="status">
            <p className="text-xs text-[#6b6e99]">Projected position rankings unavailable.</p>
            {unavailableReason && (
              <p className="mt-1 text-[10px] text-[#4a4d77]">{unavailableReason}</p>
            )}
          </div>
        )}
      </section>
    </Card>
  );
}
