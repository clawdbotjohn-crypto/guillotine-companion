import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import {
  buildMaxVorpCalibration,
  buildVorpCalibration,
  calculatePlayerVorp,
  getValidRemainingTeamCounts,
  type StarterPositionCounts,
} from '../src/logic/waivers.ts';
import { getProjectionPoints, sumRestOfSeasonProjections, type ProjectionScoring } from '../src/logic/projections.ts';
import type { Matchup, Roster, SleeperUser, WeeklyProjectionMap } from '../src/api/types.ts';
import { computeEliminations } from '../src/logic/elimination.ts';

const LEAGUE_ID = process.env.LEAGUE_ID ?? '1312112493526536192';
const OUTPUT = process.argv[2] ?? 'docs/analysis/max-vorp-seamex-2026.md';
const API = 'https://api.sleeper.app/v1';

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

function countSlots(positions: string[], slot: string): number {
  return positions.filter((position) => position === slot).length;
}

function markdownTable(headers: string[], rows: Array<Array<string | number>>): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

async function main() {
  const started = performance.now();
  const [league, nflState, players] = await Promise.all([
    get<any>(`/league/${LEAGUE_ID}`),
    get<any>('/state/nfl'),
    get<Record<string, { position?: string; full_name?: string; first_name?: string; last_name?: string }>>('/players/nfl'),
  ]);
  const scoring: ProjectionScoring = league.scoring_settings?.rec === 1
    ? 'ppr'
    : league.scoring_settings?.rec === 0.5 ? 'half-ppr' : 'standard';
  const startWeek = Math.max(1, nflState.week, nflState.display_week + 1);
  const weeks = Array.from({ length: Math.max(0, 19 - startWeek) }, (_, index) => startWeek + index);
  const weeklyEntries = await Promise.all(weeks.map(async (week) => [
    week,
    await get<WeeklyProjectionMap>(`/projections/nfl/regular/${league.season}/${week}`),
  ] as const));
  const weekly = new Map(weeklyEntries);
  const projections = sumRestOfSeasonProjections(
    weekly,
    scoring,
    (playerId) => players[playerId]?.position,
  );
  // Remove rows that never have a usable selected-scoring projection. Explicit projected zeroes stay.
  for (const [playerId] of projections) {
    const hasSelectedProjection = weeklyEntries.some(([, rows]) => getProjectionPoints(rows[playerId], scoring) != null);
    if (!hasSelectedProjection) projections.delete(playerId);
  }

  const [rosters, users] = await Promise.all([
    get<Roster[]>(`/league/${LEAGUE_ID}/rosters`),
    get<SleeperUser[]>(`/league/${LEAGUE_ID}/users`),
  ]);
  const lastScoredWeek = Number(league.settings?.last_scored_leg ?? Math.max(0, nflState.week - 1));
  const matchupEntries = await Promise.all(
    Array.from({ length: Math.max(0, lastScoredWeek) }, (_, index) => index + 1)
      .map(async (week) => [week, await get<Matchup[]>(`/league/${LEAGUE_ID}/matchups/${week}`)] as const),
  );
  const eliminations = computeEliminations(new Map(matchupEntries), rosters, users);
  const teamsRemaining = Number(process.env.TEAMS_REMAINING ?? (eliminations.activeTeamCount || league.total_rosters));
  const slots: StarterPositionCounts = {
    QB: countSlots(league.roster_positions, 'QB'),
    RB: countSlots(league.roster_positions, 'RB'),
    WR: countSlots(league.roster_positions, 'WR'),
    TE: countSlots(league.roster_positions, 'TE'),
    FLEX: countSlots(league.roster_positions, 'FLEX') + countSlots(league.roster_positions, 'WRRB_FLEX') + countSlots(league.roster_positions, 'REC_FLEX'),
    SUPER_FLEX: countSlots(league.roster_positions, 'SUPER_FLEX') + countSlots(league.roster_positions, 'QB_FLEX'),
  };
  const budget = league.settings?.waiver_budget ?? 1000;

  const computeStarted = performance.now();
  const exact = buildMaxVorpCalibration(projections, slots, teamsRemaining, budget);
  const computeMs = performance.now() - computeStarted;
  if (!exact) throw new Error('Could not build a complete Max VORP calibration.');

  const endpointCounts = [exact.teamCounts[0], exact.teamCounts.at(-1)!];
  const endpointCalibrations = endpointCounts.map((teamCount) =>
    buildVorpCalibration(projections, slots, teamCount, budget)!);
  const positiveAtLargest = [...projections.values()].filter((player) => {
    const vorp = calculatePlayerVorp(player, exact.calibrations[0].replacementByPosition);
    return vorp != null && vorp > 0;
  });
  const analyzed = [...exact.playerValues.values()];
  const peakCounts = new Map<number, number>();
  const positionStats = new Map<string, { analyzed: number; interior: number; disagreements: number; delta: number }>();
  let interior = 0;
  let disagreements = 0;
  let totalDelta = 0;
  let maxDelta = 0;
  let maxDeltaPlayer = '';
  const playerResults: Array<[string, string, string, number, string, string]> = [];

  for (const value of analyzed) {
    peakCounts.set(value.teamCount, (peakCounts.get(value.teamCount) ?? 0) + 1);
    const player = projections.get(value.playerId)!;
    const stats = positionStats.get(player.position) ?? { analyzed: 0, interior: 0, disagreements: 0, delta: 0 };
    stats.analyzed += 1;
    const isInterior = !endpointCounts.includes(value.teamCount);
    if (isInterior) {
      interior += 1;
      stats.interior += 1;
    }
    const endpointRaw = Math.max(...endpointCalibrations.map((calibration) => {
      const vorp = calculatePlayerVorp(player, calibration.replacementByPosition) ?? 0;
      return vorp * calibration.dollarsPerVorp;
    }));
    const delta = Math.max(0, value.rawBid - endpointRaw);
    if (delta > 1e-9) {
      disagreements += 1;
      totalDelta += delta;
      stats.disagreements += 1;
      stats.delta += delta;
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaPlayer = value.playerId;
      }
    }
    positionStats.set(player.position, stats);
    const metadata = players[value.playerId];
    const name = metadata?.full_name || [metadata?.first_name, metadata?.last_name].filter(Boolean).join(' ') || value.playerId;
    playerResults.push([name, value.playerId, player.position, value.teamCount, `$${value.rawBid.toFixed(3)}`, `$${delta.toFixed(3)}`]);
  }

  const totalMs = performance.now() - started;
  const generatedAt = new Date().toISOString();
  const report = `# SeaMex 2026 Max VORP all-count analysis\n\n` +
    `Generated by \`npm run analyze:max-vorp\` at ${generatedAt}. League ID: \`${LEAGUE_ID}\`.\n\n` +
    `## Inputs and decision\n\n` +
    `- League: ${league.name}; ${league.total_rosters} initial teams; ${teamsRemaining} teams analyzed now; ${scoring}; $${budget} initial FAAB.\n` +
    `- ROS window: Weeks ${startWeek}–18 (${weeks.length} weeks); ${projections.size} players had selected-scoring projection data.\n` +
    `- Evaluated selectable team counts: ${getValidRemainingTeamCounts(teamsRemaining).join(', ')}. This includes every integer offered by the VoRP team-count selector, with a final-four lower bound.\n` +
    `- Exact metric: for each player and each stage, \`max(0, ROS points − positional replacement points) × ($${budget} / average final-four-team VORP)\`; choose the largest unrounded dollar result, then round once. Exact ties prefer the earlier/larger-team stage.\n` +
    `- **Decision: retain exact all-count evaluation.** ${disagreements} players differed from an endpoint-only approximation; ${interior} players peaked at an interior stage.\n\n` +
    `## Summary\n\n` +
    markdownTable(['Metric', 'Result'], [
      ['Players with positive Max VORP', analyzed.length],
      ['Players positive at largest stage', positiveAtLargest.length],
      ['Interior maxima', interior],
      ['Endpoint-only disagreements', disagreements],
      ['Mean positive endpoint delta', disagreements ? `$${(totalDelta / disagreements).toFixed(3)}` : '$0.000'],
      ['Largest endpoint delta', `$${maxDelta.toFixed(3)} (${maxDeltaPlayer || 'n/a'})`],
      ['Exact Max VORP compute', `${computeMs.toFixed(2)} ms`],
      ['Network + parse + compute runtime', `${totalMs.toFixed(2)} ms`],
    ]) + `\n\n## Maximizing team count\n\n` +
    markdownTable(['Teams', 'Players peaking'], [...peakCounts.entries()].sort((a, b) => b[0] - a[0])) +
    `\n\n## Positional patterns\n\n` +
    markdownTable(['Position', 'Positive players', 'Interior maxima', 'Endpoint disagreements', 'Mean delta when different'],
      [...positionStats.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([position, stats]) => [
        position,
        stats.analyzed,
        stats.interior,
        stats.disagreements,
        stats.disagreements ? `$${(stats.delta / stats.disagreements).toFixed(3)}` : '$0.000',
      ])) +
    `\n\n## Interior endpoint disagreements\n\n` +
    markdownTable(['Player', 'ID', 'Pos', 'Winning teams', 'Exact raw value', 'Gain over endpoints'],
      playerResults.filter((row) => row[5] !== '$0.000').sort((a, b) => Number(b[5].slice(1)) - Number(a[5].slice(1)))) +
    `\n\n## All positive players\n\n` +
    markdownTable(['Player', 'ID', 'Pos', 'Winning teams', 'Exact raw value', 'Gain over endpoints'],
      playerResults.sort((a, b) => Number(b[4].slice(1)) - Number(a[4].slice(1)))) +
    `\n\n## Runtime note\n\n` +
    `The production path memoizes the complete stage calibration and all player maxima by projection-map identity, lineup shape, budget, and survivor-stage sequence. The ${computeMs.toFixed(2)} ms measurement above is a cold exact computation; repeated reads reuse the same deterministic result object.\n`;

  await writeFile(OUTPUT, report);
  console.log(report);
}

await main();
