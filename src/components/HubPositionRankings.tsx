import type { ProjectedLineupGroup, ProjectedLineupGroupRank } from '../logic';
import { Card } from './ui';
import { ContextDisclosure } from './ContextDisclosure';

const GROUP_LABELS: Record<ProjectedLineupGroup, string> = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', FLEX: 'Flex', SUPER_FLEX: 'Super Flex', K: 'K', DEF: 'DEF',
};

function rankColor(rank: number, outOf: number): string {
  if (outOf <= 1) return '#a5b4fc';
  const percentile = (rank - 1) / (outOf - 1);
  if (percentile <= 0.25) return '#10b981';
  if (percentile >= 0.75) return '#f43f5e';
  return '#f59e0b';
}

export function HubPositionRankings({
  rows, week, isLoading = false, unavailableGroups = [], unavailableReason,
}: {
  rows: ProjectedLineupGroupRank[];
  week: number | null;
  isLoading?: boolean;
  unavailableGroups?: ProjectedLineupGroup[];
  unavailableReason?: string;
}) {
  const hasRows = rows.length > 0;
  return (
    <Card hover={false} className="p-4 mb-6">
      <section aria-labelledby="projected-position-rankings-heading">
        <h2 id="projected-position-rankings-heading" className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99]">
          Projected Lineup Strength
        </h2>
        {isLoading ? (
          <p className="text-xs text-[#6b6e99]" role="status">Loading projected position ranks…</p>
        ) : hasRows ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {rows.map((row) => {
              const label = GROUP_LABELS[row.group];
              const detail = `${label}${row.slotCount > 1 ? ` (${row.slotCount} lineup slots)` : ''}: ${row.points.toFixed(1)} projected points for ${week == null ? 'the upcoming NFL week' : `NFL Week ${week}`}; rank ${row.rank} of ${row.outOf} active teams`;
              return (
                <div key={row.group} className="min-w-0 rounded-lg border border-[#1a1e3a] bg-[#0a0d1a] px-3 py-2">
                  <ContextDisclosure
                    label={`Show ${label} projected lineup details`}
                    trigger={<span className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-[#a5b4fc]">{label}</span><span className="font-['Space_Mono'] text-xs font-bold tabular-nums" style={{ color: rankColor(row.rank, row.outOf) }}>{row.rank}/{row.outOf}</span></span>}
                  >
                    {detail}
                  </ContextDisclosure>
                </div>
              );
            })}
          </div>
        ) : (
          <div role="status">
            <p className="text-xs text-[#6b6e99]">Projected position rankings unavailable.</p>
            {unavailableReason && <p className="mt-1 text-[10px] text-[#4a4d77]">{unavailableReason}</p>}
            {unavailableGroups.length > 0 && <span className="sr-only">Unavailable groups: {unavailableGroups.map((group) => GROUP_LABELS[group]).join(', ')}</span>}
          </div>
        )}
      </section>
    </Card>
  );
}
